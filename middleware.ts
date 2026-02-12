import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Routes that don't require authentication
const publicRoutes = [
  "/login",
  "/signup",
  "/forgot-password",
  "/auth/callback",
  "/auth/reset-password",
  "/auth/signout",
  "/api/health",
  "/api/bayut",
  "/api/dld",
  "/api/property-intake",
  "/api/jobs",
  "/api/notifications",
]

// Routes that require specific roles
const roleRoutes: Record<string, string[]> = {
  "/admin": ["super_admin"],
  "/manager": ["manager"],
  "/team": ["super_admin", "manager"],
  "/audit-log": ["super_admin", "manager"],
}

// Routes that super_admins should NOT access (realtor CRM + investor portal)
// They should use the /admin portal instead. Demos use separate demo accounts.
const superAdminBlockedRoutes = [
  "/dashboard",
  "/properties",
  "/investors",
  "/tasks",
  "/settings",
  "/memos",
  "/property-intake",
  "/investor",
]

// Page routes gated by feature flags (disabled → redirect to /dashboard)
const featureRouteMap: Record<string, string> = {
  "/executive-summary": "NEXT_PUBLIC_FF_EXECUTIVE_SUMMARY",
  "/market-report": "NEXT_PUBLIC_FF_MARKET_REPORT",
  "/roi-calculator": "NEXT_PUBLIC_FF_ROI_CALCULATOR",
  "/deal-room": "NEXT_PUBLIC_FF_DEAL_ROOM",
  "/market-signals": "NEXT_PUBLIC_FF_MARKET_SIGNALS",
  "/market-map": "NEXT_PUBLIC_FF_MARKET_MAP",
  "/market-compare": "NEXT_PUBLIC_FF_MARKET_COMPARE",
  "/realtor": "NEXT_PUBLIC_FF_REALTOR_OPS",
  "/manager": "NEXT_PUBLIC_FF_MANAGER_COCKPIT",
  "/real-estate": "NEXT_PUBLIC_FF_REAL_ESTATE",
  "/team": "NEXT_PUBLIC_FF_ADMIN_PANEL",
  "/audit-log": "NEXT_PUBLIC_FF_ADMIN_PANEL",
}

// API routes gated by feature flags (disabled → 404)
const featureApiRouteMap: Record<string, string> = {
  "/api/deal-rooms": "NEXT_PUBLIC_FF_DEAL_ROOM",
  "/api/market-report": "NEXT_PUBLIC_FF_MARKET_REPORT",
  "/api/market-signals": "NEXT_PUBLIC_FF_MARKET_SIGNALS",
  "/api/manager": "NEXT_PUBLIC_FF_MANAGER_COCKPIT",
  "/api/jobs": "NEXT_PUBLIC_FF_DATA_INGESTION",
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and API routes (except protected ones)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Feature flag: block disabled page routes → redirect to /dashboard
  for (const [routePrefix, envVar] of Object.entries(featureRouteMap)) {
    if (pathname.startsWith(routePrefix) && process.env[envVar] !== "true") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  // Feature flag: block disabled API routes → return 404
  for (const [routePrefix, envVar] of Object.entries(featureApiRouteMap)) {
    if (pathname.startsWith(routePrefix) && process.env[envVar] !== "true") {
      return NextResponse.json(
        { error: "Feature not enabled" },
        { status: 404 },
      )
    }
  }

  // Create response to modify cookies
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client with cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // First update the request cookies (for downstream middleware/routes)
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          // Create ONE new response with the updated request headers
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          // Set ALL cookies on the single response
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session if exists
  const { data: { session } } = await supabase.auth.getSession()

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // If no session and not public route, redirect to login
  if (!session && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check role-based access (requires fetching user data from database)
  if (session) {
    // Fetch user from database to get current role and tenant (not stale metadata)
    let userRole = session.user.user_metadata?.role || "manager"
    let tenantId = session.user.user_metadata?.tenant_id || "11111111-1111-1111-1111-111111111111"
    let userId = session.user.user_metadata?.user_id || "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    const investorId = session.user.user_metadata?.investor_id
    let isActive = true

    // Try to fetch user from database for authoritative data
    try {
      const { data: userData, error } = await supabase
        .from("users")
        .select("id, tenant_id, role, is_active")
        .eq("auth_user_id", session.user.id)
        .single()

      if (!error && userData) {
        userId = userData.id
        tenantId = userData.tenant_id
        userRole = userData.role
        isActive = userData.is_active
      }
    } catch (e) {
      // Fallback to metadata if database fetch fails
      console.warn("Failed to fetch user from database:", e)
    }

    // Block inactive users
    if (!isActive) {
      // Sign out and redirect to login
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL("/login?error=account_disabled", request.url))
    }

    // If on login/signup page while authenticated, redirect to role-appropriate dashboard
    if (pathname === "/login" || pathname === "/signup") {
      let home = "/dashboard"
      if (userRole === "investor") home = "/investor/dashboard"
      else if (userRole === "super_admin") home = "/admin"
      return NextResponse.redirect(new URL(home, request.url))
    }

    // Investor users on main app dashboard should go to investor portal
    if (userRole === "investor" && pathname === "/dashboard") {
      return NextResponse.redirect(new URL("/investor/dashboard", request.url))
    }

    // Block super_admins from realtor CRM routes → redirect to /admin
    if (userRole === "super_admin") {
      const isBlockedRoute = superAdminBlockedRoutes.some(
        (route) => pathname === route || pathname.startsWith(route + "/")
      )
      if (isBlockedRoute) {
        return NextResponse.redirect(new URL("/admin", request.url))
      }
    }
    
    // Check if route requires specific role
    for (const [routePrefix, allowedRoles] of Object.entries(roleRoutes)) {
      if (pathname.startsWith(routePrefix)) {
        if (!allowedRoles.includes(userRole)) {
          const fallback = userRole === "investor" ? "/investor/dashboard" : "/dashboard"
          return NextResponse.redirect(new URL(fallback, request.url))
        }
      }
    }

    // Add user context headers for API routes
    if (pathname.startsWith("/api/")) {
      // Clone request headers and add context
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set("x-user-id", userId)
      requestHeaders.set("x-role", userRole)
      requestHeaders.set("x-tenant-id", tenantId)
      if (investorId) {
        requestHeaders.set("x-investor-id", investorId)
      }
      
      // Create new response with modified request headers
      response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
