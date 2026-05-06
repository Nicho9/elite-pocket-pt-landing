import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

type WaitlistRequestBody = {
  name?: unknown;
  email?: unknown;
  referralSource?: unknown;
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isDuplicateEmailError(error: { code?: string } | null) {
  return error?.code === "23505";
}

export async function POST(request: Request) {
  try {
    let body: WaitlistRequestBody;

    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body." }, 400);
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const referralSource =
      typeof body.referralSource === "string" ? body.referralSource.trim() : "";

    if (!name || !email || !referralSource) {
      return jsonResponse(
        { success: false, error: "Name, email and referralSource are required." },
        400,
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !resendApiKey) {
      return jsonResponse(
        { success: false, error: "Waitlist service is not configured." },
        500,
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const resend = new Resend(resendApiKey);

    const { error: insertError } = await supabase.from("landing_waitlist").insert({
      name,
      email,
      referral_source: referralSource,
    });

    if (isDuplicateEmailError(insertError)) {
      return jsonResponse(
        {
          success: false,
          code: "duplicate_email",
          error: "This email is already on the early access list.",
        },
        409,
      );
    }

    if (insertError) {
      console.error("Supabase waitlist insert error:", insertError);
      return jsonResponse(
        { success: false, error: "Could not add you to the waitlist." },
        500,
      );
    }

    const safeName = escapeHtml(name);

    const { error: emailError } = await resend.emails.send({
      from: "Elite Pocket PT <hello@elitepocketpt.com>",
      to: email,
      subject: "You're on the Elite Pocket PT early access list",
      html: `
        <div style="margin:0;padding:0;background:#05070d;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:#05070d;">
            <tr>
              <td align="center" style="padding:32px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;border-collapse:collapse;">
                  <tr>
                    <td style="border:1px solid rgba(255,255,255,0.14);border-radius:28px;background:#0b1220;overflow:hidden;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">
                        <tr>
                          <td align="center" bgcolor="#05070d" style="padding:0;margin:0;background:#05070d;">
                            <img
                              src="https://www.elitepocketpt.com/elite-pocket-pt-email-logo.png?v=2"
                              width="680"
                              alt="Elite Pocket PT"
                              style="display:block;width:680px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;margin:0;padding:0;"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:42px 34px 36px;text-align:center;background:#0b1220;">
                            <p style="margin:0 0 14px;color:#6ea8ff;font-size:12px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;">Elite Pocket PT</p>
                            <h1 style="margin:0;color:#ffffff;font-size:34px;line-height:1.15;font-weight:800;letter-spacing:-0.01em;">You're officially on the early access list.</h1>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0 24px 30px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border-radius:22px;background:#05070d;border:1px solid rgba(110,168,255,0.35);">
                              <tr>
                                <td style="padding:28px 24px;text-align:center;">
                                  <p style="margin:0;color:#ffffff;font-size:23px;line-height:1.25;font-weight:800;">This isn't ChatGPT writing your workouts and meal plans.</p>
                                  <p style="margin:16px auto 0;max-width:520px;color:#cfe0ff;font-size:16px;line-height:1.65;font-weight:400;">Built on 20+ years of elite coaching experience — not assembled by an algorithm.</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0 34px 34px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border-radius:22px;background:#ffffff;">
                              <tr>
                                <td style="padding:32px 28px;color:#111827;">
                                  <p style="margin:0 0 18px;color:#111827;font-size:16px;line-height:1.75;">Hi ${safeName},</p>
                                  <p style="margin:0 0 18px;color:#374151;font-size:16px;line-height:1.75;">You've secured limited early access to Elite Pocket PT, including the 50% lifetime launch offer.</p>
                                  <p style="margin:0 0 18px;color:#374151;font-size:16px;line-height:1.75;">Inside, you'll get a complete training system built around personalised workouts, structured meal plans, daily mobility, coaching feedback, progress tracking and community support.</p>
                                  <p style="margin:0;color:#374151;font-size:16px;line-height:1.75;">We'll send your next steps before launch so you can claim your offer and start with the right system from day one.</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0 34px 38px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border-radius:22px;background:#111827;border:1px solid rgba(255,255,255,0.12);">
                              <tr>
                                <td style="padding:26px 24px;">
                                  <p style="margin:0 0 10px;color:#6ea8ff;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Built by Coach Mike</p>
                                  <p style="margin:0;color:#ffffff;font-size:18px;line-height:1.55;font-weight:700;">M.Sc Sports Nutrition. 20+ years coaching experience.</p>
                                  <p style="margin:12px 0 0;color:#cbd5e1;font-size:15px;line-height:1.7;">The system is built from real-world coaching with athletes and everyday clients, then applied to your goals, schedule and progress.</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0 34px 38px;text-align:center;">
                            <p style="margin:0;color:#ffffff;font-size:16px;font-weight:800;">Elite Pocket PT</p>
                            <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">Built by Coach Mike Nicholson</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      `,
    });

    if (emailError) {
      console.error("Resend confirmation email error:", emailError);
      return jsonResponse(
        { success: false, error: "You were added to the waitlist, but confirmation email failed." },
        502,
      );
    }

    return jsonResponse({ success: true }, 200);
  } catch (error) {
    console.error("Waitlist API error:", error);
    return jsonResponse({ success: false, error: "Unexpected waitlist error." }, 500);
  }
}
