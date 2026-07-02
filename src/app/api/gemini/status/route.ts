import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ configured: false, available: false, reason: "no_key" });
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent("pong");
    const ok = Boolean(result.response.text());
    return NextResponse.json({
      configured: true,
      available: ok,
      reason: ok ? null : "empty_response",
    });
  } catch (e) {
    return NextResponse.json({
      configured: true,
      available: false,
      reason: e instanceof Error ? e.message : "gemini_error",
    });
  }
}
