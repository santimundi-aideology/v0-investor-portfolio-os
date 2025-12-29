import "server-only";

export async function GET(req: Request) {
  try {
    // Guard: only in dev + super_admin
    const role = req.headers.get("x-role");
    if (process.env.NODE_ENV === "production" || role !== "super_admin") {
      return new Response(null, { status: 404 });
    }

    // Lazy import so NOTHING can throw at module import time
    const { getSupabaseAdminClient } = await import("@/lib/db/client");

    const supabase = getSupabaseAdminClient();

    const results: Record<string, unknown> = {};

    const tenantsRes = await supabase.from("tenants").select("id").limit(1);
    results.tenants = tenantsRes.error ? { ok: false, error: tenantsRes.error } : { ok: true };

    const auditRes = await supabase.from("audit_events").select("event_id").limit(1);
    results.audit_events = auditRes.error ? { ok: false, error: auditRes.error } : { ok: true };

    return Response.json({ ok: true, results }, { status: 200 });
  } catch (err: any) {
    console.error("db-check failed:", err);
    return Response.json(
      {
        ok: false,
        error: err?.message ?? String(err),
        // helpful for Supabase errors
        details: {
          name: err?.name,
          code: err?.code,
          hint: err?.hint,
          details: err?.details,
        },
        env: {
          NODE_ENV: process.env.NODE_ENV,
          hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
          hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        },
      },
      { status: 500 }
    );
  }
}

