create table private.burt_rollout_credentials (
  user_id uuid primary key references public.staff(user_id),
  secret_id uuid not null references vault.secrets(id),
  issued_at timestamptz not null default now(),
  claimed_at timestamptz
);
alter table private.burt_rollout_credentials enable row level security;
revoke all on private.burt_rollout_credentials from public, anon, authenticated;

create function public.burt_claim_rollout_password(teacher_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare secret_key uuid; temporary_password text; password_hash text;
begin
  perform private.burt_require_admin();
  select c.secret_id, u.encrypted_password into secret_key, password_hash
    from private.burt_rollout_credentials c
    join public.staff s on s.user_id=c.user_id
    join auth.users u on u.id=s.user_id
    where c.user_id=teacher_id and c.claimed_at is null
      and s.role='teacher' and s.enabled and s.password_change_required
    for update of c;
  if not found then
    raise exception 'No unclaimed rollout password. Use Reset password to issue a new one.';
  end if;
  select decrypted_secret into temporary_password from vault.decrypted_secrets where id=secret_key;
  if temporary_password is null or extensions.crypt(temporary_password,password_hash) is distinct from password_hash then
    raise exception 'The rollout password has been replaced. Use the latest password or reset it again.';
  end if;
  perform vault.update_secret(secret_key, encode(extensions.gen_random_bytes(32),'hex'));
  update private.burt_rollout_credentials set claimed_at=now() where user_id=teacher_id;
  return temporary_password;
end $$;
revoke all on function public.burt_claim_rollout_password(uuid) from public, anon;
grant execute on function public.burt_claim_rollout_password(uuid) to authenticated;