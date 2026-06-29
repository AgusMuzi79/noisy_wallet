import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Invoked by a pg_cron job on the 1st of each month at 00:05 ART (03:05 UTC)
// Also called defensively from the mobile app on first open each day.
Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  // Idempotent: skip if already credited this month
  const { data: existing } = await supabase
    .from('monthly_credits')
    .select('id')
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ skipped: true, reason: 'already_credited' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Sum all active recurring sources
  const { data: sources, error: sourcesError } = await supabase
    .from('recurring_sources')
    .select('id, name, amount')
    .eq('active', true);

  if (sourcesError) throw sourcesError;
  if (!sources || sources.length === 0) {
    return new Response(JSON.stringify({ skipped: true, reason: 'no_active_sources' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const totalAmount = sources.reduce((sum, s) => sum + Number(s.amount), 0);
  const creditDate = `${year}-${String(month).padStart(2, '0')}-01`;

  // Insert one transaction per source for traceability
  const transactions = sources.map((s) => ({
    type: 'recurring_credit',
    amount: s.amount,
    note: s.name,
    date: creditDate,
    recurring_source_id: s.id,
    author: null,
  }));

  const { error: txError } = await supabase.from('transactions').insert(transactions);
  if (txError) throw txError;

  // Record this month as credited
  const { error: logError } = await supabase
    .from('monthly_credits')
    .insert({ year, month, total_amount: totalAmount });
  if (logError) throw logError;

  return new Response(
    JSON.stringify({ credited: true, year, month, total_amount: totalAmount, sources: sources.length }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
