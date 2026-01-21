// --- Configuration ---
// These would be loaded from an environment file in a real build process
const ADMIN_AUTH_ENDPOINT = '/admin-auth'; // Base URL for your Edge Function

// --- Token and User Management ---

function getToken() {
    return localStorage.getItem('admin_token');
}

function setToken(token) {
    if (token) {
        localStorage.setItem('admin_token', token);
    } else {
        localStorage.removeItem('admin_token');
    }
}

function getUser() {
    const userStr = localStorage.getItem('admin_user');
    try {
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
        return null;
    }
}

function setUser(user) {
    if (user) {
        localStorage.setItem('admin_user', JSON.stringify(user));
    } else {
        localStorage.removeItem('admin_user');
    }
}

function isAuthenticated() {
    return !!getToken();
}

// --- Fetch Wrapper ---

async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${ADMIN_AUTH_ENDPOINT}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unexpected server error occurred.' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    // For 204 No Content responses
    if (response.status === 204) {
        return null;
    }

    return response.json();
}

// --- Core Authentication Functions ---

async function login(email, password) {
    try {
        const data = await apiFetch('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        
        if (data.success && data.token) {
            setToken(data.token);
            setUser(data.user);
            return { success: true, user: data.user };
        } else {
            return { success: false, error: data.error || 'Login failed.' };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

async function logout() {
    try {
        await apiFetch('/logout', { method: 'POST' });
    } catch (error) {
        console.warn('Logout failed on server, clearing client-side session anyway.', error);
    } finally {
        // Always clear local storage on logout
        setToken(null);
        setUser(null);
        window.location.href = '/admin/login.html';
    }
}

async function verifySession() {
    if (!isAuthenticated()) {
        return { valid: false };
    }

    try {
        const data = await apiFetch('/verify', { method: 'GET' });
        return data; // { valid: true, user: {...} }
    } catch (error) {
        console.error('Session verification failed:', error);
        // If verification fails, token is likely expired or invalid
        setToken(null);
        setUser(null);
        return { valid: false };
    }
}

// --- Session Management ---

/**
 * Checks if the user is authenticated. If not, redirects to the login page.
 * This should be called at the beginning of every protected admin page.
 */
async function requireAuth() {
    const session = await verifySession();
    if (!session.valid) {
        console.log('Authentication required. Redirecting to login.');
        window.location.href = '/admin/login.html';
    } else {
        // Optional: you can re-set the user data here to keep it fresh
        setUser(session.user);
    }
}


// --- Optional: Advanced Token Refreshing ---
// This is a more complex pattern that can be used to silently refresh tokens.

let tokenRefreshPromise = null;

async function getValidToken() {
    let token = getToken();
    if (!token) return null;

    // A simple check for JWT expiration (without decoding) could be added here
    // but for now, we rely on the verify endpoint.
    
    // If a refresh is already in progress, wait for it
    if (tokenRefreshPromise) {
        return tokenRefreshPromise;
    }

    // Check if the token is still valid
    const session = await verifySession();
    if (session.valid) {
        return token;
    }

    // If not valid, try to refresh
    const refreshTokenValue = localStorage.getItem('admin_refresh_token'); // Assuming you store this
    if (!refreshTokenValue) {
        logout(); // No refresh token, force logout
        return null;
    }

    tokenRefreshPromise = apiFetch('/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshTokenValue }),
    }).then(data => {
        if (data.token) {
            setToken(data.token);
            if (data.refresh_token) {
                localStorage.setItem('admin_refresh_token', data.refresh_token);
            }
            return data.token;
        } else {
            throw new Error('Refresh failed');
        }
    }).catch(err => {
        console.error("Token refresh failed, logging out.", err);
        logout();
        return null;
    }).finally(() => {
        tokenRefreshPromise = null;
    });

    return tokenRefreshPromise;
}

// Example of a fetch wrapper using silent refresh
async function secureFetch(endpoint, options = {}) {
    const token = await getValidToken();
    if (!token) {
        throw new Error('Not authenticated');
    }
    
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    
    return apiFetch(endpoint, options);
}

// --- Exports for use in other scripts ---
// You would use these in your dashboard's JavaScript files.
/*
export {
    login,
    logout,
    isAuthenticated,
    getUser,
    requireAuth,
    apiFetch,
    secureFetch // Use this for most API calls from the dashboard
};
*/
