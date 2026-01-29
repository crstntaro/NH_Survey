// Import necessary libraries
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.0/mod.ts';

// Strict allowed origins list - EXACT MATCH ONLY (no wildcards or substring matching)
const ALLOWED_ORIGINS: string[] = [
  'https://nipponhasha.ph',
  'https://www.nipponhasha.ph',
  'https://tarotaro-nh.github.io',
  'https://crstntaro.github.io',
  // Development origins (remove in production)
  'http://localhost:3000',
  'http://localhost:5500',
  'http://localhost:8080',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  // SECURITY: Only allow exact origin matches - no wildcards or substring matching
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);

  // If origin not in whitelist, use first production origin (requests will fail CORS)
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// In-memory store for rate limiting (simple implementation)
const loginAttempts = new Map<string, { count: number, timestamp: number }>();
const ipLoginAttempts = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const MAX_IP_ATTEMPTS = 20; // 20 attempts per IP per window (higher since multiple users may share IP)

// SECURITY: Valid roles whitelist
const VALID_ROLES = ['super_admin', 'brand_admin', 'branch_admin', 'brand_manager', 'validator', 'branch_manager', 'branch_validator'];

// SECURITY: Valid brands whitelist (must match values in create-admin-users.ts)
const VALID_BRANDS = ['All', 'Mendokoro Ramenba', 'Ramen Yushoken', 'Marudori', 'Kazunori', 'Kazu Café', null];

// Function to handle OPTIONS preflight requests
function handleOptions(origin: string | null) {
  return new Response('ok', { headers: getCorsHeaders(origin) });
}

// Function to create a Supabase client with the service role key
function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('ADMIN_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, serviceKey);
}

