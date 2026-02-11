// supabase/functions/get-reward-details/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// SECURITY: Constant-time string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  let result = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    const charA = i < a.length ? a.charCodeAt(i) : 0;
    const charB = i < b.length ? b.charCodeAt(i) : 0;
    result |= charA ^ charB;
  }
  return result === 0;
}

const ALLOWED_ORIGINS: string[] = [
  'https://nipponhasha.ph',
  'https://www.nipponhasha.ph',
  'https://tarotaro-nh.github.io',
  'https://crstntaro.github.io',
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Rate limiting for public endpoint
const rateLimitMap = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute per IP
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean up every 5 minutes
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
  if (record.count >= MAX_REQUESTS) return false;
  record.count++;
  return true;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 429,
    });
  }

  try {
    const { response_id, reward_code } = await req.json()

    if (!response_id || !reward_code) {
      throw new Error("Missing response_id or reward_code in request body.")
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(response_id)) {
      throw new Error("Invalid response_id format.")
    }

    // Validate reward code format
    const rewardCodeRegex = /^GZ[0-9A-F]{12}$/i;
    if (!rewardCodeRegex.test(reward_code)) {
      throw new Error("Invalid reward code format.")
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

    // SECURITY: Use constant-time comparison to prevent timing attacks
    if (!data.reward_code || !timingSafeEqual(data.reward_code.toUpperCase(), reward_code.toUpperCase())) {
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
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Invalid request or reward code.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
