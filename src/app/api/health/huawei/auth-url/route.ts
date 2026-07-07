import { NextResponse } from "next/server";
import { buildHuaweiAuthUrl, getHuaweiConfig } from "@/lib/health/huawei";

export async function GET() {
  const secure = process.env.NODE_ENV === "production";
  const cfg = getHuaweiConfig();
  if (!cfg.clientId || !cfg.clientSecret || !cfg.redirectUri) {
    return NextResponse.json(
      { error: "Huawei OAuth is not configured on server" },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();
  const url = buildHuaweiAuthUrl(state);
  const res = NextResponse.json({ url });
  res.cookies.set("huawei_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
