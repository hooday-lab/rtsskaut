// RTS Skaut: łączenie konta z Discordem i godzinna synchronizacja poziomów wsparcia (Cloudflare Worker, moduł ES).
// Trasy: POST /link/start (token Firebase w nagłówku) -> {url}; GET /link/callback (powrót z Discorda);
// harmonogram (cron) co godzinę odświeża poziomy osób połączonych. Sekrety tylko w zmiennych Workera, nie w repo.
import { GRACE_MS, planUpdate, tierFromRoles } from './logic.js';

const TS_FIELDS = new Set(['until', 'lapsedAt', 'linkedAt']);
const D = 'https://discord.com/api/v10';
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

// Dozwolone adresy aplikacji: główny z SKAUT_URL oraz opcjonalne z SKAUT_ORIGINS (lista po przecinku, np. zapasowy adres pages.dev).
const entries = (env) => [env.SKAUT_URL, ...String(env.SKAUT_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)];
const originOf = (u) => new URL(u).origin;
const origins = (env) => entries(env).map(originOf);
// Adres powrotu: ten, z którego kibic zaczął łączenie (jeśli jest na liście), inaczej główny SKAUT_URL.
const returnUrl = (env, origin) => entries(env).find((u) => originOf(u) === origin) || env.SKAUT_URL;
const cors = (env, req) => {
  const list = origins(env);
  const asked = req && req.headers && req.headers.get('Origin');
  const o = list.includes(asked) ? asked : list[0];
  return { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
};
const json = (obj, status, env, req) => new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json', ...cors(env, req) } });
// detail: krótki kod przyczyny błędu (bez sekretów), pokazywany w aplikacji, żeby dało się szybko znaleźć problem.
const back = (env, r, origin, detail) => Response.redirect(returnUrl(env, origin).split('#')[0] + '#discord=' + r + (detail ? '&c=' + encodeURIComponent(String(detail).slice(0, 80)) : ''), 302);

/* ---------- podpis stanu (powiązuje powrót z Discorda z zalogowanym kontem Google) ---------- */
async function hmacKey(secret) { return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']); }
async function signState(env, email, now, origin, kind) {
  const body = b64u(enc.encode(JSON.stringify({ e: email, t: now, o: origin || '', k: kind || '' })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env.STATE_SECRET), enc.encode(body));
  return body + '.' + b64u(sig);
}
async function readState(env, state, now) {
  const [body, sig] = String(state || '').split('.');
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(env.STATE_SECRET), unb64u(sig), enc.encode(body));
  if (!ok) return null;
  const o = JSON.parse(new TextDecoder().decode(unb64u(body)));
  return now - o.t < 10 * 60e3 && now >= o.t ? o : null;
}

/* ---------- Firebase: weryfikacja tokenu i Firestore REST kontem serwisowym ---------- */
async function verifyIdToken(env, idToken) {
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + env.FIREBASE_API_KEY, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
  });
  if (!r.ok) return null;
  const u = ((await r.json()).users || [])[0];
  return u && u.email && u.emailVerified ? u.email.toLowerCase() : null;
}
const rsaKey = (sa) => crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----|\s/g, '')), (c) => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
// Token logowania Firebase (custom token) podpisany kontem serwisowym. Ważny 10 minut, aplikacja zamienia go na sesję.
async function customToken(env, uid, claims, now) {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const iat = Math.floor(now / 1000);
  const head = b64u(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const body = b64u(enc.encode(JSON.stringify({ iss: sa.client_email, sub: sa.client_email, aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit', iat, exp: iat + 600, uid, claims })));
  const sig = b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', await rsaKey(sa), enc.encode(head + '.' + body)));
  return head + '.' + body + '.' + sig;
}
let tokCache = { t: null, exp: 0 };
async function saToken(env, now) {
  if (tokCache.t && tokCache.exp > now + 60e3) return tokCache.t;
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const head = b64u(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const iat = Math.floor(now / 1000);
  const claim = b64u(enc.encode(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 })));
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----|\s/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(head + '.' + claim)));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + head + '.' + claim + '.' + sig });
  if (!r.ok) throw new Error('service-account token ' + r.status);
  const j = await r.json();
  tokCache = { t: j.access_token, exp: now + (j.expires_in || 3600) * 1000 };
  return tokCache.t;
}
const fsBase = (env) => `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT || 'rtsstat-55616'}/databases/(default)/documents`;
const toFS = (k, v) => v === null || v === undefined ? { nullValue: null } : TS_FIELDS.has(k) ? { timestampValue: new Date(v).toISOString() } : typeof v === 'number' ? { integerValue: String(v) } : { stringValue: String(v) };
const fromFS = (f) => { const o = {}; for (const [k, v] of Object.entries(f || {})) o[k] = 'timestampValue' in v ? Date.parse(v.timestampValue) : 'integerValue' in v ? Number(v.integerValue) : 'stringValue' in v ? v.stringValue : null; return o; };
async function getMember(env, email, now) {
  const r = await fetch(fsBase(env) + '/members/' + encodeURIComponent(email), { headers: { Authorization: 'Bearer ' + await saToken(env, now) } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('firestore get ' + r.status);
  return fromFS((await r.json()).fields);
}
async function patchMember(env, email, fields, now) {
  const mask = Object.keys(fields).map((k) => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  const body = { fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, toFS(k, v)])) };
  const r = await fetch(fsBase(env) + '/members/' + encodeURIComponent(email) + '?' + mask, { method: 'PATCH', headers: { Authorization: 'Bearer ' + await saToken(env, now), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('firestore patch ' + r.status);
}
async function listLinked(env, now) {
  const r = await fetch(fsBase(env) + ':runQuery', { method: 'POST', headers: { Authorization: 'Bearer ' + await saToken(env, now), 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'members' }], where: { fieldFilter: { field: { fieldPath: 'source' }, op: 'EQUAL', value: { stringValue: 'discord' } } } } }) });
  if (!r.ok) throw new Error('firestore query ' + r.status);
  return (await r.json()).filter((x) => x.document).map((x) => ({ email: decodeURIComponent(x.document.name.split('/').pop()), data: fromFS(x.document.fields) }));
}

