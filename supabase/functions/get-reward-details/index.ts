// supabase/functions/get-reward-details/index.ts
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

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { response_id, reward_code } = await req.json()

    if (!response_id || !reward_code) {
      throw new Error("Missing response_id or reward_code in request body.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await supabaseAdmin
      .from('survey_responses')
      .select('reward_code, receipt, completed_at')
      .eq('id', response_id)
      .single()

    if (error || !data) {
      throw new Error('Survey response not found.')
    }

    if (!data.completed_at) {
      throw new Error('Survey not yet completed.')
    }

    if (data.reward_code !== reward_code) {
      throw new Error('Invalid reward code.')
    }

    return new Response(JSON.stringify({
      reward_code: data.reward_code,
      receipt: data.receipt,
    }), {
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
