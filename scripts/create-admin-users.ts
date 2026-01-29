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

// All admin accounts to create
const adminAccounts = [
  // ============================================================
  // SUPER ADMIN
  // ============================================================
  {
    email: "admin@nipponhasha.ph",
    password: "NHsuper2024!",
    brand: "All",
    branch: "All",
    role: "super_admin"
  },

  // ============================================================
  // MENDOKORO RAMENBA - Brand Level
  // ============================================================
  {
    email: "manager.mendokoro@nipponhasha.ph",
    password: "MDKmanager24!",
    brand: "Mendokoro",
    branch: "All",
    role: "brand_manager"
  },
  {
    email: "validator.mendokoro@nipponhasha.ph",
    password: "MDKvalidate24!",
    brand: "Mendokoro",
    branch: "All",
    role: "validator"
  },

  // MENDOKORO RAMENBA - Branch Level
  // Molito (Alabang)
  {
    email: "manager.mdk.alabang@nipponhasha.ph",
    password: "MDKAmanager24!",
    brand: "Mendokoro",
    branch: "Molito (Alabang)",
    role: "branch_manager"
  },
  {
    email: "validator.mdk.alabang@nipponhasha.ph",
    password: "MDKAvalidate24!",
    brand: "Mendokoro",
    branch: "Molito (Alabang)",
    role: "branch_validator"
  },
  // Bonifacio Global City
  {
    email: "manager.mdk.bgc@nipponhasha.ph",
    password: "MDKBmanager24!",
    brand: "Mendokoro",
    branch: "Bonifacio Global City",
    role: "branch_manager"
  },
  {
    email: "validator.mdk.bgc@nipponhasha.ph",
    password: "MDKBvalidate24!",
    brand: "Mendokoro",
    branch: "Bonifacio Global City",
    role: "branch_validator"
  },
  // Cebu
  {
    email: "manager.mdk.cebu@nipponhasha.ph",
    password: "MDKCmanager24!",
    brand: "Mendokoro",
    branch: "Cebu",
    role: "branch_manager"
  },
  {
    email: "validator.mdk.cebu@nipponhasha.ph",
    password: "MDKCvalidate24!",
    brand: "Mendokoro",
    branch: "Cebu",
    role: "branch_validator"
  },
  // Katipunan
  {
    email: "manager.mdk.katipunan@nipponhasha.ph",
    password: "MDKKmanager24!",
    brand: "Mendokoro",
    branch: "Katipunan",
    role: "branch_manager"
  },
  {
    email: "validator.mdk.katipunan@nipponhasha.ph",
    password: "MDKKvalidate24!",
    brand: "Mendokoro",
    branch: "Katipunan",
    role: "branch_validator"
  },
  // Salcedo Village (Makati)
  {
    email: "manager.mdk.makati@nipponhasha.ph",
    password: "MDKMmanager24!",
    brand: "Mendokoro",
    branch: "Salcedo Village (Makati)",
    role: "branch_manager"
  },
  {
    email: "validator.mdk.makati@nipponhasha.ph",
    password: "MDKMvalidate24!",
    brand: "Mendokoro",
    branch: "Salcedo Village (Makati)",
    role: "branch_validator"
  },
  // Pasay
  {
    email: "manager.mdk.pasay@nipponhasha.ph",
    password: "MDKPmanager24!",
    brand: "Mendokoro",
    branch: "Pasay",
    role: "branch_manager"
  },
  {
    email: "validator.mdk.pasay@nipponhasha.ph",
    password: "MDKPvalidate24!",
    brand: "Mendokoro",
    branch: "Pasay",
    role: "branch_validator"
  },

  // ============================================================
  // RAMEN YUSHOKEN - Brand Level
  // ============================================================
  {
    email: "manager.yushoken@nipponhasha.ph",
    password: "YSKmanager24!",
    brand: "Ramen Yushoken",
    branch: "All",
    role: "brand_manager"
  },
  {
    email: "validator.yushoken@nipponhasha.ph",
    password: "YSKvalidate24!",
    brand: "Ramen Yushoken",
    branch: "All",
    role: "validator"
  },

  // RAMEN YUSHOKEN - Branch Level
  // Molito (Alabang)
  {
    email: "manager.ysk.alabang@nipponhasha.ph",
    password: "YSKAmanager24!",
    brand: "Ramen Yushoken",
    branch: "Molito (Alabang)",
    role: "branch_manager"
  },
  {
    email: "validator.ysk.alabang@nipponhasha.ph",
    password: "YSKAvalidate24!",
    brand: "Ramen Yushoken",
    branch: "Molito (Alabang)",
    role: "branch_validator"
  },
  // Cebu
  {
    email: "manager.ysk.cebu@nipponhasha.ph",
    password: "YSKCmanager24!",
    brand: "Ramen Yushoken",
    branch: "Cebu",
    role: "branch_manager"
  },
  {
    email: "validator.ysk.cebu@nipponhasha.ph",
    password: "YSKCvalidate24!",
    brand: "Ramen Yushoken",
    branch: "Cebu",
    role: "branch_validator"
  },
  // Ortigas
  {
    email: "manager.ysk.ortigas@nipponhasha.ph",
    password: "YSKOmanager24!",
    brand: "Ramen Yushoken",
    branch: "Ortigas",
    role: "branch_manager"
  },
  {
    email: "validator.ysk.ortigas@nipponhasha.ph",
    password: "YSKOvalidate24!",
    brand: "Ramen Yushoken",
    branch: "Ortigas",
    role: "branch_validator"
  },
  // Pasay
  {
    email: "manager.ysk.pasay@nipponhasha.ph",
    password: "YSKPmanager24!",
    brand: "Ramen Yushoken",
    branch: "Pasay",
    role: "branch_manager"
  },
  {
    email: "validator.ysk.pasay@nipponhasha.ph",
    password: "YSKPvalidate24!",
    brand: "Ramen Yushoken",
    branch: "Pasay",
    role: "branch_validator"
  },

  // ============================================================
  // MARUDORI - Brand Level
  // ============================================================
  {
    email: "manager.marudori@nipponhasha.ph",
    password: "MRDmanager24!",
    brand: "Marudori",
    branch: "All",
    role: "brand_manager"
  },
  {
    email: "validator.marudori@nipponhasha.ph",
    password: "MRDvalidate24!",
    brand: "Marudori",
    branch: "All",
    role: "validator"
  },

  // MARUDORI - Branch Level
  // Rockwell
  {
    email: "manager.mrd.rockwell@nipponhasha.ph",
    password: "MRDRmanager24!",
    brand: "Marudori",
    branch: "Rockwell",
    role: "branch_manager"
  },
  {
    email: "validator.mrd.rockwell@nipponhasha.ph",
    password: "MRDRvalidate24!",
    brand: "Marudori",
    branch: "Rockwell",
    role: "branch_validator"
  },
  // Vertis North
  {
    email: "manager.mrd.vertis@nipponhasha.ph",
    password: "MRDVmanager24!",
    brand: "Marudori",
    branch: "Vertis North",
    role: "branch_manager"
  },
  {
    email: "validator.mrd.vertis@nipponhasha.ph",
    password: "MRDVvalidate24!",
    brand: "Marudori",
    branch: "Vertis North",
    role: "branch_validator"
  },

  // ============================================================
  // KAZUNORI - Brand Level
  // ============================================================
  {
    email: "manager.kazunori@nipponhasha.ph",
    password: "KZNmanager24!",
    brand: "Kazunori",
    branch: "All",
    role: "brand_manager"
  },
  {
    email: "validator.kazunori@nipponhasha.ph",
    password: "KZNvalidate24!",
    brand: "Kazunori",
    branch: "All",
    role: "validator"
  },

  // KAZUNORI - Branch Level
  // Kazunori (Makati)
  {
    email: "manager.kzn.makati@nipponhasha.ph",
    password: "KZNMmanager24!",
    brand: "Kazunori",
    branch: "Kazunori (Makati)",
    role: "branch_manager"
  },
  {
    email: "validator.kzn.makati@nipponhasha.ph",
    password: "KZNMvalidate24!",
    brand: "Kazunori",
    branch: "Kazunori (Makati)",
    role: "branch_validator"
  },

  // ============================================================
  // KAZU CAFÉ - Brand Level
  // ============================================================
  {
    email: "manager.kazucafe@nipponhasha.ph",
    password: "KZCmanager24!",
    brand: "Kazu Café",
    branch: "All",
    role: "brand_manager"
  },
  {
    email: "validator.kazucafe@nipponhasha.ph",
    password: "KZCvalidate24!",
    brand: "Kazu Café",
    branch: "All",
    role: "validator"
  },

  // KAZU CAFÉ - Branch Level
  // Kazu Café (Makati)
  {
    email: "manager.kzc.makati@nipponhasha.ph",
    password: "KZCFmanager24!",
    brand: "Kazu Café",
    branch: "Kazu Café (Makati)",
    role: "branch_manager"
  },
  {
    email: "validator.kzc.makati@nipponhasha.ph",
    password: "KZCFvalidate24!",
    brand: "Kazu Café",
    branch: "Kazu Café (Makati)",
    role: "branch_validator"
  }
];

