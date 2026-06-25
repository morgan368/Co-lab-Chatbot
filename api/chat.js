const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// ── Supabase REST helper ──────────────────────────────────────────────────────
async function supabaseGet(table, params) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
          headers: {
                  apikey: SUPABASE_KEY,
                  Authorization: `Bearer ${SUPABASE_KEY}`,
                  Accept: "application/json",
          },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows[0] || null : null;
}

// ── Save chat log ─────────────────────────────────────────────────────────────
async function saveLog(sessionId, userMessage, botReply, userData) {
    try {
          await fetch(`${SUPABASE_URL}/rest/v1/chat_logs`, {
                  method: "POST",
                  headers: {
                            "Content-Type": "application/json",
                            apikey: SUPABASE_KEY,
                            Authorization: `Bearer ${SUPABASE_KEY}`,
                            Prefer: "return=minimal",
                  },
                  body: JSON.stringify({
                            session_id: sessionId || "unknown",
                            user_message: userMessage,
                            bot_reply: botReply,
                            user_name: userData?.name || null,
                            user_email: userData?.email || null,
                            user_phone: userData?.phone || null,
                  }),
          });
    } catch (err) {
          console.error("Supabase log error:", err);
    }
}

// ── Look up client stage by email ─────────────────────────────────────────────
async function getClientStage(email) {
    if (!email) return null;
    try {
          return await supabaseGet("clients", {
                  email: `eq.${email.toLowerCase().trim()}`,
                  select: "email,name,phone,health_permit_status,insurance_status,food_manager_status,stage,notes",
                  limit: 1,
          });
    } catch (err) {
          console.error("Client lookup error:", err);
          return null;
    }
}

// ── Status label helper ───────────────────────────────────────────────────────
function statusLabel(val) {
    return (
      {
              not_started: "not started yet",
              in_progress: "in progress",
              approved: "approved ✓",
              completed: "completed ✓",
      }[val] ?? val ?? "unknown"
        );
}

function stageLabel(val) {
    return (
      {
              pre_onboarding: "Pre-Onboarding (still completing requirements)",
              ready_for_onboarding: "Ready for Onboarding — all three requirements are done, awaiting scheduling",
              onboarding_scheduled: "Onboarding Scheduled",
              active: "Active Member",
      }[val] ?? val ?? "unknown"
        );
}

