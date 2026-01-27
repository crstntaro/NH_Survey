// supabase/functions/init-survey/index.ts
// Creates a new survey response record and returns the response_id
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Get allowed origins from environment or use default (includes localhost for dev)
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || 'https://nipponhasha.ph,https://www.nipponhasha.ph,http://localhost:3000,http://localhost:5500,http://127.0.0.1:3000,http://127.0.0.1:5500,http://localhost:8080,http://127.0.0.1:8080').split(',');

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

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { receipt, brand, branch } = await req.json()

    if (!receipt) {
      throw new Error("Receipt number is required")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if this receipt already has a completed survey with a reward
    const { data: existingResponse, error: checkError } = await supabaseAdmin
      .from('survey_responses')
      .select('id, reward_code, completed_at')
      .eq('receipt', receipt)
      .not('reward_code', 'is', null)
      .not('completed_at', 'is', null)
      .limit(1)
      .maybeSingle()

    if (existingResponse && existingResponse.reward_code) {
      // Receipt already has a reward - return error
      return new Response(JSON.stringify({
        error: 'This receipt has already been used to claim a reward.',
        existing_reward: true,
        response_id: existingResponse.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Check if there's an incomplete survey for this receipt (resume it)
    const { data: incompleteResponse } = await supabaseAdmin
      .from('survey_responses')
      .select('id')
      .eq('receipt', receipt)
      .is('completed_at', null)
      .limit(1)
      .maybeSingle()

    if (incompleteResponse) {
      // Return existing incomplete response to resume
      return new Response(JSON.stringify({
        response_id: incompleteResponse.id,
        resumed: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Create a new survey response
    const { data: newResponse, error: insertError } = await supabaseAdmin
      .from('survey_responses')
      .insert({
        receipt: receipt,
        brand: brand || null,
        branch: branch || null,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError || !newResponse) {
      console.error('Insert Error:', insertError);
      throw new Error("Could not create survey response")
    }

    return new Response(JSON.stringify({
      response_id: newResponse.id,
      created: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
