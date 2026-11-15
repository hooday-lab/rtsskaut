/* RTS Skaut: licznik użycia (bez e-maili) i jego podsumowanie dla admina.
   Czysta logika bez dostępu do przeglądarki i bazy, żeby dało się ją testować (access/test/usage.test.mjs).
   Dokument usage/{uid} (uid konta Firebase, bez adresu e-mail):
     tier 0..3 (0 darmowy, 1 Poziom I, 2 Poziom II, 3 Poziom III), crew (ekipa i admin),
     created (data założenia konta), last (ostatnia wizyta), visits (liczba wejść),
     d {RRRR-MM-DD: true} (dni aktywności), cards {typ: n} (otwarte karty), lock {typ: n} (kliknięcia w kartę z kłódką),
     dl (pobrania PNG), sh (udostępnienia). */
(function (g) {
  const DAY = 864e5;
  const TIER_NAMES = ['Darmowi', 'Poziom I', 'Poziom II', 'Poziom III'];
  const STATUSES = ['Nowy', 'Aktywny', 'Wracający', 'Uśpiony'];
  const GAP_DAYS = 7;      // przerwa, po której powrót liczy się jako „Wracający”
  const SLEEP_DAYS = 14;   // brak wizyty dłużej niż tyle = „Uśpiony”

  // Poziom do zapisu: ekipa osobno, wspierający wg poziomu i ważności, reszta darmowa.
  function tierOf(ctx, now) {
    if (ctx.isAdmin || ctx.role === 'member') return { tier: 0, crew: true };
    if (ctx.role === 'supporter' && ctx.until && ctx.until > now) {
      const l = ctx.level == null ? 2 : Math.max(0, Math.min(2, +ctx.level));
      return { tier: l + 1, crew: false };
    }
    return { tier: 0, crew: false };
  }
  const dayKey = (d) => new Date(d).toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });
  const dayMs = (k) => Date.parse(k + 'T12:00:00Z');

  // Status użytkownika: Uśpiony > Nowy (jeden dzień) > Wracający (przerwa) > Aktywny.
  function statusOf(u, now) {
    const days = Object.keys(u.d || {}).sort();
    if (!u.last || now - u.last > SLEEP_DAYS * DAY) return 'Uśpiony';
    if (days.length <= 1) return 'Nowy';
    for (let i = 1; i < days.length; i++) if (dayMs(days[i]) - dayMs(days[i - 1]) >= GAP_DAYS * DAY) return 'Wracający';
    return 'Aktywny';
  }

  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const objSum = (o) => sum(Object.values(o || {}).map(Number));

  /* docs: [{tier, crew, created, last, visits, d, cards, lock, dl, sh}] (daty w ms).
     opts: {now, range (dni), onlyFans}. */
  function aggregate(docs, opts) {
    const now = opts.now, R = opts.range;
    const list = docs.filter((u) => opts.onlyFans ? !u.crew : true);
    const groupOf = (u) => (u.crew ? 'crew' : Math.max(0, Math.min(3, u.tier | 0)));
    const keys = opts.onlyFans ? [0, 1, 2, 3] : [0, 1, 2, 3, 'crew'];
    const isNew = (u) => u.created >= now - R * DAY && u.created <= now;
    const wasNew = (u) => u.created >= now - 2 * R * DAY && u.created < now - R * DAY;

    const rows = keys.map((k) => {
      const us = list.filter((u) => groupOf(u) === k && isNew(u));
      const n = us.length, avg = (f) => (n ? sum(us.map(f)) / n : 0);
      const st = STATUSES.map((s) => us.filter((u) => statusOf(u, now) === s).length);
      return {
        key: k, name: k === 'crew' ? 'Ekipa i admin' : TIER_NAMES[k], n,
        visits: avg((u) => u.visits || 0),
        days: avg((u) => Object.keys(u.d || {}).filter((x) => { const t = dayMs(x); return t >= u.created - DAY && t <= u.created + 7 * DAY; }).length),
        cards: avg((u) => objSum(u.cards)), dl: avg((u) => u.dl || 0), sh: avg((u) => u.sh || 0), st,
      };
    });
    const total = sum(rows.map((r) => r.n));
    const prev = list.filter(wasNew).length;
    const supporters = sum(rows.filter((r) => typeof r.key === 'number' && r.key >= 1).map((r) => r.n));
    const active = sum(rows.map((r) => r.st[1] + r.st[2]));
    const cardsTotal = sum(rows.map((r) => r.cards * r.n));

    const weeks = [];
    for (let w = 7; w >= 0; w--) {
      const to = now - w * 7 * DAY, from = to - 7 * DAY;
      const cnt = [0, 0, 0, 0];
      list.forEach((u) => { if (!u.crew && u.created > from && u.created <= to) cnt[Math.max(0, Math.min(3, u.tier | 0))]++; });
      weeks.push(cnt);
    }

    // Użycie kart i kłódki: sumy od początku zbierania (licznik nie ma podziału na dni).
    const use = {}, lock = {};
    list.forEach((u) => {
      const g = groupOf(u);
      Object.entries(u.cards || {}).forEach(([c, n]) => { (use[c] = use[c] || {})[g] = (use[c][g] || 0) + Number(n); });
      if (!u.crew) Object.entries(u.lock || {}).forEach(([c, n]) => { lock[c] = (lock[c] || 0) + Number(n); });
    });
    return { rows, total, prev, supporters, active, cardsTotal, weeks, use, lock, users: list.length };
  }

  const api = { tierOf, dayKey, statusOf, aggregate, TIER_NAMES, STATUSES, DAY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else g.RTSUsage = api;
})(typeof window !== 'undefined' ? window : globalThis);
