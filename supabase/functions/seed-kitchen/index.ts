// seed-kitchen is retired (17 Oct 2026, Lachlan's msg 1498: no API spend).
// The old pipeline (v8) called the Anthropic API; its deployed source is kept
// at supabase/functions/seed-kitchen-v8-retired/. This stub calls nothing.
Deno.serve(() =>
  new Response(JSON.stringify({ retired: true, message: "seed-kitchen is retired; no AI calls are made." }), {
    status: 410,
    headers: { "content-type": "application/json" },
  }),
);
