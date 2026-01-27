// supabase/functions/generate-reward/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Get allowed origins from environment or use default (includes localhost for dev)
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || 'https://nipponhasha.ph,https://www.nipponhasha.ph,http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500,http://localhost:8080').split(',');

function getCorsHeaders(origin: string | null) {
  // Allow any localhost origin for development
  const isLocalhost = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));
  const allowedOrigin = isLocalhost ? origin : (origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Cryptographically secure reward code generation
function generateSecureRewardCode(): string {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  const code = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `GZ${code}`;
}

// Validate receipt number format (should start with valid prefix)
function isValidReceiptFormat(receipt: string): boolean {
  if (!receipt || typeof receipt !== 'string') return false;
  const trimmed = receipt.trim();
  if (trimmed.length < 5) return false;

  // Valid prefixes: MDKA, MDKB, MDKC, MDKK, MDKM, MDKP, YSKA, YSKC, YSKO, YSKP, MRDR, MRDV, KZCF, KZNM
  const validPrefixes = ['MDKA', 'MDKB', 'MDKC', 'MDKK', 'MDKM', 'MDKP', 'YSKA', 'YSKC', 'YSKO', 'YSKP', 'MRDR', 'MRDV', 'KZCF', 'KZNM'];
  const prefix = trimmed.substring(0, 4).toUpperCase();
  return validPrefixes.includes(prefix);
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { response_id } = await req.json()

    if (!response_id) {
      throw new Error("Missing response_id in request body")
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch the survey response
    const { data: response, error: fetchError } = await supabaseAdmin
      .from('survey_responses')
      .select('reward_code, receipt')
      .eq('id', response_id)
      .single()

    if (fetchError || !response) {
      throw new Error("Invalid survey response.")
    }

    // 2. If reward already generated, just return it
    if (response.reward_code) {
      return new Response(JSON.stringify({ reward_code: response.reward_code }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 3. Check if this receipt already has a reward code (CRITICAL: enforce one reward per receipt)
    const receiptNumber = response.receipt;
    if (receiptNumber && isValidReceiptFormat(receiptNumber)) {
      const { data: existingReward, error: checkError } = await supabaseAdmin
        .from('survey_responses')
        .select('id, reward_code, completed_at')
        .eq('receipt', receiptNumber)
        .not('reward_code', 'is', null)
        .not('completed_at', 'is', null)
        .neq('id', response_id)
        .limit(1)
        .single()

      if (!checkError && existingReward && existingReward.reward_code) {
        // Receipt already has a reward - return error
        console.log(`Receipt ${receiptNumber} already has reward: ${existingReward.reward_code}`);
        return new Response(JSON.stringify({
          error: 'This receipt has already been used to claim a reward.',
          existing_reward: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
    }

    // 4. Generate a new unique reward code
    const newRewardCode = generateSecureRewardCode();

    // 5. Update the record with the new reward code and mark as completed
    const { data: updatedResponse, error: updateError } = await supabaseAdmin
      .from('survey_responses')
      .update({
        reward_code: newRewardCode,
        reward_generated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', response_id)
      .select('reward_code')
      .single()

    if (updateError || !updatedResponse) {
      // Check if it's a unique constraint violation (receipt already used)
      if (updateError?.code === '23505') {
        return new Response(JSON.stringify({
          error: 'This receipt has already been used to claim a reward.',
          existing_reward: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
      throw new Error("Could not generate and save reward code.")
    }

    // 6. Return the new reward code
    return new Response(JSON.stringify({ reward_code: updatedResponse.reward_code }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
