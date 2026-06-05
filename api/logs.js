const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ADMIN_PASSWORD = process.env.LOGS_PASSWORD || "colab2024";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { password } = req.query;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_logs?select=*&order=created_at.desc&limit=500`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const logs = await response.json();
    res.json({ logs, total: logs.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
}
