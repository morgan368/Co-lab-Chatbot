import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const LOG_FILE = join(tmpdir(), "colab_chat_logs.json");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ADMIN_PASSWORD = process.env.LOGS_PASSWORD || "colab2024";

export default async function handler(req, res) {
  const { password } = req.query;

  // Serve the admin HTML page
  if (req.method === "GET" && !password) {
    res.setHeader("Content-Type", "text/html");
    res.send(getHTML());
    return;
  }

  // Return logs as JSON
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    if (SUPABASE_URL && SUPABASE_KEY) {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_logs?select=*&order=created_at.desc&limit=500`,
        { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
      );
      const logs = await response.json();
      return res.json({ logs, total: logs.length });
    }
    // Fallback to file
    const raw = await fs.readFile(LOG_FILE, "utf8");
    const logs = JSON.parse(raw);
    res.json({ logs: logs.reverse(), total: logs.length });
  } catch {
    res.json({ logs: [], total: 0 });
  }
}

function getHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Co-Lab Chat Logs</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f0;min-height:100vh;padding:2rem 1rem}
.container{max-width:860px;margin:0 auto}
h1{font-size:1.4rem;font-weight:700;margin-bottom:.25rem}
.subtitle{color:#666;font-size:.85rem;margin-bottom:1.5rem}
.login-card{background:#fff;border-radius:12px;padding:2rem;box-shadow:0 2px 12px rgba(0,0,0,.07);max-width:380px}
.login-card h2{font-size:1rem;margin-bottom:1rem}
.input-group{display:flex;gap:.5rem}
input[type=password]{flex:1;border:1.5px solid #e0e0e0;border-radius:8px;padding:.55rem .8rem;font-size:.88rem;outline:none}
input[type=password]:focus{border-color:#1a1a1a}
button{background:#1a1a1a;color:#e8ff47;border:none;border-radius:8px;padding:.55rem 1rem;font-size:.88rem;font-weight:600;cursor:pointer}
button:hover{opacity:.85}
.error{color:#dc2626;font-size:.82rem;margin-top:.5rem}
#logs-section{display:none}
.stats{display:flex;gap:1rem;margin-bottom:1.25rem;flex-wrap:wrap}
.stat-card{background:#fff;border-radius:10px;padding:.9rem 1.2rem;box-shadow:0 2px 8px rgba(0,0,0,.06);flex:1;min-width:140px}
.stat-card .num{font-size:1.6rem;font-weight:700}
.stat-card .label{font-size:.75rem;color:#666;margin-top:2px}
.filter-bar{background:#fff;border-radius:10px;padding:.75rem 1rem;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:1rem;display:flex;gap:.75rem;align-items:center;flex-wrap:wrap}
.filter-bar input[type=text]{border:1.5px solid #e0e0e0;border-radius:8px;padding:.45rem .75rem;font-size:.83rem;outline:none;flex:1}
.refresh-btn{background:#f4f4f0;color:#333;font-weight:500;padding:.45rem .9rem;font-size:.82rem}
.log-list{display:flex;flex-direction:column;gap:.75rem}
.log-card{background:#fff;border-radius:10px;padding:1rem 1.25rem;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.log-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:.65rem;flex-wrap:wrap;gap:.4rem}
.time{font-size:.75rem;color:#888}
.session{font-size:.72rem;background:#f4f4f0;color:#555;padding:2px 8px;border-radius:20px;font-family:monospace}
.log-row{display:flex;gap:.5rem;margin-bottom:.5rem;font-size:.84rem}
.log-row:last-child{margin-bottom:0}
.log-label{font-weight:600;min-width:34px;font-size:.75rem;padding-top:2px;color:#888}
.user-lbl{color:#6366f1}
.bot-lbl{color:#059669}
.log-text{color:#222;line-height:1.5;flex:1}
.empty{text-align:center;padding:3rem;color:#aaa;font-size:.9rem}
.note{font-size:.75rem;color:#aaa;margin-top:1rem;text-align:center}
</style>
</head>
<body>
<div class="container">
<h1>Co-Lab Chat Logs</h1>
<p class="subtitle">Every conversation saved to Supabase</p>
<div id="login-section">
  <div class="login-card">
    <h2>🔒 Enter admin password</h2>
    <div class="input-group">
      <input type="password" id="pwd" placeholder="Password" onkeydown="if(event.key==='Enter')loadLogs()"/>
      <button onclick="loadLogs()">View Logs</button>
    </div>
    <p class="error" id="login-err"></p>
  </div>
</div>
<div id="logs-section">
  <div class="stats">
    <div class="stat-card"><div class="num" id="stat-total">—</div><div class="label">Total messages</div></div>
    <div class="stat-card"><div class="num" id="stat-sessions">—</div><div class="label">Unique sessions</div></div>
    <div class="stat-card"><div class="num" id="stat-today">—</div><div class="label">Today</div></div>
  </div>
  <div class="filter-bar">
    <input type="text" id="search" placeholder="🔍 Search…" oninput="renderLogs()"/>
    <label><input type="checkbox" id="today-only" onchange="renderLogs()"/> Today only</label>
    <button class="refresh-btn" onclick="loadLogs()">↻ Refresh</button>
  </div>
  <div class="log-list" id="log-list"></div>
  <p class="note">Showing most recent 500 messages from Supabase.</p>
</div>
</div>
<script>
let allLogs=[],currentPwd='';
async function loadLogs(){
  const pwd=document.getElementById('pwd')?.value||currentPwd;
  currentPwd=pwd;
  document.getElementById('login-err').textContent='';
  const res=await fetch('/api/admin?password='+encodeURIComponent(pwd));
  if(res.status===401){document.getElementById('login-err').textContent='Incorrect password.';return;}
  const data=await res.json();
  allLogs=data.logs||[];
  document.getElementById('login-section').style.display='none';
  document.getElementById('logs-section').style.display='block';
  const sessions=new Set(allLogs.map(l=>l.session_id)).size;
  const today=new Date().toDateString();
  document.getElementById('stat-total').textContent=allLogs.length;
  document.getElementById('stat-sessions').textContent=sessions;
  document.getElementById('stat-today').textContent=allLogs.filter(l=>new Date(l.created_at).toDateString()===today).length;
  renderLogs();
}
function renderLogs(){
  const q=document.getElementById('search').value.toLowerCase();
  const todayOnly=document.getElementById('today-only').checked;
  const today=new Date().toDateString();
  let f=allLogs.filter(l=>{
    if(todayOnly&&new Date(l.created_at).toDateString()!==today)return false;
    if(q&&!l.user_message?.toLowerCase().includes(q)&&!l.bot_reply?.toLowerCase().includes(q))return false;
    return true;
  });
  const c=document.getElementById('log-list');
  if(!f.length){c.innerHTML='<div class="empty">No messages yet. Send a test message on the chatbot first.</div>';return;}
  c.innerHTML=f.map(l=>{
    const d=new Date(l.created_at);
    const t=d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    return '<div class="log-card"><div class="log-meta"><span class="time">'+t+'</span><span class="session">'+(l.session_id||'').slice(0,16)+'</span></div><div class="log-row"><span class="log-label user-lbl">User</span><span class="log-text">'+esc(l.user_message)+'</span></div><div class="log-row"><span class="log-label bot-lbl">Bot</span><span class="log-text">'+esc((l.bot_reply||'').slice(0,300))+'</span></div></div>';
  }).join('');
}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
setInterval(()=>{if(currentPwd)loadLogs();},30000);
</script>
</body>
</html>`;
}
