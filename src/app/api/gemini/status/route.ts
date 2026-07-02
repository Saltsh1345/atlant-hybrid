import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODELS } from "@/lib/ai/geminiModels";

export async function GET() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({
      configured: false,
      available: false,
      reason: "GEMINI_API_KEY не задан (Vercel → Settings → Environment Variables)",
    });
  }

  const genAI = new GoogleGenerativeAI(key);
  const errors: string[] = [];

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("ok");
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
