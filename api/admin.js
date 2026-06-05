const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ADMIN_PASSWORD = process.env.LOGS_PASSWORD || "colab2024";

export default async function handler(req, res) {
  const { password } = req.query;

  if (!password) {
    res.setHeader("Content-Type", "text/html");
    return res.send(getHTML());
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_logs?select=*&order=created_at.desc&limit=500`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const logs = await response.json();
    return res.json({ logs: Array.isArray(logs) ? logs : [], total: logs.length || 0 });
  } catch (e) {
    return res.json({ logs: [], total: 0 });
  }
}

function getHTML() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Co-Lab Chat Logs</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f0;min-height:100vh;padding:2rem 1rem}.container{max-width:860px;margin:0 auto}h1{font-size:1.4rem;font-weight:700;margin-bottom:.25rem}.subtitle{color:#666;font-size:.85rem;margin-bottom:1.5rem}.card{background:#fff;border-radius:12px;padding:2rem;box-shadow:0 2px 12px rgba(0,0,0,.07);max-width:380px}.card h2{font-size:1rem;margin-bottom:1rem}.row{display:flex;gap:.5rem}input[type=password]{flex:1;border:1.5px solid #e0e0e0;border-radius:8px;padding:.55rem .8rem;font-size:.88rem;outline:none}input[type=password]:focus{border-color:#1a1a1a}button{background:#1a1a1a;color:#e8ff47;border:none;border-radius:8px;padding:.55rem 1rem;font-size:.88rem;font-weight:600;cursor:pointer}.err{color:#dc2626;font-size:.82rem;margin-top:.5rem}#logs{display:none}.stats{display:flex;gap:1rem;margin-bottom:1.25rem;flex-wrap:wrap}.stat{background:#fff;border-radius:10px;padding:.9rem 1.2rem;box-shadow:0 2px 8px rgba(0,0,0,.06);flex:1;min-width:140px}.stat .n{font-size:1.6rem;font-weight:700}.stat .l{font-size:.75rem;color:#666;margin-top:2px}.bar{background:#fff;border-radius:10px;padding:.75rem 1rem;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:1rem;display:flex;gap:.75rem;align-items:center;flex-wrap:wrap}.bar input{border:1.5px solid #e0e0e0;border-radius:8px;padding:.45rem .75rem;font-size:.83rem;outline:none;flex:1}.rbtn{background:#f4f4f0;color:#333;font-weight:500;padding:.45rem .9rem;font-size:.82rem}.cards{display:flex;flex-direction:column;gap:.75rem}.lcard{background:#fff;border-radius:10px;padding:1rem 1.25rem;box-shadow:0 2px 8px rgba(0,0,0,.06)}.meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:.65rem;flex-wrap:wrap;gap:.4rem}.time{font-size:.75rem;color:#888}.sid{font-size:.72rem;background:#f4f4f0;color:#555;padding:2px 8px;border-radius:20px;font-family:monospace}.lrow{display:flex;gap:.5rem;margin-bottom:.5rem;font-size:.84rem}.lrow:last-child{margin-bottom:0}.lbl{font-weight:600;min-width:34px;font-size:.75rem;padding-top:2px}.ulbl{color:#6366f1}.blbl{color:#059669}.ltxt{color:#222;line-height:1.5;flex:1}.empty{text-align:center;padding:3rem;color:#aaa;font-size:.9rem}</style></head><body><div class="container"><h1>Co-Lab Chat Logs</h1><p class="subtitle">Live from Supabase — auto-refreshes every 30s</p><div id="login"><div class="card"><h2>🔒 Enter admin password</h2><div class="row"><input type="password" id="pwd" placeholder="Password" onkeydown="if(event.key==='Enter')load()"/><button onclick="load()">View</button></div><p class="err" id="err"></p></div></div><div id="logs"><div class="stats"><div class="stat"><div class="n" id="st">—</div><div class="l">Total messages</div></div><div class="stat"><div class="n" id="ss">—</div><div class="l">Unique sessions</div></div><div class="stat"><div class="n" id="sd">—</div><div class="l">Today</div></div></div><div class="bar"><input type="text" id="srch" placeholder="🔍 Search…" oninput="render()"/><button class="rbtn" onclick="load()">↻ Refresh</button></div><div class="cards" id="list"></div></div></div><script>let all=[],pwd='';async function load(){const p=document.getElementById('pwd')?.value||pwd;pwd=p;document.getElementById('err').textContent='';try{const r=await fetch('/api/admin?password='+encodeURIComponent(p));if(r.status===401){document.getElementById('err').textContent='Wrong password';return;}const d=await r.json();all=d.logs||[];document.getElementById('login').style.display='none';document.getElementById('logs').style.display='block';const today=new Date().toDateString();document.getElementById('st').textContent=all.length;document.getElementById('ss').textContent=new Set(all.map(l=>l.session_id)).size;document.getElementById('sd').textContent=all.filter(l=>new Date(l.created_at).toDateString()===today).length;render();}catch(e){document.getElementById('err').textContent='Connection error: '+e.message;}}function render(){const q=document.getElementById('srch').value.toLowerCase();const f=all.filter(l=>!q||l.user_message?.toLowerCase().includes(q)||l.bot_reply?.toLowerCase().includes(q));const c=document.getElementById('list');if(!f.length){c.innerHTML='<div class="empty">No messages yet — send a test message on the chatbot first.</div>';return;}c.innerHTML=f.map(l=>{const t=new Date(l.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});return '<div class="lcard"><div class="meta"><span class="time">'+t+'</span><span class="sid">'+(l.session_id||'').slice(0,16)+'</span></div><div class="lrow"><span class="lbl ulbl">User</span><span class="ltxt">'+e(l.user_message)+'</span></div><div class="lrow"><span class="lbl blbl">Bot</span><span class="ltxt">'+e((l.bot_reply||'').slice(0,300))+'</span></div></div>';}).join('');}function e(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}setInterval(()=>{if(pwd)load();},30000);</script></body></html>`;
}
