import { performance } from 'node:perf_hooks';

const apiBase = new URL(process.env.API_BASE_URL ?? 'http://127.0.0.1:3000/api/v1/');
const isLocal = ['127.0.0.1', 'localhost'].includes(apiBase.hostname);
if (!isLocal && process.env.ALLOW_REMOTE_SMOKE !== 'true') {
  throw new Error('Remote performance smoke requires ALLOW_REMOTE_SMOKE=true.');
}
if (!isLocal && apiBase.protocol !== 'https:') throw new Error('Remote performance smoke requires HTTPS.');
if (!apiBase.pathname.endsWith('/')) apiBase.pathname += '/';

const login = await fetch(new URL('auth/login', apiBase), {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    email: process.env.DEMO_EMAIL ?? 'demo@luckgage.app',
    password: process.env.DEMO_PASSWORD ?? 'DemoLuckgage2026!',
  }),
});
if (!login.ok) throw new Error(`Demo login failed with HTTP ${login.status}.`);
const { accessToken } = await login.json();
if (typeof accessToken !== 'string') throw new Error('Demo login did not return an access token.');
const headers = { authorization: `Bearer ${accessToken}` };

const routes = ['trips?page=1&pageSize=20', 'guides?page=1&pageSize=20', 'trip-suggestions?page=1&pageSize=20'];
const tripResponse = await fetch(new URL(routes[0], apiBase), { headers });
if (!tripResponse.ok) throw new Error(`Trip list failed with HTTP ${tripResponse.status}.`);
const tripPage = await tripResponse.json();
if (tripPage.items?.[0]?.id) routes.push(`trips/${encodeURIComponent(tripPage.items[0].id)}/checklist`);

for (const route of routes) {
  const durations = [];
  for (let sample = 0; sample < 20; sample += 1) {
    const started = performance.now();
    const response = await fetch(new URL(route, apiBase), { headers });
    await response.arrayBuffer();
    if (!response.ok) throw new Error(`${route} failed with HTTP ${response.status}.`);
    durations.push(performance.now() - started);
  }
  durations.sort((left, right) => left - right);
  const p50 = durations[Math.ceil(durations.length * 0.5) - 1];
  const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
  console.log(`${route}: p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms n=${durations.length}`);
}