/* ---------- Discord ---------- */
const rolesMap = (env) => JSON.parse(env.DISCORD_ROLES || '{}');
async function userRoles(env, accessToken) {
  const me = await fetch(D + '/users/@me', { headers: { Authorization: 'Bearer ' + accessToken } });
  if (!me.ok) throw new Error('discord me ' + me.status);
  const u = await me.json();
  const id = u.id, extra = { email: u.email || '', verified: !!u.verified, name: u.global_name || u.username || '' };
  const m = await fetch(`${D}/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`, { headers: { Authorization: 'Bearer ' + accessToken } });
  if (m.status === 404 || m.status === 403) return { id, roles: [], ...extra };
  if (!m.ok) throw new Error('discord member ' + m.status);
  return { id, roles: (await m.json()).roles || [], ...extra };
}
async function botRoles(env, discordId) {
  const m = await fetch(`${D}/guilds/${env.DISCORD_GUILD_ID}/members/${discordId}`, { headers: { Authorization: 'Bot ' + env.DISCORD_BOT_TOKEN } });
  if (m.status === 404) return { roles: [] };
  if (m.status === 429) { const e = new Error('rate-limit'); e.rate = true; throw e; }
  if (!m.ok) throw new Error('discord bot member ' + m.status);
  return { roles: (await m.json()).roles || [] };
}

/* ---------- zapis wyniku (wspólny dla powrotu z Discorda i harmonogramu) ---------- */
async function applyResult(env, email, existing, found, now) {
  const plan = planUpdate(existing, found, now);
  if (plan.write) await patchMember(env, email, plan.write, now);
  return plan.action;
}

// Krótki opis nieudanej odpowiedzi Discorda: status i nazwa błędu (np. invalid_client), bez sekretów.
const whyFailed = async (r) => 'token ' + r.status + (await r.json().then((j) => ' ' + (j.error || ''), () => '')).trimEnd();

// Adresy, które muszą logować się przez Google (admin, ekipa): nigdy przez Discord.
const crewEmails = (env) => String(env.CREW_EMAILS || 'hooday@gmail.com').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

