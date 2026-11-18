"""Kontrola spójności danych RTS Skaut (bieżący sezon i historia). Tylko odczyt plików, nic nie zapisuje.
Użycie: python3 -I scripts/kontrola-danych.py <katalog>
Katalog zawiera: stats.json (zawartość data/stats) oraz opcjonalnie h2021.json … h2025.json (zawartość data/history_<sezon>).
Kod wyjścia 1, gdy są błędy krytyczne (niemożliwe wartości, niezgodność sum), 0 gdy tylko ostrzeżenia lub brak uwag.
Czego NIE sprawdza: czy mecze są z Ekstraklasy (to wymaga bazy: patrz docs/historia-dane-incydent.md, pkt „Puchar Polski”)."""
import json, os, sys
from collections import Counter, defaultdict
D = sys.argv[1]
err, warn = [], []

def load(name):
    p = os.path.join(D, name)
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None

d = load('stats.json')
if d:
    TN = {t[0]: t[2] for t in d['teams']}
    fx = d['fx']; ids = [f[0] for f in fx]
    if len(ids) != len(set(ids)): err.append('stats: duplikaty id meczów')
    ft = [f for f in fx if f[9] == 'FT']
    if len(d['tstats']) != 2 * len(ft): err.append(f"stats: tstats {len(d['tstats'])} != 2 x mecze FT {len(ft)}")
    per_round = Counter(f[1] for f in fx)
    if any(v > 9 for v in per_round.values()): err.append('stats: kolejka ma więcej niż 9 meczów')
    games = Counter(); gf = defaultdict(int)
    for f in ft:
        games[f[3]] += 1; games[f[4]] += 1; gf[f[3]] += f[5] or 0; gf[f[4]] += f[6] or 0
    ev = len(d['goals']); fg = sum((f[5] or 0) + (f[6] or 0) for f in ft)
    if ev != fg: err.append(f'stats: bramki w zdarzeniach {ev} != w tabeli meczów {fg}')
    pg = defaultdict(int)
    for p in d['players']: pg[p[2]] += p[8]
    for t in sorted(gf):
        diff = gf[t] - pg[t]
        if diff < 0 or diff > 3:  # samobóje dają zwykle 0 do +2
            warn.append(f"stats: {TN.get(t, t)}: bramki zawodników {pg[t]} vs tabela meczów {gf[t]} (różnica {diff:+d}): zawodnik po zmianie klubu w sezonie?")
    for p in d['players']:
        if p[4] > games[p[2]]: warn.append(f"stats: {p[1]}: {p[4]} meczów > {games[p[2]]} rozegranych przez klub (zmiana klubu w sezonie?)")
        if p[6] > games[p[2]] * 95: err.append(f"stats: {p[1]}: {p[6]} minut ponad możliwe")
    print(f"stats: {len(fx)} meczów ({len(ft)} FT), {len(d['players'])} zawodników, kolejka {d['meta']['lastRound']}")
else:
    print('stats.json: brak pliku, pominięto')

n_rows = n_bad = 0
for y in range(2021, 2031):
    h = load(f'h{y}.json')
    if not h: continue
    bad = [r for r in h['rows'] if r[4] > 34 or r[3] > 3200]
    n_rows += len(h['rows']); n_bad += len(bad)
    if bad: err.append(f"historia {y}: {len(bad)} wierszy niemożliwych (>34 mecze lub >3200 min), np. pid {bad[0][0]}")
    s = defaultdict(int)
    for r in h['rows']: s[r[1]] += r[3]
    for c, m in s.items():
        if m > 34 * 90 * 11 * 1.04: err.append(f"historia {y}: {c}: suma minut {m} ponad limit {int(34*90*11*1.04)}")
if n_rows: print(f'historia: {n_rows} wierszy, niemożliwych {n_bad}')

for w in warn: print('OSTRZEŻENIE', w)
for e in err: print('BŁĄD', e)
print('KONTROLA:', 'BŁĘDY' if err else ('uwagi' if warn else 'OK'))
sys.exit(1 if err else 0)
