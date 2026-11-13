import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { handle, syncAll } from '../worker.js';
import { planUpdate, tierFromRoles, GRACE_MS, levelOfTier } from '../logic.js';

const D = 864e5;
const now0 = Date.UTC(2026, 10, 11, 12);

/* ---------- logika ---------- */
test('tierFromRoles: najwyższa rola wygrywa, brak = 0', () => {
  const m = { a: 1, b: 2, c: 3 };
  assert.equal(tierFromRoles(['x', 'a', 'c'], m), 3);
  assert.equal(tierFromRoles(['b'], m), 2);
  assert.equal(tierFromRoles([], m), 0);
  assert.equal(tierFromRoles(undefined, m), 0);
});
test('levelOfTier: Poziom I = 0, II = 1, III = 2', () => {
  assert.deepEqual([1, 2, 3].map(levelOfTier), [0, 1, 2]);
});
test('planUpdate: nowy wspierający dostaje poziom i ważność 3 dni', () => {
  const r = planUpdate(null, { ytTier: 2, discordId: '1' }, now0);
  assert.equal(r.action, 'created');
  assert.deepEqual(r.write, { role: 'supporter', level: 1, ytTier: 2, until: now0 + GRACE_MS, lapsedAt: null, source: 'discord', discordId: '1' });
});
test('planUpdate: ekipa nietknięta', () => {
  assert.equal(planUpdate({ role: 'member' }, { ytTier: 3, discordId: '1' }, now0).action, 'crew');
  assert.equal(planUpdate({ role: 'admin' }, null, now0).write, null);
});
test('planUpdate: ręczne wsparcie nie jest skracane, a rola z Discorda go przejmuje z dłuższą ważnością', () => {
  const ex = { role: 'supporter', level: 2, until: now0 + 20 * D, source: 'manual' };
  const r = planUpdate(ex, { ytTier: 3, discordId: '1' }, now0);
  assert.equal(r.write.until, now0 + 20 * D);
  assert.equal(r.write.source, 'discord');
  assert.equal(planUpdate(ex, null, now0).action, 'not-ours');
});
test('planUpdate: zniknięcie roli = karencja 3 dni, potem wygaśnięcie', () => {
  const ex = { role: 'supporter', level: 2, ytTier: 3, until: now0 + 2 * D, lapsedAt: null, source: 'discord', discordId: '1' };
  const r = planUpdate(ex, null, now0);
  assert.equal(r.action, 'lapsed');
  assert.deepEqual(r.write, { lapsedAt: now0, until: now0 + GRACE_MS });
  const lapsed = { ...ex, ...r.write };
  assert.equal(planUpdate(lapsed, null, now0 + 2 * D).action, 'grace');
  assert.equal(planUpdate(lapsed, null, now0 + 4 * D).action, 'expired');
});
test('planUpdate: powrót wsparcia w karencji czyści lapsedAt', () => {
  const lapsed = { role: 'supporter', level: 2, ytTier: 3, until: now0 + 2 * D, lapsedAt: now0 - D, source: 'discord', discordId: '1' };
  const r = planUpdate(lapsed, { ytTier: 3, discordId: '1' }, now0);
  assert.equal(r.write.lapsedAt, null);
  assert.ok(r.write.until >= now0 + GRACE_MS);
});
test('planUpdate: zmiana pakietu w dół działa od razu, bez zbędnych zapisów przy braku zmian', () => {
  const ex = { role: 'supporter', level: 2, ytTier: 3, until: now0 + GRACE_MS, lapsedAt: null, source: 'discord', discordId: '1' };
  assert.equal(planUpdate(ex, { ytTier: 2, discordId: '1' }, now0).write.level, 1);
  assert.equal(planUpdate(ex, { ytTier: 3, discordId: '1' }, now0 + 36e5).action, 'unchanged');
});
test('planUpdate: połączony bez roli czeka', () => {
  const ex = { role: 'supporter', level: 0, ytTier: 0, until: now0, lapsedAt: null, source: 'discord', discordId: '1' };
  assert.equal(planUpdate(ex, null, now0 + D).action, 'waiting');
});

