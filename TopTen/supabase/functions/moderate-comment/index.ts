import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

serve(async (req) => {
  try {
    const { body } = await req.json();
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 64,
        system: `You moderate comments on TopX, a social app for top-10 lists.
Respond ONLY with JSON: {"allowed":true} or {"allowed":false,"reason":"brief reason"}.
Block: hate speech/slurs, threats, explicit sexual content, spam/links, severe harassment, doxxing.
Allow: opinions, mild language, debate, humor, sarcasm, disagreement.`,
        messages: [{ role: 'user', content: `Comment: "${body}"` }],
      }),
    });
    const data = await res.json();
    const text = (data.content?.[0]?.text ?? '{"allowed":true}').trim();
    return new Response(text, { headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response('{"allowed":true}', { headers: { 'Content-Type': 'application/json' } });
  }
});
