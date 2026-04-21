/**
 * keepalive.js — Run this on a free cron service (cron-job.org, etc.)
 * to prevent Render free-tier cold starts.
 *
 * Or set up in package.json: "keepalive": "node keepalive.js"
 * Then schedule it every 5 minutes via an external service.
 *
 * Alternatively — use UptimeRobot to ping /api/health every 5 minutes.
 */
const https = require('https');
const http  = require('http');

const URL = process.env.BACKEND_URL || 'https://your-snackzone-api.onrender.com';
const mod  = URL.startsWith('https') ? https : http;

mod.get(`${URL}/api/health`, (res) => {
  let body = '';
  res.on('data', chunk => { body += chunk; });
  res.on('end', () => {
    console.log(`[${new Date().toISOString()}] ✅ Server awake:`, body.slice(0, 80));
  });
}).on('error', (err) => {
  console.error(`[${new Date().toISOString()}] ❌ Ping failed:`, err.message);
});
