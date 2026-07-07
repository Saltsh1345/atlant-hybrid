import { NextResponse } from "next/server";
import { exchangeHuaweiCode } from "@/lib/health/huawei";

export async function GET(req: Request) {
  const secure = process.env.NODE_ENV === "production";
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  if (err) {
    return NextResponse.redirect(new URL(`/?healthError=${err}`, url.origin));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/?healthError=missing_code", url.origin));
  }

  const expectedState = req.headers
    .get("cookie")
    ?.match(/huawei_oauth_state=([^;]+)/)?.[1];
  if (!expectedState || expectedState !== state) {
    return NextResponse.redirect(new URL("/?healthError=bad_state", url.origin));
  }

  try {
    const token = await exchangeHuaweiCode(code);
    const res = NextResponse.redirect(
      new URL("/?healthConnected=1", url.origin)
    );
    res.cookies.set("huawei_access_token", token.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: token.expires_in ?? 3600,
    });
    if (token.refresh_token) {
      res.cookies.set("huawei_refresh_token", token.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    res.cookies.set("huawei_oauth_state", "", {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch {
    return NextResponse.redirect(
      new URL("/?healthError=exchange_failed", url.origin)
    );
  }
}
