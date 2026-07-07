import { NextResponse } from "next/server";
import {
  fetchHuaweiMetrics,
  refreshHuaweiToken,
} from "@/lib/health/huawei";

function cookieValue(req: Request, name: string): string | null {
  const v = req.headers
    .get("cookie")
    ?.match(new RegExp(`${name}=([^;]+)`))?.[1];
  return v ? decodeURIComponent(v) : null;
}

export async function GET(req: Request) {
  const secure = process.env.NODE_ENV === "production";
  let accessToken = cookieValue(req, "huawei_access_token");
  const refreshToken = cookieValue(req, "huawei_refresh_token");
  let refreshed:
    | { access_token: string; expires_in: number | undefined }
    | null = null;

  if (!accessToken && refreshToken) {
    try {
      const token = await refreshHuaweiToken(refreshToken);
      accessToken = token.access_token;
      refreshed = { access_token: token.access_token, expires_in: token.expires_in };
    } catch {
      return NextResponse.json(
        { error: "Health token expired; reconnect required" },
        { status: 401 }
      );
    }
  }

  if (!accessToken) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  const metrics = await fetchHuaweiMetrics(accessToken);
  const res = NextResponse.json({ metrics });
  if (refreshed) {
    res.cookies.set("huawei_access_token", refreshed.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: refreshed.expires_in ?? 3600,
    });
  }
  return res;
}