// Logowanie przez Discord: role z serwera -> poziom w bazie -> token logowania Firebase z adresem e-mail.
// Zweryfikowany e-mail z Discorda łączy konto z Google (ten sam wpis w bazie), brak = adres techniczny <id>@discord.invalid.
async function loginFlow(env, url, st, code, now) {
  const tr = await fetch(D + '/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: url.origin + '/link/callback' }) });
  if (!tr.ok) return back(env, 'err', st.o, await whyFailed(tr));
  const { id, roles, email, verified, name } = await userRoles(env, (await tr.json()).access_token);
  const key = verified && email ? email.toLowerCase() : id + '@discord.invalid';
  if (crewEmails(env).includes(key)) return back(env, 'crew', st.o);
  const existing = await getMember(env, key, now);
  if (existing && (existing.role === 'admin' || existing.role === 'member')) return back(env, 'crew', st.o);
  const tier = tierFromRoles(roles, rolesMap(env));
  if (tier || existing) {
    await applyResult(env, key, existing, tier ? { ytTier: tier, discordId: id } : null, now);
    if (tier && !(existing && existing.discordId === id)) await patchMember(env, key, { discordId: id, linkedAt: now }, now);
  }
  const tok = await customToken(env, 'discord:' + id, { email: key, email_verified: true, provider: 'discord', dn: name }, now);
  return Response.redirect(returnUrl(env, st.o).split('#')[0] + '#dlogin=' + tok, 302);
}

async function handle(req, env, now) {
  const url = new URL(req.url);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env, req) });
  if (url.pathname === '/health') return json({ ok: true }, 200, env, req);

  if (url.pathname === '/link/start' && req.method === 'POST') {
    const auth = req.headers.get('Authorization') || '';
    const email = auth.startsWith('Bearer ') ? await verifyIdToken(env, auth.slice(7)) : null;
    if (!email) return json({ error: 'unauthorized' }, 401, env, req);
    const asked = req.headers.get('Origin');
    const state = await signState(env, email, now, origins(env).includes(asked) ? asked : '');
    const redirect = url.origin + '/link/callback';
    const q = new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, response_type: 'code', redirect_uri: redirect, scope: 'identify guilds.members.read', state, prompt: 'none' });
    return json({ url: 'https://discord.com/oauth2/authorize?' + q }, 200, env, req);
  }

  if (url.pathname === '/login/start' && req.method === 'GET') {
    const asked = url.searchParams.get('o') || '';
    const state = await signState(env, '', now, origins(env).includes(asked) ? asked : '', 'login');
    const q = new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, response_type: 'code', redirect_uri: url.origin + '/link/callback', scope: 'identify email guilds.members.read', state, prompt: 'none' });
    return Response.redirect('https://discord.com/oauth2/authorize?' + q, 302);
  }

  if (url.pathname === '/link/callback' && req.method === 'GET') {
    let stOrigin;
    try {
      const st = await readState(env, url.searchParams.get('state'), now);
      stOrigin = st && st.o;
      const code = url.searchParams.get('code');
      if (!st || !code) return back(env, 'err', st && st.o, !st ? 'state' : 'no-code');
      if (st.k === 'login') return await loginFlow(env, url, st, code, now);
      const tr = await fetch(D + '/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: url.origin + '/link/callback' }) });
      if (!tr.ok) return back(env, 'err', st.o, await whyFailed(tr));
      const { id, roles } = await userRoles(env, (await tr.json()).access_token);
      const tier = tierFromRoles(roles, rolesMap(env));
      const existing = await getMember(env, st.e, now);
      if (existing && (existing.role === 'admin' || existing.role === 'member')) return back(env, 'ok', st.o);
      if (!tier && !existing) {
        await patchMember(env, st.e, { role: 'supporter', level: 0, ytTier: 0, until: now, lapsedAt: null, source: 'discord', discordId: id, linkedAt: now }, now);
        return back(env, 'none', st.o);
      }
      if (!tier && existing && existing.source !== 'discord') {
        await patchMember(env, st.e, { discordId: id, linkedAt: now }, now); // zachowaj ręczne wsparcie, zapamiętaj Discorda
        return back(env, 'none', st.o);
      }
      await applyResult(env, st.e, existing, tier ? { ytTier: tier, discordId: id } : null, now);
      if (tier && !(existing && existing.discordId === id)) await patchMember(env, st.e, { discordId: id, linkedAt: now }, now);
      return back(env, tier ? 'ok' : 'none', st.o);
    } catch (e) {
      console.log('callback error', e.message);
      return back(env, 'err', stOrigin, e.message);
    }
  }
  return new Response('Not found', { status: 404 });
}

// Godzinna synchronizacja: sprawdza role osób połączonych (bot Discorda, bez ich tokenów).
export async function syncAll(env, now) {
  const out = { checked: 0, changed: 0, errors: 0, stoppedByRateLimit: false };
  const rows = await listLinked(env, now);
  for (const { email, data } of rows) {
    if (!data.discordId) continue;
    out.checked++;
    try {
      const { roles } = await botRoles(env, data.discordId);
      const tier = tierFromRoles(roles, rolesMap(env));
      const act = await applyResult(env, email, data, tier ? { ytTier: tier, discordId: data.discordId } : null, now);
      if (['created', 'renewed', 'lapsed'].includes(act)) out.changed++;
    } catch (e) {
      if (e.rate) { out.stoppedByRateLimit = true; break; }
      out.errors++;
    }
  }
  return out;
}

export default {
  fetch: (req, env) => handle(req, env, Date.now()),
  scheduled: (event, env, ctx) => ctx.waitUntil(syncAll(env, Date.now()).then((r) => console.log('sync', JSON.stringify(r)))),
};
export { handle };
