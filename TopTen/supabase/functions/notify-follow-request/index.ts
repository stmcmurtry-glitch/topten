import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const payload = await req.json();
    // Supabase Webhook payload shape: { type, table, schema, record, old_record }
    const record = payload.record ?? payload;

    const { follower_id, following_id, status } = record;
    if (status !== 'pending') return new Response('skipped', { status: 200 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const [followerRes, targetRes] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('nickname, username')
        .eq('id', follower_id)
        .single(),
      supabase
        .from('user_profiles')
        .select('push_token')
        .eq('id', following_id)
        .single(),
    ]);

    const pushToken = targetRes.data?.push_token;
    if (!pushToken) return new Response('no token', { status: 200 });

    const follower = followerRes.data;
    const followerName =
      follower?.nickname ??
      (follower?.username ? `@${follower.username}` : 'Someone');

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title: 'New follow request',
        body: `${followerName} wants to follow you`,
        sound: 'default',
        data: { type: 'follow_request', followerId: follower_id },
      }),
    });

    return new Response('sent', { status: 200 });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
