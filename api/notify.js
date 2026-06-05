const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { name, email, phone, sessionId } = req.body;

  // Save to Supabase sessions table
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/chat_sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ session_id: sessionId, name, email, phone }),
    });
  } catch (e) {}

  // Send email via Resend (free tier)
  try {
    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (RESEND_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_KEY}`,
        },
        body: JSON.stringify({
          from: "Co-Lab Bot <onboarding@resend.dev>",
          to: ["morgan@co-lab.online"],
          subject: `New chat started — ${name}`,
          html: `
            <h2>New visitor on Co-Lab Support</h2>
            <table style="font-family:sans-serif;font-size:15px;border-collapse:collapse;">
              <tr><td style="padding:6px 16px 6px 0;color:#666;">Name</td><td style="padding:6px 0;font-weight:600;">${name}</td></tr>
              <tr><td style="padding:6px 16px 6px 0;color:#666;">Email</td><td style="padding:6px 0;"><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding:6px 16px 6px 0;color:#666;">Phone</td><td style="padding:6px 0;"><a href="tel:${phone}">${phone}</a></td></tr>
              <tr><td style="padding:6px 16px 6px 0;color:#666;">Session</td><td style="padding:6px 0;font-family:monospace;font-size:12px;">${sessionId}</td></tr>
            </table>
            <p style="margin-top:16px;font-family:sans-serif;font-size:14px;color:#666;">
              <a href="https://project-xlvti.vercel.app/api/admin">View full chat logs →</a>
            </p>
          `,
        }),
      });
    }
  } catch (e) {}

  res.json({ ok: true });
}
