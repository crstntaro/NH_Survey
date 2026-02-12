import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import 'https://deno.land/std@0.177.0/dotenv/load.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('ADMIN_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Receipt prefix → brand + branch mapping
const STORE_MAP: Record<string, { brand: string; branch: string }> = {
  MDKA: { brand: 'Mendokoro', branch: 'Molito (Alabang)' },
  MDKB: { brand: 'Mendokoro', branch: 'Bonifacio Global City' },
  MDKC: { brand: 'Mendokoro', branch: 'Cebu' },
  MDKK: { brand: 'Mendokoro', branch: 'Katipunan' },
  MDKM: { brand: 'Mendokoro', branch: 'Salcedo Village (Makati)' },
  MDKP: { brand: 'Mendokoro', branch: 'Pasay' },
  YSKA: { brand: 'Ramen Yushoken', branch: 'Molito (Alabang)' },
  YSKC: { brand: 'Ramen Yushoken', branch: 'Cebu' },
  YSKO: { brand: 'Ramen Yushoken', branch: 'Ortigas' },
  YSKP: { brand: 'Ramen Yushoken', branch: 'Pasay' },
  MRDR: { brand: 'Marudori', branch: 'Rockwell' },
  MRDV: { brand: 'Marudori', branch: 'Vertis North' },
  KZCF: { brand: 'Kazu Café', branch: 'Makati' },
  KZNM: { brand: 'Kazunori', branch: 'Makati' },
};

async function backfill() {
  // Fetch all responses missing brand or branch
  const { data, error } = await supabase
    .from('survey_responses')
    .select('id, receipt, brand, branch')
    .or('brand.is.null,branch.is.null')
    .not('receipt', 'is', null);

  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  console.log(`Found ${data.length} responses with missing brand/branch`);

  let updated = 0;
  let skipped = 0;

  for (const row of data) {
    const prefix = (row.receipt || '').substring(0, 4).toUpperCase();
    const mapping = STORE_MAP[prefix];

    if (!mapping) {
      console.warn(`  Skip id=${row.id}: unknown prefix "${prefix}" from receipt "${row.receipt}"`);
      skipped++;
      continue;
    }

    const updates: Record<string, string> = {};
    if (!row.brand) updates.brand = mapping.brand;
    if (!row.branch) updates.branch = mapping.branch;

    if (Object.keys(updates).length === 0) continue;

    const { error: updateErr } = await supabase
      .from('survey_responses')
      .update(updates)
      .eq('id', row.id);

    if (updateErr) {
      console.error(`  Error updating id=${row.id}:`, updateErr);
    } else {
      console.log(`  Updated id=${row.id}: ${prefix} → ${updates.brand || row.brand} / ${updates.branch || row.branch}`);
      updated++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
}

backfill();
