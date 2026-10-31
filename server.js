const http = require("node:http");
const os = require("node:os");
const fs = require("node:fs");

const PORT = Number(process.env.PORT || 3000);
const WAM_WALLET = process.env.WAM_WALLET || "wam1qch64hevyaz5lgwjfm9vv487hemev4g2qssfksc";
const WAM_STATUS_URL = process.env.WAM_STATUS_URL || "http://172.18.0.1:9557/status";
const WAM_LOG_FILE = process.env.WAM_LOG_FILE || "/app/wam-miner-logs.json";
const MINER_SERVICE = process.env.WAM_MINER_SERVICE || "wam-miner.service";
const POOL_MINER_URL = process.env.WAM_POOL_MINER_URL || "https://pool.wamcoin.org/api/miner";
const REFRESH_MS = Math.max(5000, Number(process.env.DASHBOARD_REFRESH_MS || 10000));

const page = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#f7f9fc"><title>WAM Coin | Minerador VPS</title>
<style>
:root{color-scheme:light;--bg:#f7f9fc;--surface:#fff;--surface2:#f4f7fb;--border:#e5eaf1;--text:#162238;--muted:#68778f;--green:#0ca765;--green2:#e5f7ef;--blue:#2875e8;--blue2:#edf4ff;--orange:#f28a18;--orange2:#fff4e6;--red:#dc3545;--shadow:0 2px 10px #1e35500a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif}
.app{min-height:100vh;display:grid;grid-template-columns:220px minmax(0,1fr)}aside{background:#fff;border-right:1px solid var(--border);padding:20px 13px;display:flex;flex-direction:column;min-height:100vh;position:sticky;top:0;height:100vh}
.brand{display:flex;align-items:center;gap:10px;padding:0 9px 25px}.logo{width:40px;height:40px;border-radius:12px;background:linear-gradient(145deg,#ff9a2f,#f26a25);display:grid;place-items:center;font-weight:900;font-size:23px;color:#172238}.brand strong{display:block;font-size:17px}.brand small{color:var(--muted);font-size:11px}
nav{display:grid;gap:5px}.nav{border:0;background:transparent;text-align:left;padding:11px 12px;border-radius:9px;color:#34435d;font:inherit;cursor:pointer;display:flex;gap:11px;align-items:center}.nav.active{background:var(--green2);color:#087c4a;font-weight:700}.nav span{font-size:17px;width:20px;text-align:center}.sidebottom{margin-top:auto;padding:12px 7px 4px;font-size:12px;color:var(--muted);line-height:1.7}.online{display:inline-block;width:9px;height:9px;border-radius:50%;background:#0ca765;margin-right:7px}.offline{background:#d97706}
main{min-width:0}.topbar{height:58px;background:#ffffffed;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:flex-end;gap:18px;padding:0 24px;position:sticky;top:0;z-index:2}.topmuted{font-size:11px;color:var(--muted)}.topvalue{font-size:12px;font-weight:600}.toggle{border:1px solid var(--border);background:#fff;border-radius:9px;padding:7px 10px;cursor:pointer;color:var(--text)}
.content{max-width:1600px;margin:auto;padding:22px 24px 35px}.pagehead{display:flex;align-items:flex-end;justify-content:space-between;gap:15px;margin:0 0 18px}.pagehead h1{font-size:25px;margin:0 0 5px}.pagehead p{margin:0;color:var(--muted);font-size:12px}
.btn{border:1px solid var(--border);background:#fff;color:var(--text);padding:9px 12px;border-radius:9px;cursor:pointer;font:inherit}.btn:hover,.toggle:hover{background:var(--surface2)}
.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}.card,.panel{background:var(--surface);border:1px solid var(--border);border-radius:11px;box-shadow:var(--shadow);min-width:0}.card{padding:16px 17px;min-height:116px}.metrichead{display:flex;align-items:center;gap:10px;color:#40516c;font-size:12px}.ico{width:34px;height:34px;display:grid;place-items:center;border-radius:9px;font-size:18px;background:var(--green2);color:var(--green)}.ico.blue{background:var(--blue2);color:var(--blue)}.ico.orange{background:var(--orange2);color:var(--orange)}.metric{font-size:25px;font-weight:750;letter-spacing:-.5px;margin:7px 0 2px}.hint{font-size:11px;color:var(--muted);line-height:1.45}.positive{color:#07834e}.warning{color:#a55b06}.section{margin-top:14px}.sectiongrid{display:grid;grid-template-columns:1.2fr .8fr;gap:13px}.panel{padding:16px}.panelhead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:13px}.panelhead h2{font-size:14px;margin:0}.chip{font-size:10px;padding:5px 8px;border-radius:20px;background:var(--surface2);color:var(--muted);white-space:nowrap}.chip.green{background:var(--green2);color:#087c4a}.kv{display:grid;grid-template-columns:1fr auto;gap:0 15px}.kv div{padding:9px 0;border-bottom:1px solid #edf0f5;font-size:12px}.kv div:nth-last-child(-n+2){border-bottom:0}.kv .k{color:var(--muted)}.kv .v{text-align:right;font-weight:600;max-width:65%;overflow-wrap:anywhere}
.chartbox{height:190px;position:relative}.chartbox svg{width:100%;height:100%;overflow:visible}.chartgrid{stroke:#edf1f6;stroke-width:1}.chartline{fill:none;stroke:#0ca765;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}.chartarea{fill:url(#area)}.chartlabel{fill:#7c899d;font-size:10px}
.threads{display:grid;gap:11px}.thread{display:grid;grid-template-columns:65px 1fr 38px;align-items:center;gap:8px;font-size:11px}.track{height:9px;background:#edf1f6;border-radius:10px;overflow:hidden}.bar{height:100%;background:linear-gradient(90deg,#18b975,#0c9e62);border-radius:10px}
.activity{display:grid;gap:0}.activityrow{display:grid;grid-template-columns:62px minmax(80px,1fr) auto;gap:9px;padding:9px 0;border-bottom:1px solid #edf0f5;font-size:11px}.activityrow:last-child{border-bottom:0}.activityrow span:first-child{color:var(--muted)}.empty{color:var(--muted);font-size:12px;padding:15px 0}
.tablewrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:11px}th{text-align:left;background:#f6f8fb;color:#52617a;font-weight:600;padding:9px 8px}td{padding:9px 8px;border-bottom:1px solid #edf0f5;white-space:nowrap}td.mono{font-family:ui-monospace,monospace}
.terminal{background:#f7f9fc;border:1px solid var(--border);border-radius:9px;padding:12px;height:200px;overflow:auto;font:11px/1.6 ui-monospace,monospace;white-space:pre-wrap;color:#34435d}
.footer{font-size:10px;color:var(--muted);padding:15px 2px}.hidden{display:none!important}
body.dark{color-scheme:dark;--bg:#0e1726;--surface:#152236;--surface2:#1d2b40;--border:#2b3a50;--text:#e7eef8;--muted:#a0afc2;--green2:#123c30;--blue2:#172f4c;--orange2:#44311a;--shadow:none}body.dark aside,body.dark .topbar{background:#111d2f}body.dark .nav{color:#d4deeb}body.dark .nav.active{color:#5de0a8}body.dark .chartgrid{stroke:#2b3a50}body.dark .chartlabel{fill:#a0afc2}body.dark th,body.dark .terminal{background:#111d2f;color:#d4deeb}body.dark td{border-color:#2b3a50}body.dark .kv div,body.dark .activityrow{border-color:#2b3a50}
@media(max-width:1100px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.sectiongrid{grid-template-columns:1fr}}
@media(max-width:700px){.app{grid-template-columns:1fr}aside{height:auto;min-height:0;position:relative;padding:12px}.brand{padding:0 5px 10px}nav{grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}.nav{justify-content:center;padding:9px 3px;font-size:10px;flex-direction:column;gap:3px}.sidebottom{display:none}.topbar{height:48px;padding:0 13px}.content{padding:16px 12px}.pagehead{align-items:flex-start;flex-direction:column}.pagehead h1{font-size:22px}.cards{gap:8px}.card{padding:12px;min-height:108px}.metric{font-size:21px}.panel{padding:13px}.topmuted{display:none}}
</style></head>
<body><div class="app">
<aside>
 <div class="brand"><div class="logo">W</div><div><strong>WAM Coin</strong><small>Minerador VPS</small></div></div>
 <nav>
  <button class="nav active" data-view="overview"><span>⌂</span>Visão Geral</button>
  <button class="nav" data-view="miner"><span>⚙</span>Minerador</button>
  <button class="nav" data-view="wallet"><span>▣</span>Carteira</button>
  <button class="nav" data-view="chain"><span>▦</span>Blockchain</button>
  <button class="nav" data-view="shares"><span>⇄</span>Shares</button>
  <button class="nav" data-view="blocks"><span>⬡</span>Blocos</button>
  <button class="nav" data-view="logs"><span>▤</span>Logs</button>
  <button class="nav" data-view="settings"><span>⚙</span>Configurações</button>
 </nav>
 <div class="sidebottom"><span class="online" id="side-dot"></span><strong id="side-status">Verificando serviço</strong><br><span id="side-service">wam-miner.service</span></div>
</aside>
<main>
 <div class="topbar"><button class="toggle" id="theme">☀ Claro</button><span class="topmuted">Atualização automática</span><strong class="topvalue" id="refresh-state">10s</strong><span class="topmuted">Última atualização</span><strong class="topvalue" id="updated">—</strong><button class="btn" id="refresh">↻</button></div>
 <div class="content">
  <section id="view-overview">
   <div class="pagehead"><div><h1>Visão geral da mineração</h1><p>Indicadores conectados ao minerador, pool e nó WAM. Campos sem fonte são mostrados como indisponíveis.</p></div><span class="chip" id="connection">Conectando fontes…</span></div>
   <div class="cards">
    <article class="card"><div class="metrichead"><span class="ico">◉</span>Velocidade de mineração</div><div class="metric" id="hashrate">—</div><div class="hint" id="hashrate-hint">Aguardando estatística do minerador</div></article>
    <article class="card"><div class="metrichead"><span class="ico blue">▱</span>Threads ativas</div><div class="metric" id="threads">—</div><div class="hint" id="cpu-hint">Uso de CPU indisponível</div></article>
    <article class="card"><div class="metrichead"><span class="ico blue">⬡</span>Blocos minerados</div><div class="metric" id="blocks-found">—</div><div class="hint" id="blocks-hint">Somente contagem confirmada pelo minerador</div></article>
    <article class="card"><div class="metrichead"><span class="ico">⇄</span>Shares da pool</div><div class="metric" id="shares">—</div><div class="hint" id="reject-rate">Válidas / rejeitadas</div></article>
   </div>
   <div class="cards section">
    <article class="card"><div class="metrichead"><span class="ico">▣</span>Saldo pendente</div><div class="metric" id="balance">—</div><div class="hint">Informado pela pool, não é saldo confirmado na carteira</div></article>
    <article class="card"><div class="metrichead"><span class="ico orange">◷</span>Total pago</div><div class="metric" id="paid">—</div><div class="hint">Pagamentos registrados pela pool</div></article>
    <article class="card"><div class="metrichead"><span class="ico orange">◉</span>Total registrado</div><div class="metric" id="earned">—</div><div class="hint">Pendente + pago, apenas quando ambos existem</div></article>
    <article class="card"><div class="metrichead"><span class="ico">▤</span>Tempo ativo</div><div class="metric" id="uptime">—</div><div class="hint" id="miner-state">Status do serviço não confirmado</div></article>
   </div>
   <div class="section sectiongrid">
    <article class="panel"><div class="panelhead"><h2>Histórico de Hashrate (H/s)</h2><span class="chip" id="history-label">Coletando histórico real</span></div><div class="chartbox"><svg viewBox="0 0 700 190" preserveAspectRatio="none" aria-label="Histórico de hashrate"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0ca765" stop-opacity=".22"/><stop offset="1" stop-color="#0ca765" stop-opacity=".02"/></linearGradient></defs><path class="chartgrid" d="M35 15H690 M35 55H690 M35 95H690 M35 135H690 M35 175H690"/><text class="chartlabel" x="2" y="18">máx</text><text class="chartlabel" x="2" y="98">médio</text><text class="chartlabel" x="2" y="178">0</text><path id="chart-area" class="chartarea" d=""/><path id="chart-line" class="chartline" d=""/></svg></div><div class="hint" id="history-hint">O gráfico será preenchido com amostras reais recebidas pela API.</div></article>
    <article class="panel"><div class="panelhead"><h2>Uso de CPU por thread</h2><span class="chip" id="cpu-source">Fonte: host</span></div><div class="threads" id="thread-bars"><div class="empty">Dados por thread indisponíveis.</div></div></article>
   </div>
   <div class="section sectiongrid">
    <article class="panel"><div class="panelhead"><h2>Informações do minerador</h2><span class="chip" id="miner-chip">—</span></div><div class="kv" id="miner-info"></div></article>
    <article class="panel"><div class="panelhead"><h2>Últimas atividades</h2><span class="chip">Logs do serviço</span></div><div class="activity" id="activities"><div class="empty">Aguardando logs WAM…</div></div></article>
   </div>
  </section>
  <section id="view-miner" class="hidden"><div class="pagehead"><div><h1>Minerador</h1><p>Estado do processo e configuração efetiva detectada no servidor.</p></div></div><div class="panel"><div class="kv" id="miner-info-full"></div></div></section>
  <section id="view-wallet" class="hidden"><div class="pagehead"><div><h1>Carteira</h1><p>Endereço configurado e pagamentos informados pela pool.</p></div></div><div class="panel"><div class="kv" id="wallet-info"></div></div></section>
  <section id="view-chain" class="hidden"><div class="pagehead"><div><h1>Blockchain</h1><p>Informações provenientes do nó WAM. Sem dados inventados.</p></div></div><div class="panel"><div class="kv" id="chain-info"></div></div></section>
  <section id="view-shares" class="hidden"><div class="pagehead"><div><h1>Shares</h1><p>Contagem de shares válidas e rejeitadas publicada pela pool/minerador.</p></div></div><div class="panel"><div class="kv" id="shares-info"></div></div></section>
  <section id="view-blocks" class="hidden"><div class="pagehead"><div><h1>Blocos</h1><p>Não confundir blocos encontrados pelo pool com blocos encontrados por este worker.</p></div></div><div class="panel"><div class="tablewrap"><table><thead><tr><th>Indicador</th><th>Valor</th><th>Fonte</th></tr></thead><tbody id="blocks-table"></tbody></table></div></div></section>
  <section id="view-logs" class="hidden"><div class="pagehead"><div><h1>Logs</h1><p>Últimas linhas publicadas para o painel.</p></div></div><div class="panel"><div class="terminal" id="terminal">Aguardando…</div></div></section>
  <section id="view-settings" class="hidden"><div class="pagehead"><div><h1>Configurações</h1><p>Parâmetros que o painel consegue ler. A interface não altera o serviço de mineração.</p></div></div><div class="panel"><div class="kv" id="settings-info"></div><p class="hint">Para segurança, o painel não expõe credenciais RPC, cookie do nó ou chaves privadas.</p></div></section>
  <div class="footer">WAM Coin · Painel de monitoramento · Valores ausentes não são convertidos em zero · Atualização automática a cada 10 segundos</div>
 </div>
</main></div>
<script>
const REFRESH_MS=__REFRESH_MS__;
const $=id=>document.getElementById(id);
const number=(v,d=2)=>v===null||v===undefined||v===""||!Number.isFinite(Number(v))?"—":Number(v).toLocaleString("pt-BR",{maximumFractionDigits:d});
const val=(v,unit="")=>v===null||v===undefined||v===""?"Indisponível":String(v)+(unit?" "+unit:"");
function row(k,v){return '<div class="k">'+escapeHtml(k)+'</div><div class="v">'+escapeHtml(val(v))+'</div>'}
function escapeHtml(x){return String(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
let last={mining:null,pool:null,logs:null};
function setMetric(id,v,unit=""){ $(id).textContent=v===null||v===undefined||v===""?"—":number(v)+(unit?" "+unit:""); }
function setText(id,v){$(id).textContent=v===null||v===undefined||v===""?"—":String(v)}
function showView(name){document.querySelectorAll('[id^="view-"]').forEach(e=>e.classList.add("hidden"));$("view-"+name).classList.remove("hidden");document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===name))}
document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
$("theme").addEventListener("click",()=>{document.body.classList.toggle("dark");$("theme").textContent=document.body.classList.contains("dark")?"☾ Escuro":"☀ Claro";try{localStorage.setItem("wam-theme",document.body.classList.contains("dark")?"dark":"light")}catch{}});
try{if(localStorage.getItem("wam-theme")==="dark"){$("theme").textContent="☾ Escuro";document.body.classList.add("dark")}}catch{}
function renderChart(history){const list=Array.isArray(history)?history.map(x=>Number(typeof x==="number"?x:x.hashrate??x.hps)).filter(x=>Number.isFinite(x)&&x>=0):[];if(list.length<2){$("chart-line").setAttribute("d","");$("chart-area").setAttribute("d","");$("history-hint").textContent="Histórico ainda não fornecido pela API; não serão criadas amostras fictícias.";return}$("history-label").textContent=list.length+" amostras";const max=Math.max(...list,1);const points=list.map((v,i)=>[35+i*655/(list.length-1),175-(v/max)*150]);const path=points.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");$("chart-line").setAttribute("d",path);$("chart-area").setAttribute("d",path+" L690 175 L35 175 Z");$("history-hint").textContent="Amostras reais recebidas. Máximo: "+number(max,1)+" H/s."}
function renderThreads(d){const list=Array.isArray(d.threadStats)?d.threadStats:Array.isArray(d.threadsStats)?d.threadsStats:[];$("thread-bars").innerHTML=list.length?list.map((t,i)=>{const n=Number(t.cpuPercent??t.cpu??t.percent);return '<div class="thread"><span>Thread '+escapeHtml(t.id??i+1)+'</span><div class="track"><div class="bar" style="width:'+Math.max(0,Math.min(100,n||0))+'%"></div></div><strong>'+ (Number.isFinite(n)?number(n,0)+"%":"—")+'</strong></div>'}).join(""):'<div class="empty">Dados por thread indisponíveis. O número de threads configuradas não é tratado como medição de CPU.</div>'}
function renderMiner(d){const items=[["Status do serviço",d.serviceActive===true?"Ativo":d.serviceActive===false?"Inativo":d.minerActive===true?"Ativo":"Indisponível"],["Versão",d.version],["Pool",d.pool],["Endereço",d.walletAddress||d.wallet||"Configurado no servidor"],["Threads configuradas",d.threads],["Threads ativas",d.activeThreads],["Dataset",d.dataset||"2 GiB (modo completo, configuração conhecida)"],["Large Pages",d.largePages===true?"Ativado":d.largePages===false?"Não utilizado":"Não confirmado"],["Tempo ativo",d.uptime],["Uso de memória",d.memoryUsedMb==null?null:number(d.memoryUsedMb,0)+" MB"],["CPU",d.cpuPercent==null?null:number(d.cpuPercent,1)+"%"]];const html=items.map(([k,v])=>row(k,v)).join("");$("miner-info").innerHTML=html;$("miner-info-full").innerHTML=html;$("settings-info").innerHTML=[["Atualização",REFRESH_MS/1000+" segundos"],["Serviço",d.serviceName||"wam-miner.service"],["Pool URL",d.pool],["Monitor local",d.monitorConnected===true?"Conectado":d.monitorConnected===false?"Desconectado":"Não confirmado"],["Última coleta",d.updatedAt?new Date(d.updatedAt).toLocaleString("pt-BR"):null]].map(([k,v])=>row(k,v)).join("");}
function renderMining(d){last.mining=d;setMetric("hashrate",d.hashrate,"H/s");setText("hashrate-hint",d.hashrate==null?"Sem estatística reportada pelo minerador":"Velocidade recebida da fonte local");setText("threads",d.activeThreads==null?(d.threads==null?null:d.threads+" configuradas"):d.activeThreads+" / "+(d.cpuCount??d.totalCpus??"?"));setText("cpu-hint",d.cpuPercent==null?"Uso de CPU não informado":"Uso de CPU: "+number(d.cpuPercent,1)+"%");setMetric("blocks-found",d.blocksFound);setText("blocks-hint",d.blocksFound==null?"Contagem individual não fornecida pelo processo":"Fonte: "+(d.blocksFoundSource||"minerador"));setMetric("shares",d.validShares);setText("reject-rate",d.validShares==null&&d.rejectedShares==null?"Shares não informadas":"Válidas: "+val(d.validShares)+" · Rejeitadas: "+val(d.rejectedShares)+(d.rejectRate==null?"":" · Rejeição: "+number(d.rejectRate,2)+"%"));setText("uptime",d.uptime);setText("miner-state",d.serviceActive===true||d.minerActive===true?"Serviço de mineração ativo":d.serviceActive===false||d.minerActive===false?"Serviço inativo":"Status não confirmado");$("side-status").textContent=d.serviceActive===true||d.minerActive===true?"Serviço online":d.serviceActive===false?"Serviço offline":"Status desconhecido";$("side-dot").className=(d.serviceActive===true||d.minerActive===true)?"online":"online offline";$("connection").textContent=d.monitorConnected===true?"Monitor local conectado":"Monitor local sem confirmação";$("miner-chip").textContent=d.serviceActive===true||d.minerActive===true?"Ativo":"Não confirmado";renderMiner(d);renderThreads(d);renderChart(d.hashrateHistory||d.history||[]);$("chain-info").innerHTML=[["Altura local",d.height],["Altura dos cabeçalhos",d.headers],["Dificuldade",d.difficulty],["Pares conectados",d.peers],["Sincronização",d.synced===true?"Sincronizado":d.synced===false?"Sincronizando":null]].map(([k,v])=>row(k,v)).join("");$("blocks-table").innerHTML=[["Blocos encontrados pelo minerador",d.blocksFound,d.blocksFoundSource||"Minerador"],["Blocos aceitos pelo nó",d.blocksAccepted,d.blocksAcceptedSource||"Nó"],["Altura atual do nó",d.height,"Nó local"],["Último bloco",d.lastBlockHash,"Nó local"]].map(([k,v,s])=>'<tr><td>'+escapeHtml(k)+'</td><td>'+escapeHtml(val(v))+'</td><td>'+escapeHtml(s)+'</td></tr>').join("");}
function renderPool(d){last.pool=d;if(!d||d.available!==true){["balance","paid","earned","shares"].forEach(id=>setText(id,"Indisponível"));$("pool-source");return}const p=d.data||{};const balance=p.balance??p.saldo??null;const paid=p.totalPaid??p.totalPago??null;const valid=p.validShares??p.sharesValidas??p.acceptedShares??null;const rejected=p.rejectedShares??p.sharesRejeitadas??null;setMetric("balance",balance==null?null:number(balance,8),"WAM");setMetric("paid",paid==null?null:number(paid,8),"WAM");setMetric("earned",balance==null||paid==null?null:number(Number(balance)+Number(paid),8),"WAM");if(valid!=null)setMetric("shares",valid);if(valid!=null||rejected!=null){const total=Number(valid||0)+Number(rejected||0);setText("reject-rate","Válidas: "+val(valid)+" · Rejeitadas: "+val(rejected)+(total>0?" · Rejeição: "+number(Number(rejected||0)/total*100,2)+"%":""))}else if(last.mining?.validShares!=null)setMetric("shares",last.mining.validShares);$("wallet-info").innerHTML=[["Endereço",WAM_WALLET_PLACEHOLDER],["Saldo pendente na pool",balance==null?null:number(balance,8)+" WAM"],["Total pago pela pool",paid==null?null:number(paid,8)+" WAM"],["Total registrado",balance==null||paid==null?null:number(Number(balance)+Number(paid),8)+" WAM"],["Fonte",d.source||"Pool"],["Atualizado",d.updatedAt?new Date(d.updatedAt).toLocaleString("pt-BR"):null]].map(([k,v])=>row(k,v)).join("");}
function renderLogs(d){last.logs=d;const lines=Array.isArray(d.lines)?d.lines:[];$("terminal").textContent=lines.map(x=>typeof x==="string"?x:x.line||JSON.stringify(x)).join("\n")||"Nenhuma linha de log disponível.";const activity=lines.slice(-8).reverse();$("activities").innerHTML=activity.length?activity.map(x=>{const s=typeof x==="string"?x:x.line||JSON.stringify(x);const m=s.match(/(\d{2}:\d{2}:\d{2})/);return '<div class="activityrow"><span>'+escapeHtml(m?m[1]:"—")+'</span><strong>'+escapeHtml(s.slice(0,110))+'</strong><span class="chip">Log</span></div>'}).join(""):'<div class="empty">Logs ainda não conectados.</div>'}
async function getJson(url){const r=await fetch(url,{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"HTTP "+r.status);return d}
async function refresh(){const stamp=new Date();$("updated").textContent=stamp.toLocaleTimeString("pt-BR");const results=await Promise.allSettled([getJson("/api/mining"),getJson("/api/pool-miner"),getJson("/api/wam-logs")]);if(results[0].status==="fulfilled")renderMining(results[0].value);else $("connection").textContent="Falha no monitor local";if(results[1].status==="fulfilled")renderPool(results[1].value);if(results[2].status==="fulfilled")renderLogs(results[2].value)}
$("refresh").addEventListener("click",refresh);$("refresh-state").textContent=(REFRESH_MS/1000)+"s";refresh();setInterval(refresh,REFRESH_MS);
</script></body></html>`.replace("__REFRESH_MS__", String(REFRESH_MS)).replace("WAM_WALLET_PLACEHOLDER", "${escapeHtml(WAM_WALLET)}");

function send(res, status, value) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(JSON.stringify(value));
}
function parseNum(x) { if (x === null || x === undefined || x === "") return null; const n = Number(x); return Number.isFinite(n) ? n : null; }
function normalizePool(raw) {
  const d = raw && typeof raw === "object" ? raw : {};
  const valid = parseNum(d.validShares ?? d.sharesValidas ?? d.acceptedShares ?? d.accepted);
  const rejected = parseNum(d.rejectedShares ?? d.sharesRejeitadas ?? d.rejected);
  return { balance: parseNum(d.balance ?? d.saldo), totalPaid: parseNum(d.totalPaid ?? d.totalPago), validShares: valid, rejectedShares: rejected };
}
async function getMonitor() {
  try {
    const r = await fetch(WAM_STATUS_URL, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(4500) });
    if (!r.ok) throw new Error("Monitor respondeu HTTP " + r.status);
    const d = await r.json();
    return { ...d, monitorConnected: true, serviceName: d.serviceName || MINER_SERVICE, updatedAt: new Date().toISOString() };
  } catch (e) {
    return { monitorConnected: false, serviceName: MINER_SERVICE, error: "Ponte local WAM indisponível: " + e.message };
  }
}
async function getPool() {
  try {
    const url = POOL_MINER_URL + "?address=" + encodeURIComponent(WAM_WALLET);
    const r = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(7000) });
    if (!r.ok) throw new Error("Pool respondeu HTTP " + r.status);
    const raw = await r.json();
    return { available: true, source: "Pool WAM", updatedAt: new Date().toISOString(), data: normalizePool(raw) };
  } catch (e) { return { available: false, source: "Pool WAM", error: e.message, data: {} }; }
}
async function getLogs() {
  try {
    const logUrl = WAM_STATUS_URL.endsWith("/status") ? WAM_STATUS_URL.slice(0, -7) + "/logs" : WAM_STATUS_URL + "/logs";
    const r = await fetch(logUrl, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(4000) });
    if (r.ok) return await r.json();
  } catch {}
  try {
    const d = JSON.parse(fs.readFileSync(WAM_LOG_FILE, "utf8"));
    return { available: true, updatedAt: d.updatedAt || null, lines: Array.isArray(d.lines) ? d.lines.slice(-100) : [] };
  } catch { return { available: false, lines: [] }; }
}
const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (path === "/health" || path === "/healthz") return send(res, 200, { status: "ok", app: "wam-dashboard" });
  if (path === "/api/mining") return send(res, 200, { ...(await getMonitor()), walletAddress: WAM_WALLET });
  if (path === "/api/pool-miner") return send(res, 200, await getPool());
  if (path === "/api/wam-logs") return send(res, 200, await getLogs());
  if (path === "/" || path === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
    return res.end(page);
  }
  return send(res, 404, { error: "Não encontrado" });
});
server.listen(PORT, "0.0.0.0", () => console.log("WAM Dashboard ouvindo na porta " + PORT));
