import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.0/mod.ts';
import { config } from 'https://deno.land/x/dotenv@v3.2.2/mod.ts';

// Load environment variables from .env file
config({ export: true, path: './.env' });

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('ADMIN_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceKey) {
  console.error('Error: SUPABASE_URL and ADMIN_SERVICE_ROLE_KEY must be set in the .env file.');
  Deno.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

const CREDENTIALS_FILE = 'CREDENTIALS.md';

const adminAccounts = [
  { brand: "Mendokoro Ramenba", branch: "Molito (Alabang)", email: "admin.alabang@mendokoro.com" },
  { brand: "Mendokoro Ramenba", branch: "Bonifacio Global City", email: "admin.bgc@mendokoro.com" },
  { brand: "Mendokoro Ramenba", branch: "Cebu", email: "admin.cebu@mendokoro.com" },
  { brand: "Mendokoro Ramenba", branch: "Katipunan", email: "admin.katipunan@mendokoro.com" },
  { brand: "Mendokoro Ramenba", branch: "Salcedo Village (Makati)", email: "admin.makati@mendokoro.com" },
  { brand: "Mendokoro Ramenba", branch: "Pasay", email: "admin.pasay@mendokoro.com" },
  { brand: "Ramen Yushoken", branch: "Molito (Alabang)", email: "admin.alabang@yushoken.com" },
  { brand: "Ramen Yushoken", branch: "Cebu", email: "admin.cebu@yushoken.com" },
  { brand: "Ramen Yushoken", branch: "Ortigas", email: "admin.ortigas@yushoken.com" },
  { brand: "Ramen Yushoken", branch: "Pasay", email: "admin.pasay@yushoken.com" },
  { brand: "Kazunori", branch: "Makati", email: "admin@kazunori.com" },
  { brand: "Kazu Café", branch: "Makati", email: "admin@kazucafe.com" }
];

function generateSecurePassword(length = 16): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = upper + lower + numbers + symbols;

  let password = '';
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

function sanitizeForUsername(text: string): string {
    return text.toLowerCase()
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/\(/g, '')   // Remove parentheses
        .replace(/\)/g, '')
        .replace(/[^a-z0-9_]/g, ''); // Remove invalid characters
}

async function main() {
  console.log('Starting admin user creation script...');
  let credentialsContent = `# Admin Dashboard Credentials\n\n` +
    `- **SECURITY WARNING** -\n` + // Corrected from ⚠️ **SECURITY WARNING** ⚠️ to avoid markdown issues in code string
    `- This file contains sensitive login credentials.\n` + 
    `- **DO NOT** commit to git (ensure it's in .gitignore).\n` + 
    `- Store this file securely (e.g., in a password manager).\n` + 
    `- Passwords should be changed by users after their first login.\n\n`;

  for (const account of adminAccounts) {
    const { brand, branch, email } = account;
    const password = generateSecurePassword();
    const username = sanitizeForUsername(`${brand}_${branch}_admin`);
    const password_hash = await bcrypt.hash(password);

    console.log(`\nProcessing: ${email}`);

    // 1. Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm the email
    });

    let userId;

    if (authError) {
      if (authError.message.includes('already been registered') || authError.message.includes('already registered')) {
        console.warn(`  - 🟡 WARN: Auth user ${email} already exists. Fetching existing user ID...`);
        // Fetch the existing user's ID
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
          console.error(`  - 🔴 ERROR listing users:`, listError.message);
          continue;
        }
        const existingUser = listData.users.find(u => u.email === email);
        if (!existingUser) {
          console.error(`  - 🔴 ERROR: Could not find existing user ${email}`);
          continue;
        }
        userId = existingUser.id;
        console.log(`  - ✅ Found existing auth user ID: ${userId}`);
      } else {
        console.error(`  - 🔴 ERROR creating auth user ${email}:`, authError.message);
        continue;
      }
    } else {
      console.log(`  - ✅ Auth user created successfully for ${email}.`);
      userId = authUser.user.id;
    }


    // 2. Insert into `admin_users` table
    const { data: adminUser, error: dbError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        id: userId, // Use the same ID from Supabase Auth
        username,
        email,
        password_hash,
        brand,
        branch,
        role: 'branch_admin'
      })
      .select()
      .single();

    if (dbError) {
      if (dbError.code === '23505') { // Unique constraint violation
        console.warn(`  - 🟡 WARN: Admin user ${email} already exists in the database.`);
      } else {
        console.error(`  - 🔴 ERROR inserting into database for ${email}:`, dbError.message);
        continue;
      }
    } else {
      console.log(`  - ✅ Admin user record created in database for ${email}.`);
    }

    // Append credentials to the markdown file content
    credentialsContent += `## ${brand} - ${branch}\n` +
      `- **Email**: 
${email}
` + // Removed unnecessary backticks around email
      `- **Username**: 
${username}
` + // Removed unnecessary backticks around username
      `- **Temporary Password**: 
${password}
` + // Removed unnecessary backticks around password
      `- **Login URL**: [Your Admin Dashboard URL]/admin/login.html
` + 
      `- **Status**: ⏳ Password change required on first login\n\n`;
  }

  // Write the final content to CREDENTIALS.md
  try {
    await Deno.writeTextFile(CREDENTIALS_FILE, credentialsContent);
    console.log(`\n✅ All done! Admin credentials have been saved to ${CREDENTIALS_FILE}`);
    console.log('**IMPORTANT**: Secure this file immediately and do not commit it to version control.');
  } catch (e) {
    console.error(`\n🔴 FAILED to write credentials file:`, e);
  }
}

if (import.meta.main) {
  main();
}
