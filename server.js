const http = require("node:http");

const PORT = Number(process.env.PORT || 3000);
const REFRESH_MS = Math.max(60, Number(process.env.REFRESH_SECONDS || 120)) * 1000;
const WALLET = process.env.XMR_WALLET || "43LujcJuTVrSYVjE9nR3s7L1ZukpLkFTGQogWtf54cT6eKx7nVKbh6ecejUNByFYgNFdMLhfkHd5Kjk6SVLS4hqf4aGU6xB";
const POOL_API = "https://api.hashvault.pro/v3/monero";

let snapshot = { updatedAt: null, pool: null, wallet: null, error: null };
let refreshing = false;

const page = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#080d18">
<title>Minerar XMR | Painel de mineração</title>
<style>
:root{color-scheme:dark;--bg:#080d18;--panel:#111a2b;--panel2:#0d1525;--border:#26344c;--muted:#9aabc5;--text:#edf4ff;--green:#4de0ad;--red:#ff8795;--blue:#7eb8ff}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 15% 0%,#172949 0,transparent 40%),var(--bg);color:var(--text);font:15px Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif}
header{border-bottom:1px solid var(--border);background:#0a1120d9;position:sticky;top:0;z-index:2;backdrop-filter:blur(12px)}
.top{max-width:1240px;margin:auto;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;gap:16px}.brand{display:flex;align-items:center;gap:12px}.logo{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(145deg,#ff9c35,#f15c32);font-size:23px;color:#111;font-weight:900}
h1{font-size:20px;margin:0;letter-spacing:.2px}.sub{color:var(--muted);font-size:12px;margin-top:4px}.pill{border:1px solid #28654f;color:var(--green);background:#102b27;border-radius:99px;padding:7px 11px;font-size:12px;white-space:nowrap}
main{max-width:1240px;margin:auto;padding:24px 22px 40px}.intro{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:22px}.intro h2{font-size:27px;margin:0 0 7px}.intro p{margin:0;color:var(--muted);line-height:1.5}.updated{color:var(--muted);font-size:12px;text-align:right}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.card{background:linear-gradient(150deg,#141f33,#0f1728);border:1px solid var(--border);border-radius:17px;padding:19px;min-width:0;box-shadow:0 10px 30px #00000012}.label{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:8px}.dot{width:7px;height:7px;border-radius:50%;background:var(--green);display:inline-block}.value{font-size:27px;font-weight:750;letter-spacing:-.6px;margin-top:14px;overflow-wrap:anywhere}.unit{font-size:13px;color:var(--muted);font-weight:500;letter-spacing:0}.hint{font-size:12px;color:var(--muted);margin-top:9px;line-height:1.5}.good{color:var(--green)}.bad{color:var(--red)}.blue{color:var(--blue)}
.section{margin-top:24px}.sectionhead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.section h3{font-size:17px;margin:0}.section p{color:var(--muted);font-size:13px;margin:6px 0 0;line-height:1.5}
.cols{display:grid;grid-template-columns:1.15fr .85fr;gap:14px}.wide{background:var(--panel2);border:1px solid var(--border);border-radius:17px;padding:20px;min-width:0}.statrow{display:flex;justify-content:space-between;gap:14px;padding:12px 0;border-bottom:1px solid #233049}.statrow:last-child{border-bottom:0}.statrow span:first-child{color:var(--muted)}.statrow strong{text-align:right;overflow-wrap:anywhere}
input{background:#080f1d;border:1px solid #33435e;border-radius:10px;color:var(--text);padding:11px 12px;width:100%;font:inherit;outline:none}input:focus{border-color:var(--blue)}.costrow{display:grid;grid-template-columns:1fr 150px;gap:12px;align-items:center;margin-top:16px}.small{font-size:12px;color:var(--muted);line-height:1.5}.notice{margin-top:18px;padding:14px 16px;border:1px solid #69542b;background:#241d11;border-radius:12px;color:#f1d9a2;font-size:12px;line-height:1.6}.notice strong{color:#ffe8ae}
.tablewrap{overflow-x:auto;border:1px solid var(--border);border-radius:14px}table{border-collapse:collapse;width:100%;min-width:570px;background:#0d1525}th,td{text-align:left;padding:13px 15px;border-bottom:1px solid #243149;font-size:13px}th{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}tr:last-child td{border-bottom:0}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}
footer{margin-top:24px;color:#8293ad;font-size:11px;line-height:1.7}.refresh{background:#172740;color:var(--text);border:1px solid #344866;padding:9px 12px;border-radius:10px;cursor:pointer}.refresh:hover{background:#203553}
@media(max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cols{grid-template-columns:1fr}.intro{align-items:flex-start;flex-direction:column}.updated{text-align:left}}
@media(max-width:520px){.top,main{padding-left:14px;padding-right:14px}.grid{gap:9px}.card{padding:14px;border-radius:13px}.value{font-size:22px}.intro h2{font-size:23px}.costrow{grid-template-columns:1fr}.pill{font-size:11px}.wide{padding:15px}}
</style></head>
<body>
<header><div class="top"><div class="brand"><div class="logo">₿</div><div><h1>Minerar XMR</h1><div class="sub">Painel de mineração · Monero / RandomX</div></div></div><div class="pill"><span class="dot"></span> API da pool</div></div></header>
<main>
<div class="intro"><div><h2>Visão geral da mineração</h2><p>Hashrate, shares, saldo, blocos da pool e estimativa financeira em um só lugar.</p></div><div><div class="updated">Atualizado: <span id="updated">carregando…</span></div><button class="refresh" id="refresh" style="margin-top:9px">↻ Atualizar agora</button></div></div>
<div class="grid">
<div class="card"><div class="label"><span class="dot"></span>Hashrate da sua carteira</div><div class="value" id="hashrate">—</div><div class="hint" id="workerhint">Calculado pela pool, quando disponível</div></div>
<div class="card"><div class="label">Saldo acumulado no pool</div><div class="value" id="balance">—</div><div class="hint" id="balanceusd">Valor ainda não confirmado pela API</div></div>
<div class="card"><div class="label">Falta para atingir o saque</div><div class="value" id="toPayout">—</div><div class="hint" id="thresholdHint">Limite de pagamento da carteira</div></div>
<div class="card"><div class="label">Total pago</div><div class="value" id="paid">—</div><div class="hint">Pagamentos informados pela pool</div></div>
<div class="card"><div class="label">Preço do XMR</div><div class="value" id="price">—</div><div class="hint" id="pricehint">Cotação fornecida pela API da pool</div></div>
</div>
<div class="section"><div class="sectionhead"><h3>Produção e atividade</h3></div><div class="grid">
<div class="card"><div class="label">Shares aceitas</div><div class="value" id="accepted">—</div><div class="hint">Contagem publicada pela pool, se disponível</div></div>
<div class="card"><div class="label">Shares inválidas / rejeitadas</div><div class="value" id="rejected">—</div><div class="hint">Dados reportados pela pool</div></div>
<div class="card"><div class="label">Blocos encontrados pela pool</div><div class="value" id="blocks">—</div><div class="hint" id="lastblock">Último bloco da pool</div></div>
<div class="card"><div class="label">Recompensa do último bloco da pool</div><div class="value" id="reward">—</div><div class="hint">Recompensa total do bloco da pool; não é o valor individual recebido por você</div></div>
</div></div>
<div class="section cols">
<div class="wide"><h3>Estimativa de receita</h3><p>Estimativa teórica com hashrate da carteira, dificuldade de rede, recompensa de bloco e preço atual. A recompensa real da pool pode variar.</p>
<div class="statrow"><span>Receita bruta estimada / dia</span><strong id="grossday">—</strong></div>
<div class="statrow"><span>Receita bruta estimada / mês</span><strong id="grossmonth">—</strong></div>
<div class="statrow"><span>Produção estimada / dia</span><strong id="xmrd">—</strong></div>
<div class="statrow"><span>Lucro estimado / mês</span><strong id="netmonth">Informe o custo da VPS</strong></div>
<div class="costrow"><div><label for="vpscost">Custo mensal da VPS (R$)</label><div class="small">Salvo apenas neste navegador.</div></div><input id="vpscost" type="number" min="0" step="0.01" placeholder="Ex.: 80,00"></div>
<div class="statrow"><span>Lucro estimado / mês em R$</span><strong id="netbrl">—</strong></div>
<div class="small" id="fxnote" style="margin-top:10px">Cotação BRL e dados da rede serão carregados pela API.</div>
</div>
<div class="wide"><h3>Estado da carteira e da rede</h3><p>Informações públicas consultadas na HashVault. O painel não controla a mineração e não contém chaves privadas.</p>
<div class="statrow"><span>Estado dos dados</span><strong id="status">Consultando…</strong></div>
<div class="statrow"><span>Altura da rede</span><strong id="height">—</strong></div>
<div class="statrow"><span>Dificuldade da rede</span><strong id="difficulty">—</strong></div>
<div class="statrow"><span>Hashrate médio da rede</span><strong id="networkhash">—</strong></div>
<div class="statrow"><span>Última atividade do worker</span><strong id="lastshare">—</strong></div>
<div class="statrow"><span>Trabalhadores ativos</span><strong id="workers">—</strong></div>
<div class="statrow"><span>Endereço configurado</span><strong class="mono" id="wallet">—</strong></div>
</div></div>
<div class="section"><div class="sectionhead"><h3>Blocos recentes da pool</h3></div><p style="margin-bottom:12px">São blocos encontrados pela pool inteira, não necessariamente pelo seu minerador. A API pública pode disponibilizar somente o bloco mais recente.</p><div class="tablewrap"><table><thead><tr><th>Altura</th><th>Tipo</th><th>Recompensa</th><th>Encontrado em</th><th>Validade</th></tr></thead><tbody id="blockrows"><tr><td colspan="5">Carregando dados da pool…</td></tr></tbody></table></div></div>
<div class="notice"><strong>Importante:</strong> lucro é uma estimativa, não uma garantia. A recompensa mostrada por bloco é a recompensa total do bloco da pool, não a sua recompensa individual; sua parte depende das shares e do esquema de pagamento. Não confunda os blocos encontrados pela pool com blocos encontrados pela sua VPS. O saldo acumulado e o limite de saque dependem dos campos que a API pública retornar; quando o limite não estiver disponível, confira-o no painel oficial da HashVault. A API da pool informa pagamentos, mas o painel não consegue confirmar pagamentos na carteira local nem ler logs internos do XMRig dentro do host. Para monitoramento do processo em tempo real será necessário um endpoint local protegido no servidor.</div>
<footer>Minerar XMR · Atualização automática a cada 60 segundos · Fontes: API pública HashVault. Nenhuma chave privada é solicitada ou armazenada. A estimativa de receita não substitui o histórico de pagamentos.</footer>
</main>
<script>
const fmtNum=(v,d=2)=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:d});
const fmtXMR=v=>v==null||!Number.isFinite(Number(v))?'—':fmtNum(v,8)+' XMR';
const fmtUSD=v=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2});
const fmtBRL=v=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2});
const compact=v=>v==null||!Number.isFinite(Number(v))?'—':new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:2}).format(v);
const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
const first=(obj,paths)=>{for(const p of paths){let v=obj;for(const k of p.split('.'))v=v==null?undefined:v[k];if(v!==undefined&&v!==null)return v}return null};
const safeDate=v=>{if(!v)return '—';let n=Number(v);const d=new Date(n>1e12?n:n>1e9?n*1000:v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR')};
let lastData=null;
function walkFind(o,keys,depth=0){if(!o||typeof o!=='object'||depth>5)return null;for(const k of keys){if(o[k]!==undefined&&o[k]!==null)return o[k]}for(const v of Object.values(o)){if(v&&typeof v==='object'){const x=walkFind(v,keys,depth+1);if(x!==null&&x!==undefined)return x}}return null}
function normalize(d){
 const pool=d.pool||{};const wallet=d.wallet||{};const collective=first(pool,['pool_statistics.collective','collective'])||{};const network=first(pool,['network_statistics','network'])||{};const market=first(pool,['market'])||{};
 const minerStats=first(wallet,['stats','wallet','data'])||wallet;
 const hashrate=walkFind(minerStats,['hashRate','hashrate','hash_rate','avgHashrate','hashRate_1h']);
 const balance=walkFind(minerStats,['amtDue','amountDue','amount_due','pendingBalance','pending_balance','unpaidBalance','unpaid_balance','balance','pending','unpaid','due','totalDue','total_due']);
 const paid=walkFind(minerStats,['amtPaid','amountPaid','amount_paid','totalPaid','total_paid','paid','paidAmount']);
 const threshold=walkFind(minerStats,['payoutThreshold','payout_threshold','minPayout','minimumPayout','paymentThreshold','payment_threshold','threshold','thold']);
 const accepted=walkFind(minerStats,['validShares','accepted','sharesAccepted','valid_shares']);
 const rejected=walkFind(minerStats,['invalidShares','rejected','sharesRejected','invalid_shares']);
 const workerList=walkFind(minerStats,['workers','workerStats','worker_stats']);
 const workerArray=Array.isArray(workerList)?workerList:[];
 const lastShare=walkFind(minerStats,['lastShare','last_share','lastShareTime']);
 const walletBlocks=walkFind(minerStats,['blocksFound','blocks_found','totalBlocksFound']);
 const rewardAtomic=first(pool,['network_statistics.value','network.value','pool_statistics.general.last10blocksAvgReward']);
 const difficulty=first(pool,['network_statistics.difficulty','network.difficulty']);
 const height=first(pool,['network_statistics.height','network.height']);
 const networkRate=difficulty?Number(difficulty)/120:null;
 const price=first(pool,['market.price_usd','market.priceUsd']);
 const latest=first(collective,['lastFoundBlock'])||{};
 const totalBlocks=first(collective,['totalBlocksFound','total_blocks_found']);
 const poolRate=first(collective,['hashRate','hashrate']);
 const xmr=v=>{if(v==null)return null;if(typeof v==='object'){v=v.amount??v.value??v.total??v.atomic??null}if(v==null||!Number.isFinite(Number(v)))return null;const n=Number(v);return n>1000000?n/1e12:n;};
 return {hashrate:hashrate==null?null:Number(hashrate),balance:xmr(balance),paid:xmr(paid),threshold:xmr(threshold),accepted:accepted==null?null:Number(accepted),rejected:rejected==null?null:Number(rejected),workers:workerArray.length||walkFind(minerStats,['workerCount','workersCount']),lastShare, walletBlocks, totalBlocks, latest, reward:xmr(rewardAtomic),difficulty,height,networkRate,price:price==null?null:Number(price),walletStats:minerStats,network,poolRate};
}
function render(d){
 lastData=d;const n=normalize(d);const brlRate=Number(d.brlRate||0);const rate=n.hashrate;
 set('updated',d.updatedAt?new Date(d.updatedAt).toLocaleString('pt-BR'):'—');
 set('hashrate',rate==null?'Aguardando':(rate>=1e6?fmtNum(rate/1e6,2)+' MH/s':rate>=1000?fmtNum(rate/1000,2)+' kH/s':fmtNum(rate,1)+' H/s'));
 set('workerhint',n.workers!=null?'Workers informados pela pool: '+n.workers:'Hashrate informado pela API da carteira');
 set('balance',n.balance==null?'Aguardando API':fmtXMR(n.balance));
 set('balanceusd',n.balance==null?'A HashVault não retornou um campo de saldo reconhecido':(n.price==null?'Saldo informado pela pool':fmtUSD(n.balance*n.price)+' estimados'));
 set('toPayout',n.balance==null?'Aguardando saldo':n.threshold==null?'Confira limite na HashVault':fmtXMR(Math.max(0,n.threshold-n.balance)));
 set('thresholdHint',n.threshold==null?'O limite não está disponível na API pública; confira no painel oficial da HashVault':('Limite de saque: '+fmtXMR(n.threshold)+(n.balance>=n.threshold?' · limite atingido':' · saldo acumulando')));
 set('paid',n.paid==null?'Indisponível':fmtXMR(n.paid));
 set('price',n.price==null?'—':fmtUSD(n.price));
 set('accepted',n.accepted==null?'—':fmtNum(n.accepted,0));
 set('rejected',n.rejected==null?'—':fmtNum(n.rejected,0));
 set('blocks',n.totalBlocks==null?'—':fmtNum(n.totalBlocks,0));
 set('reward',n.reward==null?'—':fmtXMR(n.reward));
 set('lastblock',n.latest&&n.latest.height?'Último bloco #'+n.latest.height+' · '+safeDate(n.latest.ts):'Último bloco publicado pela pool');
 set('height',n.height==null?'—':fmtNum(n.height,0));
 set('difficulty',n.difficulty==null?'—':compact(n.difficulty));
 set('networkhash',n.networkRate==null?'—':(n.networkRate>=1e9?fmtNum(n.networkRate/1e9,2)+' GH/s':n.networkRate>=1e6?fmtNum(n.networkRate/1e6,2)+' MH/s':fmtNum(n.networkRate/1000,2)+' kH/s'));
 set('lastshare',safeDate(n.lastShare));
 set('workers',n.workers==null?'—':fmtNum(n.workers,0));
 set('wallet',d.walletAddress?d.walletAddress.slice(0,12)+'…'+d.walletAddress.slice(-8):'Configurada');
 set('status',d.error?'API com aviso: '+d.error:'Dados recebidos da HashVault');
 const dayXmr=(rate&&n.difficulty&&n.reward)?rate*86400/Number(n.difficulty)*Number(n.reward):null;
 const dayUSD=dayXmr!=null&&n.price!=null?dayXmr*n.price:null;
 set('xmrd',dayXmr==null?'Aguardando hashrate e dificuldade':fmtXMR(dayXmr));
 set('grossday',dayUSD==null?'—':fmtUSD(dayUSD));
 set('grossmonth',dayUSD==null?'—':fmtUSD(dayUSD*30));
 const cost=Number(document.getElementById('vpscost').value||0);
 const fx=Number(d.brlRate||0);
 const netUSD=dayUSD==null?null:dayUSD*30-(fx>0?cost/fx:0);
 set('netmonth',netUSD==null?'—':(netUSD>=0?'+':'')+fmtUSD(netUSD));
 set('netbrl',netUSD==null?'—':fmtBRL(netUSD*(fx||0)));
 set('fxnote',fx>0?'Conversão indicativa: US$ 1 = R$ '+fmtNum(fx,4)+'. Ajuste o custo mensal da VPS acima.':'Cotação USD/BRL indisponível; lucro líquido em R$ não pode ser calculado ainda.');
 const b=n.latest&&n.latest.height?[{height:n.latest.height,type:n.latest.poolType||'pool',value:n.latest.value||n.latest.reward||null,ts:n.latest.ts,valid:n.latest.valid,hash:n.latest.hash}]:[];
 document.getElementById('blockrows').innerHTML=b.length?b.map(x=>'<tr><td>#'+String(x.height)+'</td><td>'+String(x.type||'pool').toUpperCase()+'</td><td>'+fmtXMR(x.value==null?null:Number(x.value)/1e12)+'</td><td>'+safeDate(x.ts)+'</td><td class="'+(x.valid?'good':'bad')+'">'+(x.valid?'Válido':x.valid===false?'Inválido':'—')+'</td></tr>').join(''):'<tr><td colspan="5">A API não retornou bloco recente.</td></tr>';
}
async function refresh(){set('status','Atualizando…');try{const r=await fetch('/api/mining',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'HTTP '+r.status);render(d)}catch(e){set('status','Falha: '+e.message)}}
document.getElementById('refresh').addEventListener('click',refresh);
document.getElementById('vpscost').value=localStorage.getItem('xmr-vps-cost')||'';
document.getElementById('vpscost').addEventListener('input',e=>{localStorage.setItem('xmr-vps-cost',e.target.value);if(lastData)render(lastData)});
refresh();setInterval(refresh,60000);
</script></body></html>`;

async function jsonFetch(url) {
  const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "MinerarXMR-Dashboard/1.0" }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("API respondeu HTTP " + response.status);
  return response.json();
}
async function refreshData() {
  if (refreshing) return;
  refreshing = true;
  try {
    const [poolResult, walletResult, fxResult] = await Promise.allSettled([
      jsonFetch(POOL_API),
      jsonFetch(POOL_API + "/wallet/" + encodeURIComponent(WALLET) + "/stats?chart=false&workers=true&poolType=false"),
      jsonFetch("https://open.er-api.com/v6/latest/USD")
    ]);
    const pool = poolResult.status === "fulfilled" ? poolResult.value : null;
    const wallet = walletResult.status === "fulfilled" ? walletResult.value : null;
    const brlRate = fxResult.status === "fulfilled" && fxResult.value && fxResult.value.rates ? Number(fxResult.value.rates.BRL) : null;
    const errors = [];
    if (!pool) errors.push("Pool: " + poolResult.reason.message);
    if (!wallet) errors.push("Carteira: " + walletResult.reason.message);
    snapshot = { updatedAt: new Date().toISOString(), pool, wallet, walletAddress: WALLET, brlRate, error: errors.length ? errors.join("; ") : null };
  } catch (error) {
    snapshot.error = error.message;
  } finally {
    refreshing = false;
  }
}
const server = http.createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  res.setHeader("x-content-type-options", "nosniff");
  if (path === "/health" || path === "/healthz") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ status: "ok", updatedAt: snapshot.updatedAt, error: snapshot.error }));
  }
  if (path === "/api/mining") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    return res.end(JSON.stringify(snapshot));
  }
  if (path === "/api/market") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    return res.end(JSON.stringify({ error: "Este painel acompanha mineração Monero. Veja /api/mining." }));
  }
  if (path === "/" || path === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    return res.end(page);
  }
  res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "Não encontrado" }));
});
server.listen(PORT, "0.0.0.0", () => {
  console.log("Minerar XMR Dashboard ouvindo na porta " + PORT);
  refreshData();
  setInterval(refreshData, REFRESH_MS);
});
