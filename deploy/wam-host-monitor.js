#!/usr/bin/env node
"use strict";

/*
 * Local-only bridge between the WAM dashboard container and the host miner.
 * It exposes read-only status/log data; it never starts, stops or changes mining.
 */
const http = require("node:http");
const os = require("node:os");
const { execFileSync } = require("node:child_process");

const HOST = process.env.WAM_MONITOR_BIND || "172.18.0.1";
const PORT = Number(process.env.WAM_MONITOR_PORT || 9557);
const SERVICE = process.env.WAM_MINER_SERVICE || "wam-miner.service";
const WALLET = process.env.WAM_WALLET || "wam1qch64hevyaz5lgwjfm9vv487hemev4g2qssfksc";
const POOL = process.env.WAM_POOL || "stratum+tcp://pool.wamcoin.org:3334";

function run(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      timeout: 3500,
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 1024 * 1024
    }).trim();
  } catch {
    return "";
  }
}
function parseValue(text, key) {
  const m = text.match(new RegExp("(?:^|\\s)" + key + "=([^\\n]+)"));
  return m ? m[1].trim() : null;
}
function duration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor(seconds % 86400 / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  return (d ? d + "d " : "") + h + "h " + m + "m";
}
function parseMinerStats(logs) {
  const lines = logs.split("\n");
  let stats = null;
  let job = null;
  for (const line of lines) {
    const s = line.match(/stats\\s+([0-9.]+)\\s+H\\/s\\s+accepted\\s+(\\d+)\\s+rejected\\s+(\\d+)\\s+blocks\\s+(\\d+)\\s+total\\s+(\\d+)\\s+hashes/i);
    if (s) stats = {
      hashrate: Number(s[1]),
      validShares: Number(s[2]),
      rejectedShares: Number(s[3]),
      blocksFound: Number(s[4]),
      totalHashes: Number(s[5])
    };
    const j = line.match(/job\\s+job\\s+([a-z0-9]+)\\s+height\\s+(\\d+)\\s+diff\\s+([0-9.e+-]+)/i);
    if (j) job = { jobId: j[1], height: Number(j[2]), difficulty: Number(j[3]) };
  }
  return { stats, job, lines: lines.filter(Boolean).slice(-100) };
}
function getStatus() {
  const serviceState = run("systemctl", ["is-active", SERVICE]);
  const props = run("systemctl", ["show", SERVICE, "-p", "MainPID", "-p", "ActiveEnterTimestamp", "-p", "ExecStart", "--no-pager"]);
  const pid = Number(parseValue(props, "MainPID") || 0);
  const execStart = parseValue(props, "ExecStart") || "";
  const threadsMatch = execStart.match(/(?:^|\\s)-t\\s+(\\d+)/);
  const threads = threadsMatch ? Number(threadsMatch[1]) : null;
  const logs = run("journalctl", ["-u", SERVICE, "-n", "250", "--no-pager", "-o", "cat"]);
  const parsed = parseMinerStats(logs);
  const process = pid > 0 ? run("ps", ["-p", String(pid), "-o", "%cpu=,rss=,etimes=,comm="]) : "";
  const p = process.trim().split(/\\s+/);
  const cpuPercent = p.length >= 3 ? Number(p[0]) : null;
  const memoryUsedMb = p.length >= 3 ? Math.round(Number(p[1]) / 1024) : null;
  const elapsed = p.length >= 3 ? Number(p[2]) : null;
  const threadLines = pid > 0 ? run("ps", ["-L", "-p", String(pid), "-o", "tid=,%cpu=,comm="]) : "";
  const threadStats = threadLines.split("\n").filter(Boolean).map((line, i) => {
    const bits = line.trim().split(/\\s+/);
    return { id: bits[0] || String(i + 1), cpuPercent: Number(bits[1]) || 0 };
  });
  return {
    monitorConnected: true,
    serviceName: SERVICE,
    serviceActive: serviceState === "active",
    minerActive: serviceState === "active" && pid > 0,
    pid: pid || null,
    pool: POOL,
    wallet: WALLET,
    threads,
    activeThreads: threadStats.filter(t => t.cpuPercent > 1).length || null,
    cpuCount: os.cpus().length,
    cpuPercent: Number.isFinite(cpuPercent) ? cpuPercent : null,
    memoryUsedMb: Number.isFinite(memoryUsedMb) ? memoryUsedMb : null,
    uptime: duration(elapsed),
    hashrate: parsed.stats?.hashrate ?? null,
    validShares: parsed.stats?.validShares ?? null,
    rejectedShares: parsed.stats?.rejectedShares ?? null,
    blocksFound: parsed.stats?.blocksFound ?? null,
    totalHashes: parsed.stats?.totalHashes ?? null,
    height: parsed.job?.height ?? null,
    difficulty: parsed.job?.difficulty ?? null,
    jobId: parsed.job?.jobId ?? null,
    threadStats,
    hashrateHistory: [],
    blocksFoundSource: "estatística do wam-miner no journal",
    updatedAt: new Date().toISOString()
  };
}
function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "access-control-allow-origin": "null"
  });
  res.end(JSON.stringify(body));
}
const server = http.createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (req.method !== "GET") return json(res, 405, { error: "Método não permitido" });
  if (path === "/health") return json(res, 200, { status: "ok", service: SERVICE });
  if (path === "/status") return json(res, 200, getStatus());
  if (path === "/logs") {
    const logs = run("journalctl", ["-u", SERVICE, "-n", "100", "--no-pager", "-o", "short-iso"]);
    return json(res, 200, { available: Boolean(logs), lines: logs ? logs.split("\n").filter(Boolean).slice(-100) : [] });
  }
  return json(res, 404, { error: "Não encontrado" });
});
server.listen(PORT, HOST, () => console.log("WAM host monitor ouvindo em " + HOST + ":" + PORT));
server.on("error", error => {
  console.error("Falha ao iniciar monitor WAM:", error.message);
  process.exit(1);
});
