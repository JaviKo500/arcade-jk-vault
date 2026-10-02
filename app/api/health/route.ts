import { createClient } from "@/lib/supabase/server";

type HealthSuccessResponse = { ok: true };
type HealthErrorResponse = { ok: false; error: "missing_env" | "rpc_failed" };

export async function GET() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return Response.json(
      { ok: false, error: "missing_env" } satisfies HealthErrorResponse,
      { status: 503 },
    );
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("health_check");

    if (error || data !== true) {
      console.error("[health] health_check RPC failed:", error ?? { data });
      return Response.json(
        { ok: false, error: "rpc_failed" } satisfies HealthErrorResponse,
        { status: 503 },
      );
    }
  } catch (err) {
    // e.g. malformed NEXT_PUBLIC_SUPABASE_URL makes the client throw.
    console.error("[health] health_check RPC failed:", err);
    return Response.json(
      { ok: false, error: "rpc_failed" } satisfies HealthErrorResponse,
      { status: 503 },
    );
  }

  return Response.json({ ok: true } satisfies HealthSuccessResponse);
}