function sanitizeForUsername(email: string): string {
  return email.split('@')[0]
    .toLowerCase()
    .replace(/\./g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

async function main() {
  console.log('Starting admin user creation script...');
  console.log(`Found ${adminAccounts.length} accounts to create.\n`);

  for (const account of adminAccounts) {
    const { email, password, brand, branch, role } = account;
    const username = sanitizeForUsername(email);
    const password_hash = await bcrypt.hash(password);

    console.log(`\nProcessing: ${email} (${role})`);

    // 1. Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    let userId;

    if (authError) {
      if (authError.message.includes('already been registered') || authError.message.includes('already registered')) {
        console.warn(`  - WARN: Auth user ${email} already exists. Fetching existing user ID...`);
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
          console.error(`  - ERROR listing users:`, listError.message);
          continue;
        }
        const existingUser = listData.users.find(u => u.email === email);
        if (!existingUser) {
          console.error(`  - ERROR: Could not find existing user ${email}`);
          continue;
        }
        userId = existingUser.id;

        // Update password for existing user
        await supabaseAdmin.auth.admin.updateUserById(userId, { password });
        console.log(`  - OK: Found existing auth user, password updated.`);
      } else {
        console.error(`  - ERROR creating auth user ${email}:`, authError.message);
        continue;
      }
    } else {
      console.log(`  - OK: Auth user created successfully.`);
      userId = authUser.user.id;
    }

    // 2. Check if user exists in admin_users table
    const { data: existingAdmin } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingAdmin) {
      // Update existing record
      const { error: updateError } = await supabaseAdmin
        .from('admin_users')
        .update({
          username,
          password_hash,
          brand,
          branch,
          role,
          is_active: true
        })
        .eq('email', email);

      if (updateError) {
        console.error(`  - ERROR updating database for ${email}:`, updateError.message);
      } else {
        console.log(`  - OK: Admin user record updated in database.`);
      }
    } else {
      // Insert new record
      const { error: dbError } = await supabaseAdmin
        .from('admin_users')
        .insert({
          id: userId,
          username,
          email,
          password_hash,
          brand,
          branch,
          role,
          is_active: true
        });

      if (dbError) {
        if (dbError.code === '23505') {
          console.warn(`  - WARN: Admin user ${email} already exists in the database.`);
        } else {
          console.error(`  - ERROR inserting into database for ${email}:`, dbError.message);
          continue;
        }
      } else {
        console.log(`  - OK: Admin user record created in database.`);
      }
    }
  }

  console.log('\n========================================');
  console.log('DONE! All admin users have been processed.');
  console.log('See CREDENTIALS.md for login details.');
  console.log('========================================\n');
}

if (import.meta.main) {
  main();
}