/* ---------- Worker z podstawionym fetch ---------- */
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const env = {
  SKAUT_URL: 'https://skaut.example/', FIREBASE_API_KEY: 'k', FIREBASE_PROJECT: 'p', STATE_SECRET: 'sekret',
  DISCORD_CLIENT_ID: 'cid', DISCORD_CLIENT_SECRET: 'csec', DISCORD_BOT_TOKEN: 'bot', DISCORD_GUILD_ID: 'G',
  DISCORD_ROLES: JSON.stringify({ r1: 1, r2: 2, r3: 3 }),
  FIREBASE_SERVICE_ACCOUNT: JSON.stringify({ client_email: 'sa@x', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }),
};
function world({ roles = {}, token = 'good', email = 'Kibic@Example.com', userId = '111', rateLimit = false } = {}) {
  const db = new Map();
  const calls = [];
  const toFields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === null ? { nullValue: null } : ['until', 'lapsedAt', 'linkedAt'].includes(k) ? { timestampValue: new Date(v).toISOString() } : typeof v === 'number' ? { integerValue: String(v) } : { stringValue: v }]));
  const fromF = (f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, 'timestampValue' in v ? Date.parse(v.timestampValue) : 'integerValue' in v ? +v.integerValue : 'stringValue' in v ? v.stringValue : null]));
  globalThis.fetch = async (u, init = {}) => {
    u = String(u); calls.push(u);
    const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s });
    if (u.startsWith('https://identitytoolkit')) return init.body.includes(token) ? J({ users: [{ email, emailVerified: true }] }) : J({}, 400);
    if (u === 'https://oauth2.googleapis.com/token') return J({ access_token: 'sa-tok', expires_in: 3600 });
    if (u === 'https://discord.com/api/v10/oauth2/token') return init.body.toString().includes('code=ok') ? J({ access_token: 'user-tok' }) : J({}, 400);
    if (u === 'https://discord.com/api/v10/users/@me') return J({ id: userId });
    if (u.endsWith('/users/@me/guilds/G/member')) return roles[userId] ? J({ roles: roles[userId] }) : J({}, 404);
    if (u.startsWith('https://discord.com/api/v10/guilds/G/members/')) {
      if (rateLimit) return J({}, 429);
      const id = u.split('/').pop(); return roles[id] ? J({ roles: roles[id] }) : J({}, 404);
    }
    if (u.includes(':runQuery')) return J([...db].filter(([, v]) => v.source === 'discord').map(([id, v]) => ({ document: { name: 'projects/p/databases/(default)/documents/members/' + encodeURIComponent(id), fields: toFields(v) } })));
    const m = u.match(/documents\/members\/([^?]+)/);
    if (m) {
      const id = decodeURIComponent(m[1]);
      if ((init.method || 'GET') === 'GET') return db.has(id) ? J({ fields: toFields(db.get(id)) }) : J({}, 404);
      const body = JSON.parse(init.body); db.set(id, { ...(db.get(id) || {}), ...fromF(body.fields) }); return J({});
    }
    throw new Error('nieobsłużone ' + u);
  };
  return { db, calls };
}
const startReq = (tok) => new Request('https://w.example/link/start', { method: 'POST', headers: tok ? { Authorization: 'Bearer ' + tok } : {} });
async function stateFor(now) { const r = await handle(startReq('good'), env, now); return new URL((await r.json()).url).searchParams.get('state'); }
const cb = (state, code = 'ok') => new Request(`https://w.example/link/callback?code=${code}&state=${encodeURIComponent(state)}`);

