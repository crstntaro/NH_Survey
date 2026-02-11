// supabase/functions/init-survey/index.ts
// Creates a new survey response record and returns the response_id
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Strict allowed origins list - EXACT MATCH ONLY
const ALLOWED_ORIGINS: string[] = [
  'https://nipponhasha.ph',
  'https://www.nipponhasha.ph',
  'https://tarotaro-nh.github.io',
  'https://crstntaro.github.io',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  // SECURITY: Only allow exact origin matches
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// SECURITY: Simple rate limiting for public endpoints
const rateLimitMap = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute per IP
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Periodic cleanup of expired entries to prevent memory leak
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    for (const [key, value] of rateLimitMap) {
      if (now - value.timestamp > RATE_LIMIT_WINDOW) rateLimitMap.delete(key);
    }
    lastCleanup = now;
  }

  const record = rateLimitMap.get(ip);

  if (!record || now - record.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (record.count >= MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // SECURITY: Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 429,
    });
  }

  try {
    const { receipt, brand, branch } = await req.json()

    if (!receipt) {
      throw new Error("Receipt number is required")
    }

    // Validate receipt format (must start with valid 4-char prefix)
    const trimmedReceipt = receipt.trim();
    if (trimmedReceipt.length < 5 || trimmedReceipt.length > 50) {
      throw new Error("Invalid receipt number format")
    }
    if (!/^[A-Za-z0-9\-]+$/.test(trimmedReceipt)) {
      throw new Error("Invalid receipt number format")
    }
    // Validate receipt prefix matches a known store code
    const validPrefixes = ['MDKA', 'MDKB', 'MDKC', 'MDKK', 'MDKM', 'MDKP', 'YSKA', 'YSKC', 'YSKO', 'YSKP', 'MRDR', 'MRDV', 'KZCF', 'KZNM'];
    const receiptPrefix = trimmedReceipt.substring(0, 4).toUpperCase();
    if (!validPrefixes.includes(receiptPrefix)) {
      throw new Error("Invalid receipt number prefix")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if this receipt already has a completed survey with a reward
    const { data: existingResponse, error: checkError } = await supabaseAdmin
      .from('survey_responses')
      .select('id, reward_code, completed_at')
      .eq('receipt', trimmedReceipt)
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
      .eq('receipt', trimmedReceipt)
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

    // Validate brand if provided
    const validBrands = ['Mendokoro', 'Ramen Yushoken', 'Marudori', 'Kazunori', 'Kazu Café'];
    const safeBrand = brand && validBrands.includes(brand) ? brand : null;
    // Sanitize branch (alphanumeric, spaces, hyphens, max 100 chars)
    const safeBranch = branch && typeof branch === 'string' ? branch.replace(/[^\w\s\-]/g, '').slice(0, 100) : null;

    // Create a new survey response
    const placeholderEmail = `survey_${trimmedReceipt}_${Date.now()}@placeholder.local`;

    const { data: newResponse, error: insertError } = await supabaseAdmin
      .from('survey_responses')
      .insert({
        receipt: trimmedReceipt,
        brand: safeBrand,
        branch: safeBranch,
        email: placeholderEmail,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError || !newResponse) {
      // Handle race condition: if another request just created this receipt, try resuming
      if (insertError?.code === '23505') {
        const { data: raceResponse } = await supabaseAdmin
          .from('survey_responses')
          .select('id')
          .eq('receipt', trimmedReceipt)
          .is('completed_at', null)
          .limit(1)
          .maybeSingle()
        if (raceResponse) {
          return new Response(JSON.stringify({
            response_id: raceResponse.id,
            resumed: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          })
        }
      }
      console.error('Insert Error:', insertError);
      throw new Error(`Could not create survey response: ${insertError?.message || 'Unknown error'}`)
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
    // SECURITY: Return generic error to prevent information disclosure
    return new Response(JSON.stringify({ error: 'An error occurred while processing your request.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
