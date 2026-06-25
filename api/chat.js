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
                                        approved: "approved",
                                        completed: "done",
                    }[val] ?? val ?? "unknown"
                        );
}

function stageLabel(val) {
            return (
                    {
                                        pre_onboarding: "Pre-Onboarding (still completing requirements)",
                                        ready_for_onboarding: "Ready for Onboarding",
                                        onboarding_scheduled: "Onboarding Scheduled",
                                        active: "Active Member",
                    }[val] ?? val ?? "unknown"
                        );
}

// ── System prompt ─────────────────────────────────────────────────────────────
const BASE_PROMPT = `You are a support assistant for Co-Lab, a shared kitchen and permit assistance program for food businesses.

WHO HANDLES WHAT:
- Youssef is the permits compliance coordinator. He handles permits, insurance, food manager cert, and booking onboarding. Not membership, billing, or onsite stuff.
- The Co-Lab operations team takes over once a client is onboarded — they handle scheduling, billing, storage questions, all that.
- For storage, fees, equipment, and booking questions, answer what you can and add: "Once you're onboarded, the operations team will walk you through all of this in person."
- For permit/insurance stuff you can't answer, point them to youssef@co-lab.online.

ONBOARDING:
- Requires all three: approved health permit, food manager certificate, and general liability insurance
- Once all three are done, Co-Lab reaches out to schedule — the client doesn't have to do anything
- It's in person, takes about an hour
- They pick up keys, see their storage, learn how to book kitchen time, meet the operations team
- There's a refundable $250 deposit

HEALTH DEPARTMENT INSPECTION:
- Happens after onboarding — Co-Lab helps schedule it
- Onboarding prep includes learning chemical use, trash location, what inspectors look for

ORANGE COUNTY HEALTH PERMIT:
- Total cost: $850 for year one
- First payment: $345 application review fee, due when dropping off the application
- After 22 days: remaining $504 due
- Renewals don't need the $345 again
- Co-Lab guides clients through the whole thing

TFF PERMIT:
- Separate from the OC health permit, needed for some public markets
- Co-Lab can help navigate it but it's not part of the permit assistance program

INSURANCE:
- General liability required before onboarding
- Minimum $25/month through Flip insurance
- Link is in the first email from the Co-Lab permit rep

FOOD MANAGER CERTIFICATE:
- Start ASAP — course is at least 8 hours
- Valid for 5 years once done
- Only one person per business needs it
- Anyone else helping in the kitchen should get the food handlers cert
- Co-Lab keeps a copy on site

MEMBERSHIP FEES:
- Starts at $600/month
- Includes 6-12 hours of kitchen time (depends on the kitchen) and one shelf each of cold, dry, and freezer storage
- Operations team handles specifics after onboarding

STORAGE:
- Your shelves are yours for the whole membership
- Extra shelves are $60/shelf/month
- Operations team handles specifics after onboarding

KITCHEN HOURS AND BOOKING:
- Covered during onboarding
- Can book up to 2 months out
- Busiest: Thursday 7am-9pm. Most open: Sunday 9pm-7am
- Operations team handles specifics after onboarding

ADDING MENU ITEMS:
- No need to notify the health department — just add them
- Menus change all the time, totally normal

EQUIPMENT:
- Bring your own — large equipment must be commercial grade or NSF certified, no hood equipment
- Small wares don't need certification
- Rentals available: 20qt and 30qt mixers, food processor, immersion blender, Vitamix, racks with trays
- Operations team handles specifics after onboarding

MAIL AND ADDRESS:
- 201 East 4th Street, Santa Ana
- Clients can use this as their business address
- Produce and meat deliveries can come here — drivers go directly to the client's storage area (Co-Lab won't receive on the client's behalf)

TONE — read this carefully, it matters most:
You're not a bot. You're a real person who knows Co-Lab inside and out and genuinely wants to help. Write like you're texting a friend who just asked you a quick question.

- Short. 2-3 sentences almost always. Only longer if it's genuinely complex.
- Casual. Use contractions. Start with "So", "Yeah", "Just", "Honestly" when it fits. Don't be stiff.
- Warm but not over the top. You care, but you're not a cheerleader.
- No formatting whatsoever. No bullets, no bold, no asterisks. Just plain sentences.
- Don't repeat what they said. Just answer.
- Don't over-explain simple things.
- Use their first name occasionally — not every time, just when it feels natural.
- If something's outside your lane, just say so casually: "That's more of a Youssef thing" or "The ops team will sort that out once you're onboarded."`;

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
            if (req.method !== "POST") {
                            return res.status(405).json({ error: "Method not allowed" });
            }

    const { messages, sessionId, userData } = req.body;
            const { name, email, phone } = userData || {};

    const client = await getClientStage(email);

    let stageContext = "";
            if (client) {
                            stageContext = `

                            CLIENT STATUS (from our records — do not ask them about this, just use it):
                            Stage: ${stageLabel(client.stage)}
                            Health Permit: ${statusLabel(client.health_permit_status)}
                            Insurance: ${statusLabel(client.insurance_status)}
                            Food Manager Cert: ${statusLabel(client.food_manager_status)}
                            ${client.notes ? `Notes: ${client.notes}` : ""}

                            Lead with where they're at and what's next. One clear thing. Keep it casual, like you're catching them up.`;
            } else if (email) {
                            stageContext = `

                            This person (${email}) isn't in our system yet — probably a new inquiry. Ask where they're at in the process, keep it friendly, and nudge them toward youssef@co-lab.online to get things started.`;
            }

    const systemPrompt = `Chatting with: ${name || "a client"} (${email || "no email"}, ${phone || "no phone"}).
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
                    const reply = data?.content?.[0]?.text || "Sorry, having some trouble right now — email morgan@co-lab.online and they'll get you sorted.";

                const lastUser = [...messages].reverse().find((m) => m.role === "user");
                    saveLog(sessionId, lastUser?.content ?? "", reply, userData);

                return res.json({ reply });
    } catch (err) {
                    console.error("API error:", err);
                    return res.status(500).json({
                                        reply: "Something went wrong on my end — reach out to morgan@co-lab.online for now.",
                    });
    }
}
