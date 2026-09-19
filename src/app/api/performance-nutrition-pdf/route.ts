import { Buffer } from "node:buffer";

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

import { generatePerformanceNutritionPdfBytes, PDF_FILENAME } from "../../../lib/performanceNutritionPdf";
import type { PerformanceNutritionAssessmentResult } from "../../../lib/performanceNutritionAssessment";
import { readFreeWebinarRegistrationSession } from "../../../lib/freeWebinarRegistrationSession";

export const runtime = "nodejs";

const PERFORMANCE_NUTRITION_WEBINAR_SLUG = "an-introduction-to-performance-nutrition";

type RequestBody = { assessmentResult?: unknown };

function jsonResponse(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status });
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" && token?.trim() ? token.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasNumbers(record: Record<string, unknown>, keys: string[]) {
  return keys.every((key) => typeof record[key] === "number" && Number.isFinite(record[key]));
}

function hasStrings(record: Record<string, unknown>, keys: string[]) {
  return keys.every((key) => typeof record[key] === "string" && record[key].trim().length > 0);
}

function isAssessmentResult(value: unknown): value is PerformanceNutritionAssessmentResult {
  if (!isRecord(value)) return false;
  const inputs = value.inputs;
  const calories = value.calories;
  const macros = value.macros;
  const aminoAcids = value.aminoAcids;
  const referenceTargets = value.referenceTargets;
  const postWorkout = value.postWorkout;

  if (
    !isRecord(inputs) ||
    !isRecord(calories) ||
    !isRecord(macros) ||
    !isRecord(aminoAcids) ||
    !isRecord(referenceTargets) ||
    !isRecord(postWorkout)
  ) {
    return false;
  }

  return (
    hasStrings(inputs, ["sex", "goal", "dailyActivity", "sessionDuration", "intensity", "multipleSessions", "dietType", "sweatProfile", "trainingEnvironment"]) &&
    hasNumbers(inputs, ["age", "heightCm", "weightKg", "sessionsPerWeek"]) &&
    hasStrings(calories, ["activityBand", "goalAdjustmentLabel"]) &&
    hasNumbers(calories, ["rmr", "activityScore", "multiplier", "estimatedTdee", "goalAdjustment", "suggestedCalories"]) &&
    hasStrings(macros, ["carbohydrateInterpretation"]) &&
    hasNumbers(macros, ["proteinG", "proteinGPerKg", "carbohydrateG", "carbohydrateGPerKg", "fatG", "fatGPerKg", "proteinPerMealMinG", "proteinPerMealMaxG"]) &&
    typeof macros.carbohydrateWarning === "boolean" &&
    hasNumbers(aminoAcids, ["dailyLeucineMinG", "dailyLeucineMaxG", "leucinePerMealMinG", "leucinePerMealMaxG", "postWorkoutLeucineG", "estimatedBcaaMinG", "estimatedBcaaMaxG"]) &&
    hasNumbers(referenceTargets, ["fibreG", "calciumMg", "ironMg", "vitaminDMcg", "vitaminDIu", "magnesiumMg", "potassiumMg"]) &&
    typeof referenceTargets.plantBasedIronNote === "boolean" &&
    typeof referenceTargets.veganB12Note === "boolean" &&
    hasStrings(postWorkout, ["carbohydrateLabel", "hydrationGuidance"]) &&
    hasNumbers(postWorkout, ["proteinG", "leucineG", "carbohydrateMinGPerKg", "carbohydrateMaxGPerKg", "carbohydrateMinG", "carbohydrateMaxG"])
  );
}

function emailHtml() {
  return [
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#0b1220;line-height:1.65;">',
    "<p>Thanks for completing the Elite Pocket PT Performance Nutrition assessment.</p>",
    "<p>Your personalised Performance Nutrition Starting Point is attached.</p>",
    "<p>It includes your:</p>",
    "<ul>",
    "<li>estimated daily calorie target</li>",
    "<li>personalised protein, carbohydrate and fat targets</li>",
    "<li>protein-per-meal guidance</li>",
    "<li>leucine guidance</li>",
    "<li>key micronutrient reference targets</li>",
    "<li>post-workout nutrition recommendations</li>",
    "<li>hydration and electrolyte guidance</li>",
    "</ul>",
    "<p>These are evidence-based starting points based on the information you provided and should be adjusted according to training, recovery and real-world response.</p>",
    "<p>Coach Mike Nicholson<br />M.Sc Sports Nutrition<br />Performance Dietitian<br />Elite Pocket PT</p>",
    "</div>",
  ].join("");
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.SB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SB_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !resendApiKey) {
    console.error("Performance nutrition PDF email service is not configured.");
    return jsonResponse({ success: false, error: "We couldn't email your PDF." }, 500);
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid request." }, 400);
  }

  if (!isAssessmentResult(body.assessmentResult)) {
    return jsonResponse({ success: false, error: "Invalid assessment result." }, 400);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const token = readBearerToken(request);
  let recipientEmail = "";

  if (token) {
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (!userError) {
      recipientEmail = userData.user?.email?.trim().toLowerCase() || "";
    }
  }

  if (!recipientEmail) {
    const freeWebinarSession = readFreeWebinarRegistrationSession(request);

    if (freeWebinarSession?.slug === PERFORMANCE_NUTRITION_WEBINAR_SLUG) {
      recipientEmail = freeWebinarSession.email;
    }
  }

  if (!recipientEmail) {
    console.error("Performance nutrition PDF email authentication failed.");
    return jsonResponse({ success: false, error: "Your session could not be verified." }, 401);
  }

  try {
    const pdfBytes = generatePerformanceNutritionPdfBytes(body.assessmentResult);
    const resend = new Resend(resendApiKey);
    const { error: emailError } = await resend.emails.send({
      from: "Elite Pocket PT <hello@elitepocketpt.com>",
      to: recipientEmail,
      subject: "Your Performance Nutrition Starting Point",
      html: emailHtml(),
      attachments: [{ filename: PDF_FILENAME, content: Buffer.from(pdfBytes), contentType: "application/pdf" }],
    });

    if (emailError) {
      console.error("Performance nutrition PDF email delivery failed.");
      return jsonResponse({ success: false, error: "We couldn't email your PDF." }, 502);
    }
  } catch {
    console.error("Performance nutrition PDF email generation failed.");
    return jsonResponse({ success: false, error: "We couldn't email your PDF." }, 500);
  }

  return jsonResponse({ success: true, email: recipientEmail }, 200);
}
