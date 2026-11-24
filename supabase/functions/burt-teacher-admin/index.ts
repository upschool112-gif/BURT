import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const origin = 'https://upschool112-gif.github.io';
const headers = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};
const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });
const projectUrl = Deno.env.get('SUPABASE_URL')!;
const serverKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const clientKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const options = { persistSession: false, autoRefreshToken: false };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply(405, { error: 'Method unavailable.' });

  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return reply(401, { error: 'Sign in again.' });
  const caller = createClient(projectUrl, clientKey, { auth: options, global: { headers: { Authorization: authorization } } });
  const { data: identity, error: identityError } = await caller.auth.getUser(authorization.slice(7));
  if (identityError || !identity.user) return reply(401, { error: 'Sign in again.' });
  const { data: teachers, error: denied } = await caller.rpc('burt_teacher_accounts');
  if (denied) return reply(403, { error: 'BURT administrator access required.' });

  try {
    const { action, email, teacherId } = await request.json();
    const admin = createClient(projectUrl, serverKey, { auth: options }).auth.admin;
    const temporaryPassword = crypto.randomUUID() + '!Aa9';
    if (action === 'create') {
      if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return reply(400, { error: 'Enter a valid teacher email.' });
      }
      const { error } = await admin.createUser({
        email: email.toLowerCase(),
        password: temporaryPassword,
        email_confirm: true,
        app_metadata: { burt_provisioned_teacher: true },
      });
      if (error) return reply(409, { error: 'Teacher account could not be created. Check whether the email is already registered.' });
    } else if (action === 'reset') {
      if (!teachers.some((teacher: { user_id: string }) => teacher.user_id === teacherId)) {
        return reply(404, { error: 'Teacher account not found.' });
      }
      const { data: target, error: lookupError } = await admin.getUserById(teacherId);
      if (lookupError || !target.user) return reply(404, { error: 'Teacher account not found.' });
      const { error } = await admin.updateUserById(teacherId, {
        password: temporaryPassword,
        app_metadata: { ...target.user.app_metadata, burt_reset: crypto.randomUUID() },
      });
      if (error) return reply(409, { error: 'Password reset could not be completed.' });
    } else {
      return reply(400, { error: 'Unknown account action.' });
    }
    return reply(200, { temporaryPassword });
  } catch {
    return reply(400, { error: 'Account request could not be processed.' });
  }
});
