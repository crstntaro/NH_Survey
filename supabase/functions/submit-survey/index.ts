// supabase/functions/submit-survey/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Get allowed origins from environment or use default
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || 'https://nipponhasha.ph,https://www.nipponhasha.ph').split(',');

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
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
      .select('reward_code, completed_at')
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

    // 3. Prepare the final payload and generate reward code
    const newRewardCode = generateSecureRewardCode();
    const finalPayload = {
      ...payload,
      completed_at: new Date().toISOString(),
      reward_code: newRewardCode,
      reward_generated_at: new Date().toISOString(),
    };

    // 4. Perform a single update to save answers and reward info
    const { data: updatedResponse, error: updateError } = await supabaseAdmin
      .from('survey_responses')
      .update(finalPayload)
      .eq('id', response_id)
      .select('reward_code')
      .single()

    if (updateError || !updatedResponse) {
      console.error('Update Error:', updateError);
      throw new Error("Could not save survey and generate reward.");
    }

    // 5. Return the new reward code
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