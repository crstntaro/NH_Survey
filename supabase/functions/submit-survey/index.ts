// supabase/functions/submit-survey/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Get allowed origins from environment or use default
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || 'https://nipponhasha.ph,https://www.nipponhasha.ph,https://tarotaro-nh.github.io,https://crstntaro.github.io,http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500,http://localhost:8080').split(',');

function getCorsHeaders(origin: string | null) {
  // Allow null origin for file:// protocol
  if (!origin || origin === 'null') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Credentials': 'true',
    };
  }
  // Allow any localhost or github.io origin for development
  const isAllowed = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('github.io');
  const allowedOrigin = isAllowed ? origin : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
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

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { response_id, payload } = await req.json()

    if (!response_id || !payload) {
      throw new Error("Missing response_id or payload in request body.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch the survey response to check its status
    const { data: response, error: fetchError } = await supabaseAdmin
      .from('survey_responses')
      .select('reward_code, completed_at, receipt')
      .eq('id', response_id)
      .single()

    if (fetchError || !response) {
      throw new Error(`Invalid survey response: ${response_id}`)
    }

    // 2. If survey is already complete, just return the existing reward code
    if (response.completed_at && response.reward_code) {
      return new Response(JSON.stringify({ reward_code: response.reward_code }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 3. Get receipt from payload or existing response
    const receiptNumber = payload.receipt || response.receipt;

    // 4. Check if this receipt already has a reward code (CRITICAL: enforce one reward per receipt)
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

    // 5. Prepare the final payload and generate reward code
    const newRewardCode = generateSecureRewardCode();
    const finalPayload = {
      ...payload,
      completed_at: new Date().toISOString(),
      reward_code: newRewardCode,
      reward_generated_at: new Date().toISOString(),
    };

    // 6. Perform a single update to save answers and reward info
    const { data: updatedResponse, error: updateError } = await supabaseAdmin
      .from('survey_responses')
      .update(finalPayload)
      .eq('id', response_id)
      .select('reward_code')
      .single()

    if (updateError || !updatedResponse) {
      console.error('Update Error:', updateError);

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

      throw new Error("Could not save survey and generate reward.");
    }

    // 7. Return the new reward code
    return new Response(JSON.stringify({ reward_code: updatedResponse.reward_code }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // Log the full error to the function logs
    console.error('Caught Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
