import test from 'node:test';
import assert from 'node:assert/strict';
import U from '../../usage.js';

const D = U.DAY;
const now = Date.UTC(2026, 10, 15, 12);
const day = (ago) => U.dayKey(now - ago * D);
const mk = (o) => ({ tier: 0, crew: false, created: now - 3 * D, last: now - D, visits: 1, d: { [day(1)]: true }, cards: {}, lock: {}, dl: 0, sh: 0, ...o });

test('tierOf: ekipa, ważny wspierający, wygasły i darmowy', () => {
  assert.deepEqual(U.tierOf({ isAdmin: true }, new Date(now)), { tier: 0, crew: true });
  assert.deepEqual(U.tierOf({ role: 'member' }, new Date(now)), { tier: 0, crew: true });
  const until = new Date(now + D);
  assert.equal(U.tierOf({ role: 'supporter', level: 0, until }, new Date(now)).tier, 1);
  assert.equal(U.tierOf({ role: 'supporter', level: 1, until }, new Date(now)).tier, 2);
  assert.equal(U.tierOf({ role: 'supporter', level: 2, until }, new Date(now)).tier, 3);
  assert.equal(U.tierOf({ role: 'supporter', until }, new Date(now)).tier, 3, 'brak pola level = Poziom III');
  assert.equal(U.tierOf({ role: 'supporter', level: 2, until: new Date(now - D) }, new Date(now)).tier, 0, 'wygasły = darmowy');
  assert.deepEqual(U.tierOf({ role: null }, new Date(now)), { tier: 0, crew: false });
});

test('statusOf: Nowy, Aktywny, Wracający, Uśpiony', () => {
  assert.equal(U.statusOf(mk({}), now), 'Nowy');
  assert.equal(U.statusOf(mk({ d: { [day(1)]: true, [day(2)]: true } }), now), 'Aktywny');
  assert.equal(U.statusOf(mk({ d: { [day(1)]: true, [day(12)]: true } }), now), 'Wracający');
  assert.equal(U.statusOf(mk({ last: now - 20 * D, d: { [day(20)]: true, [day(21)]: true } }), now), 'Uśpiony');
});

test('aggregate: nowi wg poziomów, filtr „tylko kibice”, poprzedni okres', () => {
  const docs = [
    mk({ tier: 0, cards: { match: 2, player: 1 }, dl: 1 }),
    mk({ tier: 0, created: now - 40 * D }),                       // nie nowy w 30 dniach, ale poprzedni okres
    mk({ tier: 2, visits: 5, cards: { player: 4 }, sh: 2, lock: { growth: 3 } }),
    mk({ tier: 3, created: now - 2 * D, d: { [day(1)]: true, [day(2)]: true } }),
    mk({ crew: true, cards: { match: 50 } }),
  ];
  const a = U.aggregate(docs, { now, range: 30, onlyFans: true });
  assert.deepEqual(a.rows.map((r) => r.n), [1, 0, 1, 1]);
  assert.equal(a.total, 3);
  assert.equal(a.prev, 1);
  assert.equal(a.supporters, 2);
  assert.equal(a.rows[0].cards, 3);
  assert.equal(a.rows[2].visits, 5);
  assert.deepEqual(a.use.match, { 0: 2 }, 'ekipa wyłączona z użycia kart');
  assert.equal(a.lock.growth, 3);
  assert.equal(a.weeks.length, 8);

  const b = U.aggregate(docs, { now, range: 30, onlyFans: false });
  assert.equal(b.rows.length, 5);
  assert.equal(b.rows[4].n, 1);
  assert.equal(b.use.match[0], 2);
  assert.equal(b.use.match.crew, 50);
});

test('aggregate: pusta baza nie wywala liczenia', () => {
  const a = U.aggregate([], { now, range: 7, onlyFans: true });
  assert.equal(a.total, 0);
  assert.ok(a.rows.every((r) => r.n === 0 && r.visits === 0));
});

test('rowPlausible: odrzuca wiersze niemożliwe w Ekstraklasie', () => {
  assert.equal(U.rowPlausible([1, 'Widzew', 'D', 2229, 25]), true);
  assert.equal(U.rowPlausible([1, 'Widzew', 'D', 3060, 34]), true);
  assert.equal(U.rowPlausible([2, 'Widzew', 'G', 5675, 63]), false, 'Ravas 2022: dwa kluby zsumowane');
  assert.equal(U.rowPlausible([3, 'Widzew', 'F', 1000, 35]), false, 'więcej niż 34 mecze');
  assert.equal(U.rowPlausible([4, 'Widzew', 'F', 3300, 30]), false, 'ponad 3200 minut');
});
