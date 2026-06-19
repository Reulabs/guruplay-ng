import { createClient } from "@supabase/supabase-js";

const REQUIRED_ENV = [
  "VITE_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
];

const getEnv = (key) => process.env[key]?.trim();

const missingEnv = REQUIRED_ENV.filter((key) => !getEnv(key));

if (missingEnv.length > 0) {
  console.error(
    `Missing required environment variable${missingEnv.length === 1 ? "" : "s"}: ${missingEnv.join(", ")}`,
  );
  process.exit(1);
}

const supabaseUrl = getEnv("VITE_SUPABASE_URL");
const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const adminEmail = getEnv("ADMIN_EMAIL").toLowerCase();
const adminPassword = getEnv("ADMIN_PASSWORD");
const adminDisplayName = getEnv("ADMIN_DISPLAY_NAME") || "Guru Recordz Admin";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const findUserByEmail = async (email) => {
  const perPage = 100;

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Unable to list auth users: ${error.message}`);
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email,
    );

    if (match) return match;
    if (data.users.length < perPage) return null;
  }

  throw new Error("Stopped after scanning 10,000 users. Seed by user id instead.");
};

const ensureAuthUser = async () => {
  const existingUser = await findUserByEmail(adminEmail);

  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          ...existingUser.user_metadata,
          display_name: adminDisplayName,
        },
      },
    );

    if (error) {
      throw new Error(`Unable to update admin auth user: ${error.message}`);
    }

    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      display_name: adminDisplayName,
    },
  });

  if (error) {
    throw new Error(`Unable to create admin auth user: ${error.message}`);
  }

  return data.user;
};

const seedAdmin = async () => {
  const authUser = await ensureAuthUser();

  const { error } = await supabase.from("users").upsert(
    {
      id: authUser.id,
      email: adminEmail,
      display_name: adminDisplayName,
      user_type: "admin",
      last_login: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(`Unable to upsert admin profile: ${error.message}`);
  }

  console.log(`Seeded admin user: ${adminEmail}`);
};

seedAdmin().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