// ── System prompt ─────────────────────────────────────────────────────────────
const BASE_PROMPT = `You are a friendly support assistant for Co-Lab, a permit assistance program that helps clients get their food business up and running.
WHO HANDLES WHAT:
- Youssef is the permits compliance coordinator. He helps clients get their permits, insurance, food manager certificate, and get their onboarding booked. He does NOT handle membership questions, booking questions, or any onsite inquiries.
- The Co-Lab operations team are the go-to representatives for everything once the client finishes the permit assistance process. During onboarding, clients will meet the operations team who will support them from that point forward.
- For questions about storage, membership fees, equipment, kitchen booking, and onsite topics, always end your answer by saying: "Once you are onboarded, you will get hands-on support from our operations team regarding these specific questions."
- For questions outside your knowledge that relate to permits, insurance, or the application process, direct the client to youssef@co-lab.online.
ONBOARDING:
- Onboarding happens AFTER the client has completed all three requirements: full approved permit, food manager certificate, and general liability insurance
- Once all three are complete, the Co-Lab team will reach out to get the client scheduled clients do not need to worry about scheduling it themselves
- Onboarding is in person and takes about one hour
- It is required to be in person the client needs to pick up their keys, see their storage, and be prepared for a health department inspection
- During onboarding the Co-Lab team shows the client their storage, how to book kitchen time, how to use chemicals, where the trash is, and more
- Onboarding is also the time to meet the operations team, who handle all booking and billing needs going forward
- There is a refundable onboarding deposit of $250
HEALTH DEPARTMENT INSPECTION:
- After onboarding, Co-Lab helps the client schedule their inspection with the health department
- Part of onboarding is preparing the client to pass showing them how to use chemicals, where the trash is, and what the health department will look for
ORANGE COUNTY HEALTH PERMIT:
- The total cost of the Orange County health permit is $850 for the first year
- The first payment is $345, which is the application review fee due when the permit application is dropped off at the health department
- After 22 days, the remaining balance of $504 is due
- If the client renews their permit, they do not need to pay the $345 application review fee again
- Co-Lab helps clients through this entire process as part of the permit assistance program
TFF PERMIT:
- The TFF (Temporary Food Facility) permit is a separate permit sometimes required to sell at public markets
- It is temporary and separate from the Orange County health permit
- Co-Lab can help clients navigate the TFF process, but it does not fall under the permit assistance program
INSURANCE:
- Clients need general liability insurance before they can complete onboarding
- The minimum cost is $25/month through Flip insurance
- To get enrolled, clients should check their first email from the Co-Lab permit rep it contains a link to the Flip insurance page to get signed up
- Clients can add more coverage if they want
FOOD MANAGER CERTIFICATE:
- Clients should start training as soon as possible
- The course takes at least 8 hours to complete
- Once completed, the certificate is valid for 5 years
- Only one person in the business is required to have the food manager certificate
- Anyone helping in the kitchen is recommended to also get their food handlers certificate
- Co-Lab only helps clients obtain the food manager certificate
- The health department will do regular inspections and will ask to see the food manager certificate
- Co-Lab keeps a copy of the food manager certificate on site for the client
MEMBERSHIP FEES:
- The minimum monthly rate is $600 per month
- That includes 6 to 12 hours of kitchen time, depending on which kitchen the client cooks in
- It also includes one shelf each of cold, dry, and freezer storage
- Once you are onboarded, you will get hands-on support from our operations team regarding these specific questions
STORAGE:
- Storage shelves are the client's for the entire duration of their membership
- Additional shelves beyond what is included are $60 per shelf per month
- Once you are onboarded, you will get hands-on support from our operations team regarding these specific questions
KITCHEN HOURS AND BOOKING:
- During onboarding, clients will be shown how to book kitchen hours and how to request a schedule
- Clients can request time up to 2 months in advance, which helps with production planning
- The busiest day is currently Thursday prime time hours are 7am to 9pm
- The slowest day is Sunday the most open slots are generally 9pm to 7am
- For specific questions about kitchen scheduling and booking, please wait until onboarding so you can speak directly with the operations team
- Once you are onboarded, you will get hands-on support from our operations team regarding these specific questions
ADDING MENU ITEMS:
- Menu items can be added after the permit is approved
- Clients do not need to inform the health department, since the food is already in alignment with what they are approved to cook
- Menus change often and this is completely normal
EQUIPMENT:
- Clients can bring their own equipment to use at Co-Lab
- Large equipment must be commercial grade or NSF certified
- Equipment cannot require fitting under a ventilation hood
- Small wares such as bowls and small items do not need to be NSF certified
- Co-Lab also has equipment available to rent: 20qt and 30qt mixers, food processor, immersion blender, Vitamix, and equipment racks with trays
- Once you are onboarded, you will get hands-on support from our operations team regarding these specific questions
MAIL AND ADDRESS:
- Co-Lab's address is 201 East 4th Street Santa Ana
- Clients can set up their business address at the 4th Street Market location
- Produce and meat deliveries can be sent to Co-Lab
- Co-Lab will not receive product on the client's behalf, but delivery drivers can go directly to the client's storage area
GENERAL GUIDANCE:
- Always be warm, friendly, and clear many clients are first-time food business owners.
- Always address the user by their first name when appropriate.
- Youssef is the permits compliance coordinator. He guides clients through permits, insurance, food manager certificate, and getting onboarding booked. He does not handle membership, booking, or onsite questions.
- The Co-Lab operations team will be the client's go-to representatives once they finish the permit assistance process.
- For permit and application questions you cannot answer, direct the client to morgan@co-lab.online.`;

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
    if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
    }

  const { messages, sessionId, userData } = req.body;
    const { name, email, phone } = userData || {};

  // Look up this client's current stage from the clients table
  const client = await getClientStage(email);

  let stageContext = "";
    if (client) {
          stageContext = `

          VERIFIED CLIENT STATUS — pulled from our records by email. Do NOT ask whether they have started. Open by telling them exactly where they are and what their next step is.

          Current stage: ${stageLabel(client.stage)}
          - Orange County Health Permit: ${statusLabel(client.health_permit_status)}
          - General Liability Insurance: ${statusLabel(client.insurance_status)}
          - Food Manager Certificate: ${statusLabel(client.food_manager_status)}
          ${client.notes ? `- Internal notes: ${client.notes}` : ""}

          Use this information to lead with where the client stands and give them one clear, specific next action. If all three requirements are approved/completed, let them know they are ready and that the Co-Lab team will be in touch to schedule onboarding.`;
    } else if (email) {
          stageContext = `

          This client (${email}) is not yet in our system — they are likely a new inquiry or have not yet started the process. Ask them where they are in the process and encourage them to reach out to youssef@co-lab.online to get set up.`;
    }

  const systemPrompt = `You are chatting with: ${name || "a client"} (email: ${email || "unknown"}, phone: ${phone || "not provided"}).
  ${stageContext}

  ${BASE_PROMPT}`;

  try {
        const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                          "Content-Type": "application/json",
                          "x-api-key": process.env.ANTHROPIC_API_KEY,
                          "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                          model: "claude-opus-4-5",
                          max_tokens: 1024,
                          system: systemPrompt,
                          messages: messages.map((m) => ({ role: m.role, content: m.content })),
                }),
        });

      const data = await apiRes.json();
        const reply = data?.content?.[0]?.text || "Sorry, I couldn't generate a response. Please email morgan@co-lab.online for help.";

      // Save log non-blocking
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
        saveLog(sessionId, lastUser?.content ?? "", reply, userData);

      return res.json({ reply });
  } catch (err) {
        console.error("API error:", err);
        return res.status(500).json({
                reply: "Sorry, I'm having trouble responding right now. Please email morgan@co-lab.online for immediate help.",
        });
  }
}
