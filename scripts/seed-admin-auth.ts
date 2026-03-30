/**
 * Script to create the admin auth user in Supabase
 * 
 * Run with: npx tsx scripts/seed-admin-auth.ts
 * 
 * Prerequisites:
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * - The public.users record for Santiago should already exist (run seed-admin-user.sql first)
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Admin user configuration — override via env vars for production use
const ADMIN_USER = {
  email: process.env.ADMIN_EMAIL || "admin@example.com",
  password: process.env.ADMIN_PASSWORD || "ChangeMe123!",
  name: process.env.ADMIN_NAME || "Admin User",
  phone: process.env.ADMIN_PHONE || "",
  whatsapp: process.env.ADMIN_WHATSAPP || "",
  role: "super_admin",
  tenant_id: process.env.ADMIN_TENANT_ID || "11111111-1111-1111-1111-111111111111",
}

async function seedAdminUser() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.warn("⚠️  ADMIN_EMAIL / ADMIN_PASSWORD not set — using insecure defaults. Set these env vars for production.")
  }

  console.log("🚀 Creating admin auth user...")
  console.log(`   Email: ${ADMIN_USER.email}`)
  console.log(`   Name: ${ADMIN_USER.name}`)
  console.log(`   Role: ${ADMIN_USER.role}`)
  console.log("")

  try {
    // Check if user already exists in auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === ADMIN_USER.email)

    if (existingUser) {
      console.log("⚠️  Auth user already exists. Updating password...")
      
      // Update the existing user's password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password: ADMIN_USER.password,
          email_confirm: true,
          user_metadata: {
            name: ADMIN_USER.name,
            phone: ADMIN_USER.phone,
            whatsapp: ADMIN_USER.whatsapp,
            role: ADMIN_USER.role,
            tenant_id: ADMIN_USER.tenant_id,
          },
        }
      )

      if (updateError) {
        console.error("❌ Failed to update auth user:", updateError.message)
        process.exit(1)
      }

      console.log("✅ Auth user updated successfully!")
      console.log(`   Auth ID: ${existingUser.id}`)
    } else {
      // Create new auth user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: ADMIN_USER.email,
        password: ADMIN_USER.password,
        email_confirm: true, // Skip email verification
        user_metadata: {
          name: ADMIN_USER.name,
          phone: ADMIN_USER.phone,
          whatsapp: ADMIN_USER.whatsapp,
          role: ADMIN_USER.role,
          tenant_id: ADMIN_USER.tenant_id,
        },
      })

      if (createError) {
        console.error("❌ Failed to create auth user:", createError.message)
        process.exit(1)
      }

      console.log("✅ Auth user created successfully!")
      console.log(`   Auth ID: ${newUser.user?.id}`)
    }

    // Verify the public.users record is linked
    const { data: publicUser, error: publicError } = await supabase
      .from("users")
      .select("id, auth_user_id, name, email, role")
      .eq("email", ADMIN_USER.email)
      .single()

    if (publicError) {
      console.log("")
      console.log("⚠️  No public.users record found. The auth trigger should create it,")
      console.log("   or you can run: supabase db seed --file supabase/seed-admin-user.sql")
    } else {
      console.log("")
      console.log("📋 Public user record:")
      console.log(`   ID: ${publicUser.id}`)
      console.log(`   Auth linked: ${publicUser.auth_user_id ? "Yes" : "No (will be linked on first login)"}`)
      console.log(`   Name: ${publicUser.name}`)
      console.log(`   Role: ${publicUser.role}`)
    }

    console.log("")
    console.log("🎉 Admin user setup complete!")
    console.log("")
    console.log("You can now sign in with:")
    console.log(`   Email: ${ADMIN_USER.email}`)
    console.log(`   Password: ${ADMIN_USER.password}`)

  } catch (error) {
    console.error("❌ Unexpected error:", error)
    process.exit(1)
  }
}

seedAdminUser()
