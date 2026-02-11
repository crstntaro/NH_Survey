// supabase/functions/submit-survey/index.ts
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

// Cryptographically secure reward code generation
function generateSecureRewardCode(): string {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  const code = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `GZ${code}`;
}

// SECURITY: Validate receipt number format with strict rules
function isValidReceiptFormat(receipt: string): boolean {
  if (!receipt || typeof receipt !== 'string') return false;
  // SECURITY: Block null bytes
  if (receipt.includes('\0')) return false;
  const trimmed = receipt.trim();

  // SECURITY: Enforce length limits (min 5, max 50 characters)
  if (trimmed.length < 5 || trimmed.length > 50) return false;

  // SECURITY: Only allow alphanumeric characters and hyphens
  if (!/^[A-Za-z0-9\-]+$/.test(trimmed)) return false;

  // Valid prefixes: MDKA, MDKB, MDKC, MDKK, MDKM, MDKP, YSKA, YSKC, YSKO, YSKP, MRDR, MRDV, KZCF, KZNM
  const validPrefixes = ['MDKA', 'MDKB', 'MDKC', 'MDKK', 'MDKM', 'MDKP', 'YSKA', 'YSKC', 'YSKO', 'YSKP', 'MRDR', 'MRDV', 'KZCF', 'KZNM'];
  const prefix = trimmed.substring(0, 4).toUpperCase();
  return validPrefixes.includes(prefix);
}

// SECURITY: Whitelist of allowed payload fields to prevent injection attacks
const ALLOWED_PAYLOAD_FIELDS = [
  'q2', 'q3', 'q4', 'q5', 'q5_follow', 'q6', 'q6_follow',
  'q7', 'q7_follow', 'q8', 'q8_follow', 'q10', 'q10_follow',
  'q11', 'q11_follow', 'q12', 'q12_follow',
  'q13', 'q14', 'q15', 'q16', 'q17', 'q18',
  'name', 'email', 'phone', 'dpa', 'promo', 'receipt',
  'brand', 'branch'
];

// Fields that accept array values (e.g., q17 = list of restaurants visited)
const ARRAY_FIELDS = ['q17'];

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const field of ALLOWED_PAYLOAD_FIELDS) {
    if (field in payload && payload[field] !== undefined) {
      const value = payload[field];
      // SECURITY: Handle array fields (e.g., q17 = list of restaurants)
      if (ARRAY_FIELDS.includes(field) && Array.isArray(value)) {
        const safeArray = value
          .filter((item): item is string => typeof item === 'string' && !item.includes('\0'))
          .map(item => item.slice(0, 200)) // Max 200 chars per array item
          .slice(0, 20); // Max 20 items
        if (safeArray.length > 0) sanitized[field] = safeArray;
        continue;
      }
      // SECURITY: Sanitize string values
      if (typeof value === 'string') {
        // Block null bytes and limit length
        if (value.includes('\0')) continue;
        sanitized[field] = value.slice(0, 1000); // Max 1000 chars per field
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[field] = value;
      }
    }
  }
  return sanitized;
}

// SECURITY: Simple rate limiting for public endpoints
const rateLimitMap = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5; // 5 submissions per minute per IP
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

    // SECURITY: Sanitize payload to only allow whitelisted fields
    const safePayload = sanitizePayload(payload);

    // 3. Get receipt from payload or existing response
    const receiptNumber = safePayload.receipt || response.receipt;

    // 4. Check if this receipt already has a reward code (CRITICAL: enforce one reward per receipt)
    if (receiptNumber && isValidReceiptFormat(receiptNumber as string)) {
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
      ...safePayload,
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
    // Log the full error to the function logs (server-side only)
    console.error('Caught Error:', error);
    // SECURITY: Return generic error message to client to prevent information disclosure
    return new Response(JSON.stringify({ error: 'An error occurred while processing your request.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
