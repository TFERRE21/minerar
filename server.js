const http = require("node:http");

const PORT = Number(process.env.PORT || 3000);
const REFRESH_MS = Math.max(60, Number(process.env.REFRESH_SECONDS || 900)) * 1000;
const MAX_MARKET_CAP = Number(process.env.MAX_MARKET_CAP_USD || 50000000);
const MIN_VOLUME = Number(process.env.MIN_VOLUME_USD || 10000);

let coins = [];
let updatedAt = null;
let lastError = null;
let refreshing = false;

const page = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0b1020"><title>Crypto Scout | Monitor cripto</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#0b1020;color:#e8eefc;font:15px Arial,sans-serif}
header{padding:28px max(20px,calc((100% - 1150px)/2));background:#111a30;border-bottom:1px solid #263452}
h1{margin:0;font-size:28px}header p,.muted{color:#9eafd0;line-height:1.6}
main{max-width:1150px;margin:auto;padding:24px 18px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
.card{background:#141f36;border:1px solid #293957;border-radius:14px;padding:20px}.label{color:#9eafd0;font-size:13px}
.value{font-size:25px;font-weight:bold;margin-top:10px;overflow-wrap:anywhere}h2{font-size:19px;margin:28px 0 14px}
.status{display:inline-block;color:#78e0b1;background:#173d36;padding:6px 10px;border-radius:30px;font-size:12px}
.tablewrap{overflow-x:auto;background:#141f36;border:1px solid #293957;border-radius:12px}table{border-collapse:collapse;width:100%;min-width:720px}
th,td{text-align:left;padding:13px;border-bottom:1px solid #293957}th{color:#9eafd0;font-size:12px;text-transform:uppercase}
footer{color:#8294b7;font-size:12px;padding:25px 0}.up{color:#78e0b1}.down{color:#ff8e9a}
</style></head>
<body><header><h1>Crypto Scout</h1><p>Monitor de mercado e descoberta de criptomoedas</p></header>
<main><span class="status">● Monitor de mercado</span>
<div class="cards" style="margin-top:18px">
<div class="card"><div class="label">Moedas analisadas</div><div class="value" id="count">—</div></div>
<div class="card"><div class="label">Candidatas pelos filtros</div><div class="value" id="candidates">—</div></div>
<div class="card"><div class="label">Última atualização</div><div class="value" style="font-size:17px" id="updated">Carregando…</div></div>
<div class="card"><div class="label">Modo</div><div class="value" style="font-size:18px">Monitoramento</div></div></div>
<h2>Moedas acompanhadas</h2><p class="muted">Dados públicos de mercado. Candidatas são apenas moedas que passam pelos filtros de capitalização e volume; isso não significa que sejam mineráveis ou rentáveis.</p>
<div class="tablewrap"><table><thead><tr><th>Moeda</th><th>Símbolo</th><th>Preço (USD)</th><th>Capitalização</th><th>Volume 24h</th><th>Variação 24h</th></tr></thead><tbody id="rows"><tr><td colspan="6">Carregando dados…</td></tr></tbody></table></div>
<p class="muted" id="message">Aguardando a primeira consulta de mercado.</p>
<footer>Crypto Scout · Atualização automática da tela a cada 60 segundos · Não executa mineração nem transações.</footer></main>
<script>
const money=n=>n==null?'—':Number(n).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:Number(n)<1?8:2});
const compact=n=>n==null?'—':new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:2}).format(n);
const safe=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function refresh(){try{const r=await fetch('/api/market',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||('HTTP '+r.status));
document.getElementById('count').textContent=d.coins.length;
document.getElementById('candidates').textContent=d.candidates.length;
document.getElementById('updated').textContent=d.updatedAt?new Date(d.updatedAt).toLocaleString('pt-BR'):'Aguardando';
document.getElementById('rows').innerHTML=d.coins.map(c=>{const n=c.price_change_percentage_24h;return '<tr><td>'+safe(c.name)+'</td><td>'+safe(String(c.symbol||'').toUpperCase())+'</td><td>'+money(c.current_price)+'</td><td>'+compact(c.market_cap)+'</td><td>'+compact(c.total_volume)+'</td><td class="'+(n>0?'up':n<0?'down':'')+'">'+(n==null?'—':Number(n).toFixed(2)+'%')+'</td></tr>'}).join('')||'<tr><td colspan="6">Nenhuma moeda disponível.</td></tr>';
document.getElementById('message').textContent=d.error?'Aviso: '+d.error:'Fonte: CoinGecko. Filtros atuais: capitalização até US$ '+compact(d.filters.maxMarketCap)+' e volume mínimo de US$ '+compact(d.filters.minVolume)+'.';
}catch(e){document.getElementById('message').textContent='Não foi possível atualizar: '+e.message}}
refresh();setInterval(refresh,60000);
</script></body></html>`;

async function refreshMarket() {
  if (refreshing) return;
  refreshing = true;
  try {
    const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h";
    const response = await fetch(url, { headers: { "accept": "application/json", "user-agent": "CryptoScout/1.0" }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error("CoinGecko respondeu HTTP " + response.status);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Resposta inesperada da API");
    coins = data;
    updatedAt = new Date().toISOString();
    lastError = null;
  } catch (error) {
    lastError = error.message;
  } finally {
    refreshing = false;
  }
}

const server = http.createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (path === "/health" || path === "/healthz") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ status: "ok", updatedAt, coinCount: coins.length, error: lastError }));
  }
  if (path === "/api/market") {
    const candidates = coins.filter(c => Number.isFinite(c.market_cap) && c.market_cap > 0 && c.market_cap <= MAX_MARKET_CAP && Number.isFinite(c.total_volume) && c.total_volume >= MIN_VOLUME);
    res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    return res.end(JSON.stringify({ coins, candidates, candidates_count: candidates.length, updatedAt, error: lastError, filters: { maxMarketCap: MAX_MARKET_CAP, minVolume: MIN_VOLUME } }));
  }
  if (path === "/" || path === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    return res.end(page);
  }
  res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "Não encontrado" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Crypto Scout Web ouvindo na porta " + PORT);
  refreshMarket();
  setInterval(refreshMarket, REFRESH_MS);
});
