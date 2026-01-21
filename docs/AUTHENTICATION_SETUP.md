# Authentication System Setup Guide

This guide details how to deploy the authentication Edge Function and create the initial admin user accounts for the dashboard.

## Section 1: Deploy Edge Function

The `admin-auth` Edge Function handles all authentication logic, including login, logout, and session verification.

### Steps to Deploy:

1.  **Install Supabase CLI:** If you haven't already, install the Supabase CLI on your local machine.
    ```bash
    npm install supabase --save-dev
    ```

2.  **Login to Supabase:**
    ```bash
    npx supabase login
    ```

3.  **Link Your Project:**
    ```bash
    npx supabase link --project-ref <your-project-id>
    ```

4.  **Set Environment Variables:** The Edge Function requires your Supabase URL and Service Role Key. These must be set as secrets in your Supabase project.
    ```bash
    npx supabase secrets set SUPABASE_URL=<your-supabase-url>
    npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
    ```
    You can find these keys in your Supabase Dashboard under **Project Settings > API**.

5.  **Deploy the Function:**
    ```bash
    npx supabase functions deploy admin-auth
    ```
    After deployment, you will get a URL for your function. You will need this for your `.env` file.

## Section 2: Create Admin Users

The `create-admin-users.ts` script automates the creation of admin accounts based on the predefined list.

### Prerequisites:

-   **Deno Installed:** You need Deno to run the script. [Install Deno](https://deno.land/manual/getting_started/installation).
-   **Environment File:** Create a `.env` file in the root of your project and copy the contents of `.env.example`. Fill in the required values:
    -   `SUPABASE_URL`
    -   `SUPABASE_SERVICE_ROLE_KEY`

### Running the Script:

1.  Navigate to the root of your project in the terminal.
2.  Run the script using the following command:
    ```bash
    deno run --allow-net --allow-read --allow-write --allow-env scripts/create-admin-users.ts
    ```
3.  The script will:
    -   Connect to your Supabase project.
    -   Create an authentication user for each account in Supabase Auth.
    -   Insert a corresponding record into the public `admin_users` table.
    -   Generate a new `CREDENTIALS.md` file in your project root containing the temporary passwords for each account.

4.  **IMPORTANT:** Secure the `CREDENTIALS.md` file immediately. Do not commit it to Git.

## Section 3: Test Authentication

You can test the `/login` endpoint using a tool like `curl`.

```bash
# Replace with your Edge Function URL and user credentials
curl -X POST https://<your-project-ref>.supabase.co/functions/v1/admin-auth/login \
-H "Content-Type: application/json" \
-d 
'{ "email": "admin.alabang@mendokoro.com", "password": "<temporary-password-from-credentials-file>" }'
```

**Expected Success Response (200 OK):**
```json
{
  "success": true,
  "token": "ey...",
  "user": {
    "id": "...",
    "email": "admin.alabang@mendokoro.com",
    "brand": "Mendokoro Ramenba",
    "branch": "Molito (Alabang)",
    "role": "branch_admin"
  }
}
```

**Expected Error Response (401 Unauthorized):**
```json
{
  "error": "Invalid credentials"
}
```

## Section 4: Security Notes

-   **JWT Expiration:** By default, Supabase JWTs are short-lived (1 hour). The `auth.js` helper includes logic to handle token refreshing.
-   **Password Policy:** The generated passwords are 16 characters long and include a mix of character types. Supabase Auth has its own password strength requirements that can be configured in the dashboard. Users should be forced to change their temporary passwords on first login (Phase 3 feature).
-   **Rate Limiting:** The login endpoint has a simple in-memory rate limiter (5 attempts per 15 minutes per email) to protect against brute-force attacks. For production, consider a more robust solution like Redis.
-   **Session Management:** Tokens are stored in `localStorage`. This is convenient but susceptible to XSS attacks if your application has vulnerabilities. For higher security, tokens can be stored in `httpOnly` cookies, which requires more complex server-side logic.
-   **Service Role Key:** The `SUPABASE_SERVICE_ROLE_KEY` is extremely powerful. It should **never** be exposed on the client-side. It is used securely within the Edge Function and the Deno script.
