import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({
      configured: false,
      available: false,
      reason: "GEMINI_API_KEY не задан (добавьте в Vercel → Settings → Environment Variables)",
    });
  }

  const models = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];
  const genAI = new GoogleGenerativeAI(key);
  const errors: string[] = [];

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("ping");
      const ok = Boolean(result.response.text()?.trim());
      if (ok) {
        return NextResponse.json({
          configured: true,
          available: true,
          model: modelName,
          reason: null,
        });
      }
      errors.push(`${modelName}: empty_response`);
    } catch (e) {
      errors.push(
        `${modelName}: ${e instanceof Error ? e.message : "error"}`
      );
    }
  }

  return NextResponse.json({
    configured: true,
    available: false,
    reason: errors.join(" | ") || "gemini_error",
  });
}
