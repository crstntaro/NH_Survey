// supabase/functions/generate-reward/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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
      .select('reward_code')
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

    // 3. Generate a new unique reward code
    const newRewardCode = `GZ${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

    // 4. Update the record with the new reward code and mark as completed
    const { data: updatedResponse, error: updateError } = await supabaseAdmin
      .from('survey_responses')
      .update({
        reward_code: newRewardCode,
        reward_generated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(), // Set completed_at here
      })
      .eq('id', response_id)
      .select('reward_code')
      .single()

    if (updateError || !updatedResponse) {
      throw new Error("Could not generate and save reward code.")
    }

    // 5. Return the new reward code
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