// Main serve function
serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return handleOptions(origin);
  }

  const { url, method } = req;
  const { pathname } = new URL(url);

  try {
    const supabaseAdmin = getSupabaseAdmin();
    let response;

    switch (pathname) {
      case '/admin-auth/login':
        response = await handleLogin(req, supabaseAdmin, corsHeaders);
        break;
      case '/admin-auth/logout':
        response = await handleLogout(req, supabaseAdmin, corsHeaders);
        break;
      case '/admin-auth/verify':
        response = await handleVerify(req, supabaseAdmin, corsHeaders);
        break;
      case '/admin-auth/refresh':
        response = await handleRefresh(req, supabaseAdmin, corsHeaders);
        break;
      case '/admin-auth/change-password':
        response = await handleChangePassword(req, supabaseAdmin, corsHeaders);
        break;
      case '/admin-auth/mark-redeemed':
        response = await handleMarkRedeemed(req, supabaseAdmin, corsHeaders);
        break;
      case '/admin-auth/update-status':
        response = await handleUpdateStatus(req, supabaseAdmin, corsHeaders);
        break;
      case '/admin-auth/update-profile':
        response = await handleUpdateProfile(req, supabaseAdmin, corsHeaders);
        break;
      default:
        response = new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    return response;
  } catch (error) {
    console.error('Error in main handler:', error);
    // SECURITY: Return generic error to prevent information disclosure
    return new Response(JSON.stringify({ error: 'An internal error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// --- ROUTE HANDLERS ---

async function handleLogin(req: Request, supabase: SupabaseClient, corsHeaders: Record<string, string>) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email and password are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // --- Rate Limiting Check ---
  const now = Date.now();
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

  // Per-email rate limiting
  const attempts = loginAttempts.get(email) || { count: 0, timestamp: now };
  if (now - attempts.timestamp > RATE_LIMIT_WINDOW) {
    attempts.count = 0;
    attempts.timestamp = now;
  }
  if (attempts.count >= MAX_ATTEMPTS) {
    return new Response(JSON.stringify({ error: 'Too many login attempts. Please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // SECURITY: Per-IP rate limiting to prevent distributed brute force
  const ipAttempts = ipLoginAttempts.get(clientIp) || { count: 0, timestamp: now };
  if (now - ipAttempts.timestamp > RATE_LIMIT_WINDOW) {
    ipAttempts.count = 0;
    ipAttempts.timestamp = now;
  }
  if (ipAttempts.count >= MAX_IP_ATTEMPTS) {
    return new Response(JSON.stringify({ error: 'Too many requests from your location. Please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // 1. Fetch user from `admin_users` table
  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('id, email, password_hash, brand, branch, role, is_active')
    .eq('email', email)
    .single();

  if (adminError || !adminUser) {
    attempts.count++;
    loginAttempts.set(email, attempts);
    ipAttempts.count++;
    ipLoginAttempts.set(clientIp, ipAttempts);
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // SECURITY: Validate role and brand from database
  if (!VALID_ROLES.includes(adminUser.role)) {
    console.error('Invalid role detected for user:', email, adminUser.role);
    return new Response(JSON.stringify({ error: 'Invalid user configuration' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (adminUser.brand && !VALID_BRANDS.includes(adminUser.brand)) {
    console.error('Invalid brand detected for user:', email, adminUser.brand);
    return new Response(JSON.stringify({ error: 'Invalid user configuration' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // 2. Check if user is active
  if (!adminUser.is_active) {
    return new Response(JSON.stringify({ error: 'User account is inactive' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // 3. Verify password using Supabase Auth (or bcrypt if needed)
  // We use Supabase Auth to handle the session and JWT generation
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    attempts.count++;
    loginAttempts.set(email, attempts);
    ipAttempts.count++;
    ipLoginAttempts.set(clientIp, ipAttempts);
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // 4. On successful login, set custom claims for the JWT
  const { error: claimsError } = await supabase.auth.admin.updateUserById(
    authData.user.id,
    {
      app_metadata: {
        ...authData.user.app_metadata,
        brand: adminUser.brand,
        branch: adminUser.branch,
        role: adminUser.role,
        admin_id: adminUser.id,
      }
    }
  );

  if (claimsError) {
    console.error("Error setting custom claims:", claimsError);
    return new Response(JSON.stringify({ error: 'Failed to set user claims' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  
  // 5. Re-fetch the session to get the token with the new claims
  const { data: refreshedSessionData, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshedSessionData.session) {
    return new Response(JSON.stringify({ error: 'Failed to refresh session with new claims' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // 6. Log the successful login to the audit log
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('remote-addr');
  await supabase.from('admin_audit_log').insert({
    admin_id: adminUser.id,
    action: 'login',
    resource_type: 'session',
    ip_address: ip,
    user_agent: req.headers.get('user-agent'),
    details: { email: adminUser.email }
  });

  // 7. Reset login attempts on success
  loginAttempts.delete(email);

  return new Response(JSON.stringify({
    success: true,
    token: refreshedSessionData.session.access_token,
    refresh_token: refreshedSessionData.session.refresh_token,
    user: {
      id: adminUser.id,
      email: adminUser.email,
      brand: adminUser.brand,
      branch: adminUser.branch,
      role: adminUser.role,
    },
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleLogout(req: Request, supabase: SupabaseClient, corsHeaders: Record<string, string>) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'No token provided' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  
  await supabase.from('admin_audit_log').insert({
      admin_id: user.app_metadata.admin_id,
      action: 'logout',
      resource_type: 'session'
  });

  await supabase.auth.signOut();

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleVerify(req: Request, supabase: SupabaseClient, corsHeaders: Record<string, string>) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return new Response(JSON.stringify({ valid: false }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return new Response(JSON.stringify({ valid: false }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({
    valid: true,
    user: {
      id: user.app_metadata.admin_id,
      email: user.email,
      brand: user.app_metadata.brand,
      branch: user.app_metadata.branch,
      role: user.app_metadata.role,
    },
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleRefresh(req: Request, supabase: SupabaseClient, corsHeaders: Record<string, string>) {
    const { refresh_token } = await req.json();
    if (!refresh_token) {
        return new Response(JSON.stringify({ error: 'Refresh token is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error || !data.session) {
        return new Response(JSON.stringify({ error: 'Failed to refresh token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
        success: true,
        token: data.session.access_token,
        refresh_token: data.session.refresh_token,
    }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

async function handleChangePassword(req: Request, supabase: SupabaseClient, corsHeaders: Record<string, string>) {
    const { current_password, new_password } = await req.json();
    if (!current_password || !new_password) {
        return new Response(JSON.stringify({ error: 'Current and new passwords are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Supabase does not have a direct way to verify the current password via API.
    // A workaround is to try to sign in with it.
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email!, password: current_password });
    if (signInError) {
        return new Response(JSON.stringify({ error: 'Invalid current password' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update the user's password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, { password: new_password });

    if (updateError) {
        return new Response(JSON.stringify({ error: 'Failed to update password' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Also update the `password_hash` in our public `admin_users` table.
    const password_hash = await bcrypt.hash(new_password);
    await supabase.from('admin_users').update({ password_hash }).eq('id', user.app_metadata.admin_id);


    await supabase.from('admin_audit_log').insert({
        admin_id: user.app_metadata.admin_id,
        action: 'password_changed',
        resource_type: 'user',
        resource_id: user.app_metadata.admin_id,
    });
    
    // Invalidate all sessions for the user
    await supabase.auth.admin.signOut(user.id);

    return new Response(JSON.stringify({ success: true, message: 'Password updated. Please log in again.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

async function handleMarkRedeemed(req: Request, supabase: SupabaseClient, corsHeaders: Record<string, string>) {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return new Response(JSON.stringify({ error: 'No token provided' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { id } = await req.json();
    if (!id) {
        return new Response(JSON.stringify({ error: 'Survey ID is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { error } = await supabase
        .from('survey_responses')
        .update({
            reward_claimed: true,
            reward_claimed_at: new Date().toISOString(),
            reward_claimed_by: user.email || 'admin',
            reward_claimed_branch: user.app_metadata?.branch || 'Unknown',
            reward_claimed_brand: user.app_metadata?.brand || 'Unknown'
        })
        .eq('id', id);

    if (error) {
        console.error('Error marking reward as redeemed:', error);
        return new Response(JSON.stringify({ error: 'Failed to mark as redeemed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Log the action
    await supabase.from('admin_audit_log').insert({
        admin_id: user.app_metadata?.admin_id,
        action: 'reward_redeemed',
        resource_type: 'survey_response',
        resource_id: id,
        details: { email: user.email }
    });

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

async function handleUpdateStatus(req: Request, supabase: SupabaseClient, corsHeaders: Record<string, string>) {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return new Response(JSON.stringify({ error: 'No token provided' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { id, status } = await req.json();
    if (!id || !status) {
        return new Response(JSON.stringify({ error: 'Survey ID and status are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const validStatuses = ['open', 'in_progress', 'resolved', 'voc', 'inactive'];
    if (!validStatuses.includes(status)) {
        return new Response(JSON.stringify({ error: 'Invalid status' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { error } = await supabase
        .from('survey_responses')
        .update({ ticket_status: status })
        .eq('id', id);

    if (error) {
        console.error('Error updating ticket status:', error);
        return new Response(JSON.stringify({ error: 'Failed to update status' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

async function handleUpdateProfile(req: Request, supabase: SupabaseClient, corsHeaders: Record<string, string>) {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return new Response(JSON.stringify({ error: 'No token provided' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { display_name, profile_pic } = await req.json();

    // Validate display_name (max 100 chars, alphanumeric and spaces only)
    if (display_name && (display_name.length > 100 || !/^[a-zA-Z0-9\s\-\.]+$/.test(display_name))) {
        return new Response(JSON.stringify({ error: 'Invalid display name format' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate profile_pic (must be data URL or https URL, max 500KB base64)
    if (profile_pic) {
        const isDataUrl = profile_pic.startsWith('data:image/');
        const isHttpsUrl = profile_pic.startsWith('https://');
        if (!isDataUrl && !isHttpsUrl) {
            return new Response(JSON.stringify({ error: 'Invalid profile picture format' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        // Check size for data URLs (roughly 1MB limit - base64 adds ~33% overhead)
        if (isDataUrl && profile_pic.length > 1400000) {
            return new Response(JSON.stringify({ error: 'Profile picture too large (max 1MB)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
    }

    // Build update object
    const updateData: Record<string, string | null> = {};
    if (display_name !== undefined) updateData.display_name = display_name || null;
    if (profile_pic !== undefined) updateData.profile_pic = profile_pic || null;

    const { error } = await supabase
        .from('admin_users')
        .update(updateData)
        .eq('id', user.app_metadata?.admin_id);

    if (error) {
        console.error('Error updating profile:', error);
        return new Response(JSON.stringify({ error: 'Failed to update profile' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, display_name, profile_pic }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
