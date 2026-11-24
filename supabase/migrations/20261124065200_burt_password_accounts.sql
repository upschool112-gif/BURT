alter table public.class_access add column assigned boolean not null default true;

alter table public.staff add column password_change_required boolean not null default true,
  add column enabled boolean not null default true,
  add column password_changed_at timestamptz;

insert into public.staff(user_id, role)
select id, 'admin' from auth.users where lower(email) = 'joshua.aguinaldo.upsteacher@gmail.com'
on conflict (user_id) do update set role = 'admin', password_change_required = true;

create function private.burt_password_session() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.sessions ss join auth.users u on u.id = ss.user_id
    where ss.user_id = auth.uid() and ss.id::text = auth.jwt()->>'session_id'
      and u.email_confirmed_at is not null
      and (auth.jwt()->'amr') @> '[{"method":"password"}]'::jsonb
  )
$$;
revoke all on function private.burt_password_session() from public;
grant execute on function private.burt_password_session() to authenticated;

create function private.burt_access_ready() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.burt_password_session() and exists (
    select 1 from public.staff s join auth.sessions ss on ss.user_id = s.user_id
    where s.user_id = auth.uid() and s.enabled and not s.password_change_required
      and ss.id::text = auth.jwt()->>'session_id' and ss.created_at > s.password_changed_at
  )
$$;
revoke all on function private.burt_access_ready() from public;
grant execute on function private.burt_access_ready() to authenticated;

do $$
declare name text;
begin
  foreach name in array array['academic_years','assessments','burt_conversion','class_access',
    'classes','enrollments','final_overrides','grade_coverage','interventions','students']
  loop
    execute format('create policy burt_password_gate on public.%I as restrictive
      for all to authenticated using ((select private.burt_access_ready()))
      with check ((select private.burt_access_ready()))', name);
  end loop;
end
$$;

create policy burt_only_assigned_classes on public.class_access as restrictive
  for select to authenticated using (assigned);

revoke execute on function public.claim_attendance_access() from public, anon, authenticated;

create function private.burt_track_password() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.raw_app_meta_data->>'burt_provisioned_teacher' = 'true' then
      insert into public.staff(user_id, role) values (new.id, 'teacher');
    end if;
  elsif new.raw_app_meta_data->>'burt_reset' is distinct from old.raw_app_meta_data->>'burt_reset' then
    update public.staff set password_change_required = true where user_id = new.id;
  elsif new.encrypted_password is distinct from old.encrypted_password
    and coalesce(new.encrypted_password,'') <> '' and new.email_confirmed_at is not null then
    update public.staff set password_change_required = false, password_changed_at = clock_timestamp() where user_id = new.id;
  end if;
  return new;
end
$$;
revoke all on function private.burt_track_password() from public;
create trigger burt_track_password after insert or update of encrypted_password, raw_app_meta_data on auth.users
for each row execute function private.burt_track_password();

create function private.burt_require_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.burt_access_ready()
    or not exists (select 1 from public.staff where user_id = auth.uid() and role = 'admin') then
    raise exception 'BURT administrator access required' using errcode = '42501';
  end if;
end
$$;
revoke all on function private.burt_require_admin() from public;

create function public.burt_teacher_accounts()
returns table(user_id uuid, email text, enabled boolean, password_change_required boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.burt_require_admin();
  return query select s.user_id, u.email::text, s.enabled, s.password_change_required
    from public.staff s join auth.users u on u.id = s.user_id where s.role = 'teacher' order by u.email;
end
$$;

create function public.burt_teacher_classes(teacher_id uuid, school_year uuid, replacement uuid[] default null)
returns setof uuid
language plpgsql security definer set search_path = '' as $$
begin
  perform private.burt_require_admin();
  perform 1 from public.staff where user_id = teacher_id and role = 'teacher' for update;
  if not found then raise exception 'Teacher account not found'; end if;
  if not exists (select 1 from public.academic_years where id = school_year) then
    raise exception 'Academic year not found';
  end if;
  if replacement is not null then
    if exists (select 1 from unnest(replacement) as wanted(id)
      where not exists (select 1 from public.classes c where c.id = wanted.id
        and c.is_active and c.class_code <> 'TEST-G8-2026')) then
      raise exception 'Select valid active classes';
    end if;
    update public.class_access set assigned = class_id = any(replacement)
      where user_id = teacher_id and academic_year_id = school_year;
    insert into public.class_access(user_id, academic_year_id, class_id, assigned)
      select distinct teacher_id, school_year, unnest(replacement), true
      on conflict (user_id, class_id, academic_year_id) do update set assigned = true;
  end if;
  return query select ca.class_id from public.class_access ca
    where ca.user_id = teacher_id and ca.academic_year_id = school_year and ca.assigned;
end
$$;

create function public.burt_set_teacher_enabled(teacher_id uuid, allow_access boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.burt_require_admin();
  update public.staff set enabled = allow_access,
    password_changed_at = case when enabled is distinct from allow_access and not password_change_required
      then clock_timestamp() else password_changed_at end
    where user_id = teacher_id and role = 'teacher';
  if not found then raise exception 'Teacher account not found'; end if;
end
$$;

revoke all on function public.burt_teacher_accounts(), public.burt_teacher_classes(uuid,uuid,uuid[]),
  public.burt_set_teacher_enabled(uuid,boolean) from public, anon;
grant execute on function public.burt_teacher_accounts(), public.burt_teacher_classes(uuid,uuid,uuid[]),
  public.burt_set_teacher_enabled(uuid,boolean) to authenticated;
