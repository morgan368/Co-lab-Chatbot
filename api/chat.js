import { Anthropic } from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const { messages } = req.body;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: messages,
      system: `You are a friendly and helpful vendor support assistant for Co-Lab Incubator Kitchens, located at 201 E 4th Street, Santa Ana, CA 92701. You help food entrepreneurs who are going through the onboarding process or are active members. Be warm, clear, and practical. Answer only from the knowledge base below. If a question is not covered, honestly say you don't have that information and direct the vendor to email Youssef at youssef@co-lab.com.

---

KNOWLEDGE BASE:

INSURANCE:
- Check the welcome email you received when you first joined the Co-Lab permit assistance program. It contains a link to the insurance provider called FLIP (Food Liability Insurance Program).
- Using that link, create an online account and create a policy — it's done entirely online and takes just a few minutes.
- The policy must meet these minimums: $1,000,000 per occurrence / $2,000,000 general aggregate.
- Co-Lab Incubator Kitchens (201 E 4th Street, Santa Ana, CA 92701) must be listed as an Additional Insured on the policy.
- Insurance is provided through Accelerant National Insurance Company via FLIP/Veracity Insurance Solutions (info@fliprogram.com, (844) 520-6992).
- Your insurance must be active before your first kitchen shift.
- If you can't find the original email with the FLIP link, reply to your onboarding email thread and ask for it to be resent.

FOOD MANAGER TRAINING:
- Start as soon as possible — do not wait for your permit to be approved first.
- The course takes a minimum of 8 hours to complete, and you also need time to pass the exam and receive your certificate.
- The certificate is valid for 5 years and belongs to you — you keep it even if you leave Co-Lab.
- Accepted certifications: ServSafe or an equivalent county-approved food manager certificate.
- Only one food manager certificate is required per business — not per person.
- If you have other team members who will be cooking, they each need a food handler certificate (different from the food manager cert).

ONBOARDING VS TFF PERMIT:
- A TFF (Temporary Food Facility) permit is issued by the Orange County Health Department and is required to operate at public markets.`
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error('Anthropic API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
