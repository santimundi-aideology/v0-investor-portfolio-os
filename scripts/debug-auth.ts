/**
 * Debug script to check auth configuration and user status
 * 
 * Run with: pnpm tsx scripts/debug-auth.ts
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_EMAIL = "smundi@aideology.ai"

console.log("=".repeat(60))
console.log("🔍 AUTH DEBUG REPORT")
console.log("=".repeat(60))
console.log("")

// Check environment variables
console.log("📋 Environment Variables:")
console.log(`   SUPABASE_URL: ${SUPABASE_URL ? "✅ Set" : "❌ Missing"}`)
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing"}`)
console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing"}`)
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? "✅ Set" : "❌ Missing"}`)
console.log(`   NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || "❌ Missing (needed for auth redirects)"}`)
console.log("")

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Cannot proceed without Supabase credentials")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function debugAuth() {
  try {
    // Check if user exists in auth.users
    console.log("🔐 Checking auth.users table...")
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error("❌ Error listing auth users:", authError.message)
      return
    }

    const authUser = authUsers?.users?.find(u => u.email === ADMIN_EMAIL)
    
    if (authUser) {
      console.log(`   ✅ Auth user found!`)
      console.log(`      ID: ${authUser.id}`)
      console.log(`      Email: ${authUser.email}`)
      console.log(`      Email Confirmed: ${authUser.email_confirmed_at ? "Yes" : "No ⚠️"}`)
      console.log(`      Created: ${authUser.created_at}`)
      console.log(`      Last Sign In: ${authUser.last_sign_in_at || "Never"}`)
      console.log(`      Metadata:`, JSON.stringify(authUser.user_metadata, null, 2))
    } else {
      console.log(`   ❌ Auth user NOT FOUND for ${ADMIN_EMAIL}`)
      console.log(`   📝 You need to run: pnpm seed:admin`)
      console.log("")
      console.log("   Found users in auth.users:")
      authUsers?.users?.forEach(u => {
        console.log(`      - ${u.email} (${u.id})`)
      })
      if (!authUsers?.users?.length) {
        console.log("      (no users found)")
      }
    }

    console.log("")

    // Check if user exists in public.users
    console.log("👤 Checking public.users table...")
    const { data: publicUser, error: publicError } = await supabase
      .from("users")
      .select("*")
      .eq("email", ADMIN_EMAIL)
      .single()

    if (publicError) {
      if (publicError.code === "PGRST116") {
        console.log(`   ❌ Public user NOT FOUND for ${ADMIN_EMAIL}`)
        console.log(`   📝 You may need to run the seed-admin-user.sql migration`)
      } else {
        console.error(`   ❌ Error:`, publicError.message)
      }
    } else {
      console.log(`   ✅ Public user found!`)
      console.log(`      ID: ${publicUser.id}`)
      console.log(`      Name: ${publicUser.name}`)
      console.log(`      Role: ${publicUser.role}`)
      console.log(`      Auth User ID: ${publicUser.auth_user_id || "Not linked ⚠️"}`)
      console.log(`      Phone: ${publicUser.phone || "Not set"}`)
      console.log(`      WhatsApp: ${publicUser.whatsapp || "Not set"}`)
      console.log(`      Is Active: ${publicUser.is_active}`)
    }

    console.log("")

    // Check if auth triggers exist
    console.log("⚙️  Checking database triggers...")
    const { data: triggers, error: triggerError } = await supabase
      .rpc('get_auth_triggers')
      .single()

    if (triggerError) {
      // Try direct query
      const { data: directTriggers, error: directError } = await supabase
        .from("pg_trigger")
        .select("*")
        .limit(1)
      
      if (directError) {
        console.log("   ⚠️  Cannot check triggers (need to verify manually)")
      }
    }

    console.log("")
    console.log("=".repeat(60))
    console.log("📌 DIAGNOSIS")
    console.log("=".repeat(60))
    
    if (!authUser) {
      console.log("")
      console.log("🔴 ISSUE: Auth user does not exist")
      console.log("")
      console.log("   To fix, run:")
      console.log("   pnpm seed:admin")
      console.log("")
      console.log("   This will create the auth user with:")
      console.log("   - Email: smundi@aideology.ai")
      console.log("   - Password: Aideology123#")
    } else if (!authUser.email_confirmed_at) {
      console.log("")
      console.log("🟡 ISSUE: Email not confirmed")
      console.log("")
      console.log("   The user exists but email is not confirmed.")
      console.log("   Running seed:admin will fix this.")
    } else if (publicUser && !publicUser.auth_user_id) {
      console.log("")
      console.log("🟡 ISSUE: Public user not linked to auth user")
      console.log("")
      console.log("   Linking now...")
      const { error: linkError } = await supabase
        .from("users")
        .update({ auth_user_id: authUser.id })
        .eq("email", ADMIN_EMAIL)
      
      if (linkError) {
        console.log(`   ❌ Failed to link: ${linkError.message}`)
      } else {
        console.log("   ✅ Successfully linked!")
      }
    } else {
      console.log("")
      console.log("🟢 Auth setup looks correct!")
      console.log("")
      console.log("   If login still fails, try:")
      console.log("   1. Clear browser cookies")
      console.log("   2. Check password is exactly: Aideology123#")
      console.log("   3. Restart the dev server")
    }

  } catch (error) {
    console.error("❌ Unexpected error:", error)
  }
}

debugAuth()
