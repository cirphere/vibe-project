import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

function getBaseUrl(request: Request): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    return siteUrl;
  }
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const baseUrl = getBaseUrl(request);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(baseUrl);
    }
    logger.error("auth_callback:code_exchange", error);
  } else {
    logger.warn("auth_callback:missing_code");
  }

  return NextResponse.redirect(`${baseUrl}/login`);
}
