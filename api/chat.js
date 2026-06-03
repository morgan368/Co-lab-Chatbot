export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    // Direct network call to Anthropic—no npm packages required!
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: messages,
        system: `You are a friendly and helpful vendor support assistant for Co-Lab Incubator Kitchens, located at 201 E 4th Street, Santa Ana, CA 92701. You help food entrepreneurs who are going through the onboarding process or are active members. Be warm, clear, and practical. Answer only from the knowledge base below. If a question is not covered, honestly say you don't have that information and direct the vendor to email Youssef at youssef@co-lab.com.

---

KNOWLEDGE BASE:

INSURANCE:
- Check the welcome email you received when you first joined the Co-Lab permit assistance program. It contains a link to the insurance provider called FLIP (Food Liability Insurance Program).
- The policy must meet these minimums: $1,000,000 per occurrence / $2,000,000 general aggregate.
- Co-Lab Incubator Kitchens (201 E 4th Street, Santa Ana, CA 92701) must be listed as an Additional Insured on the policy.

FOOD MANAGER TRAINING:
- Start as soon as possible — do not wait for your permit to be approved first.
- Accepted certifications: ServSafe or an equivalent county-approved food manager certificate.
- Only one food manager certificate is required per business — not per person.

ONBOARDING VS TFF PERMIT:
- A TFF (Temporary Food Facility) permit is issued by the Orange County Health Department and is required to operate at public markets.`
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Anthropic API Error' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
