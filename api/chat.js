import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { messages } = req.body;
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1000,
    system: `You are a friendly support assistant for a Permit Assistance Program that helps clients file TFF permits through OCHD. Answer questions about: insurance submission, training timing, onboarding vs TFF application, app review fees, deposit fees, adding menu items after approval, and equipment rental. Keep answers concise and friendly. If you can't answer, offer to schedule a call with the coordinator.`,
    messages
  });
  res.json({ reply: response.content[0].text });
}
