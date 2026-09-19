import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { admitCurrentAuthSession } from "@/features/auth/devices";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const admission = await admitCurrentAuthSession(supabase);
      if (admission === "active") return NextResponse.redirect(new URL("/auth/complete", request.url), { headers: { "Cache-Control": "private, no-store" } });
      await supabase.auth.signOut({ scope: "local" });
      return NextResponse.redirect(new URL(admission === "limit" ? "/sign-in?error=device-limit" : "/sign-in?error=session", request.url), { headers: { "Cache-Control": "private, no-store" } });
    }
  }
  return NextResponse.redirect(new URL("/sign-in?error=callback", request.url), { headers: { "Cache-Control": "private, no-store" } });
}