test('/link/start: bez tokenu 401, z tokenem adres Discorda z zakresami i stanem', async () => {
  world();
  assert.equal((await handle(startReq(null), env, now0)).status, 401);
  assert.equal((await handle(startReq('zly'), env, now0)).status, 401);
  const r = await handle(startReq('good'), env, now0);
  const u = new URL((await r.json()).url);
  assert.equal(u.hostname, 'discord.com');
  assert.equal(u.searchParams.get('client_id'), 'cid');
  assert.equal(u.searchParams.get('scope'), 'identify guilds.members.read');
  assert.equal(u.searchParams.get('redirect_uri'), 'https://w.example/link/callback');
});
test('powrót z Discorda: rola Poziomu II nadaje level 1 i ważność 3 dni', async () => {
  const w = world({ roles: { 111: ['r2'] } });
  const res = await handle(cb(await stateFor(now0)), env, now0 + 1000);
  assert.equal(res.headers.get('location'), 'https://skaut.example/#discord=ok');
  const d = w.db.get('kibic@example.com');
  assert.equal(d.level, 1); assert.equal(d.ytTier, 2); assert.equal(d.source, 'discord'); assert.equal(d.discordId, '111');
  assert.equal(d.until, now0 + 1000 + GRACE_MS);
});
test('powrót z Discorda: brak roli = wpis oczekujący, poziom 0', async () => {
  const w = world({ roles: {} });
  const res = await handle(cb(await stateFor(now0)), env, now0);
  assert.equal(res.headers.get('location'), 'https://skaut.example/#discord=none');
  const d = w.db.get('kibic@example.com');
  assert.equal(d.level, 0); assert.equal(d.ytTier, 0); assert.ok(d.until <= now0);
});
test('powrót z Discorda: zły i przeterminowany stan oraz zły kod = err', async () => {
  world({ roles: { 111: ['r3'] } });
  const st = await stateFor(now0);
  assert.equal((await handle(cb('zly.stan'), env, now0)).headers.get('location'), 'https://skaut.example/#discord=err');
  assert.equal((await handle(cb(st), env, now0 + 11 * 60e3)).headers.get('location'), 'https://skaut.example/#discord=err');
  assert.equal((await handle(cb(st, 'zly'), env, now0)).headers.get('location'), 'https://skaut.example/#discord=err');
});
test('powrót z Discorda: ekipa nie jest nadpisywana', async () => {
  const w = world({ roles: { 111: ['r3'] } });
  w.db.set('kibic@example.com', { role: 'member' });
  await handle(cb(await stateFor(now0)), env, now0);
  assert.deepEqual(w.db.get('kibic@example.com'), { role: 'member' });
});
test('synchronizacja: utrata roli to karencja 3 dni, potem poziom wygasa, powrót roli odnawia', async () => {
  const w = world({ roles: { 111: ['r3'] } });
  await handle(cb(await stateFor(now0)), env, now0);
  assert.equal(w.db.get('kibic@example.com').level, 2);
  // rola znika
  const world2 = w; // ta sama baza
  const roles = {};
  globalThis.fetchRoles = roles;
  const orig = globalThis.fetch;
  globalThis.fetch = async (u, i) => String(u).includes('/guilds/G/members/') ? new Response('{}', { status: 404 }) : orig(u, i);
  let r = await syncAll(env, now0 + 2 * D);
  assert.equal(r.changed, 1);
  let d = w.db.get('kibic@example.com');
  assert.equal(d.lapsedAt, now0 + 2 * D); assert.equal(d.until, now0 + 5 * D);
  r = await syncAll(env, now0 + 4 * D); assert.equal(r.changed, 0);
  assert.equal(w.db.get('kibic@example.com').until, now0 + 5 * D); // nic nie przedłużone
  // rola wraca w karencji
  globalThis.fetch = orig;
  r = await syncAll(env, now0 + 4 * D);
  d = w.db.get('kibic@example.com');
  assert.equal(d.lapsedAt, null); assert.ok(d.until >= now0 + 4 * D + GRACE_MS);
});
test('synchronizacja: obniżenie pakietu działa od razu', async () => {
  const w = world({ roles: { 111: ['r3'] } });
  await handle(cb(await stateFor(now0)), env, now0);
  const roles = { 111: ['r1'] };
  const orig = globalThis.fetch;
  globalThis.fetch = async (u, i) => String(u).includes('/guilds/G/members/') ? new Response(JSON.stringify({ roles: roles[111] }), { status: 200 }) : orig(u, i);
  await syncAll(env, now0 + 7 * 36e5);
  assert.equal(w.db.get('kibic@example.com').level, 0);
  assert.equal(w.db.get('kibic@example.com').ytTier, 1);
});
test('synchronizacja: limit zapytań Discorda zatrzymuje partię bez błędów danych', async () => {
  const w = world({ roles: { 111: ['r3'] }, rateLimit: false });
  await handle(cb(await stateFor(now0)), env, now0);
  world({ roles: {}, rateLimit: true }); // nowy fetch, ale zachowujemy stare dane
  const w2 = world({ rateLimit: true });
  w2.db.set('kibic@example.com', w.db.get('kibic@example.com'));
  const r = await syncAll(env, now0 + 2 * D);
  assert.equal(r.stoppedByRateLimit, true);
  assert.equal(w2.db.get('kibic@example.com').level, 2);
});

test('CORS: główny adres i adresy z SKAUT_ORIGINS są dozwolone, obcy dostaje adres główny', async () => {
  const e = { ...env, SKAUT_URL: 'https://rtsskaut.pl/', SKAUT_ORIGINS: 'https://rtsskaut.pages.dev, https://inny.example' };
  const ask = (origin) => handle(new Request('https://w.example/link/start', { method: 'OPTIONS', headers: { Origin: origin } }), e, now0);
  assert.equal((await ask('https://rtsskaut.pages.dev')).headers.get('Access-Control-Allow-Origin'), 'https://rtsskaut.pages.dev');
  assert.equal((await ask('https://inny.example')).headers.get('Access-Control-Allow-Origin'), 'https://inny.example');
  assert.equal((await ask('https://rtsskaut.pl')).headers.get('Access-Control-Allow-Origin'), 'https://rtsskaut.pl');
  assert.equal((await ask('https://zly.example')).headers.get('Access-Control-Allow-Origin'), 'https://rtsskaut.pl');
});
