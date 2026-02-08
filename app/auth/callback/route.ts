import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * Auth callback handler for:
 * - Email confirmations (signup)
 * - Password recovery links
 * - OAuth redirects
 * - Invitation links
 * 
 * Exchanges the auth code/token for a session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? "/dashboard"

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as any)
            })
          } catch {
            // Cookie set in Server Component - ignore
          }
        },
      },
    }
  )

  // Handle token_hash (used by email links like password recovery, invitations)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "recovery" | "signup" | "invite" | "email",
      token_hash,
    })

    if (!error) {
      // For recovery/invite, redirect to reset password page
      if (type === "recovery" || type === "invite") {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }

      // Check if user is a super_admin with no tenant — redirect to /admin
      const adminClient = getSupabaseAdminClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: userData } = await adminClient
          .from("users")
          .select("role, tenant_id")
          .eq("auth_user_id", authUser.id)
          .maybeSingle()

        if (userData?.role === 'super_admin' && !userData?.tenant_id) {
          return NextResponse.redirect(`${origin}/admin`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Handle code exchange (used by PKCE flow)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // For recovery type, redirect to reset password page
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }

      // Check if user is a super_admin with no tenant — redirect to /admin
      const adminClient = getSupabaseAdminClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: userData } = await adminClient
          .from("users")
          .select("role, tenant_id")
          .eq("auth_user_id", authUser.id)
          .maybeSingle()

        if (userData?.role === 'super_admin' && !userData?.tenant_id) {
          return NextResponse.redirect(`${origin}/admin`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Redirect to error page if code exchange fails
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
