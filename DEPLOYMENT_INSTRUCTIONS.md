# Backend Deployment Instructions

**IMPORTANT: Redeploy and Re-run SQL**

I have just fixed a bug in the survey submission process. This fix required an update to both the Edge Functions and the database security policies.

Please perform the following two steps to apply the fix:

1.  **Re-deploy the functions:**
    ```bash
    npx supabase functions deploy
    ```
2.  **Re-run the database setup script:**
    *   Go to the **SQL Editor** in your Supabase dashboard.
    *   Open the file `supabase/setup_database.sql`.
    *   Copy its entire content and paste it into a new query.
    *   Click **RUN**.

This should resolve the submission error.
---

## Original Instructions

### Final Backend Setup: Database and Security
I have created a single SQL script to finalize your database setup. This script will create all necessary columns and set up the required security rules. It is safe to run multiple times.
...

**Action for you:**

1.  Navigate to the **SQL Editor** in your Supabase dashboard.
2.  Open the `setup_database.sql` file that I have created in the `supabase` directory of your project.
3.  Copy the entire content of the file and paste it into a new query in the SQL Editor.
4.  Click **RUN**.

This will ensure your database is correctly configured for the deployed Edge Functions.

Once the function is deployed, the entire backend system will be operational.

---

### A Note on Security: `service_role_key` vs. `anon` key

You asked whether it is safe to use the `service_role_key`. That is an excellent question.

For the **Edge Function**, using the `service_role_key` is not only safe, it is **required** for our security model to work. Here's why:

*   **Privileged Operations:** Our Edge Function needs to perform tasks that a normal user should not be able to do, such as verifying a survey's completion status and writing a new reward code to the database.
*   **Bypassing Row Level Security (RLS):** The `service_role_key` has admin-level privileges and can bypass any RLS policies. This is necessary for the function to check and modify records. The `anon` key, which is used in the browser, is subject to RLS and would be blocked from these operations.
*   **Secure Environment:** The `service_role_key` is stored as a secret environment variable within Supabase's secure infrastructure. It is only accessible by the Edge Function and is never exposed to the user's browser or the public internet.

In summary, we are creating a trusted, server-side function to handle sensitive operations, and that trust is established by using the `service_role_key` in that secure environment. The client-side code will still use the public `anon` key.
