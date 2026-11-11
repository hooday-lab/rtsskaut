// Czysta logika poziomów dostępu RTS Skaut (bez sieci, do testów i do Workera).
// Poziom wsparcia z YouTube (ytTier): 1 = Poziom I, 2 = Poziom II, 3 = Poziom III.
// Poziom w Skaucie (level): 0 = darmowy i Poziom I, 1 = Poziom II, 2 = Poziom III.

export const GRACE_MS = 3 * 864e5; // karencja 3 dni (decyzja Bartka 11.11.2026)

export const levelOfTier = (ytTier) => Math.max(0, Math.min(2, ytTier - 1));

// roleIds: role członka na serwerze Discord; rolesMap: {"<idRoli>": 1|2|3}. Zwraca najwyższy poziom YouTube albo 0.
export function tierFromRoles(roleIds, rolesMap) {
  let best = 0;
  for (const id of roleIds || []) {
    const t = Number(rolesMap[id] || 0);
    if (t > best) best = t;
  }
  return best;
}

// existing: obecny dokument members/{email} (albo null); found: {ytTier, discordId} gdy rola jest, null gdy jej nie ma.
// Zwraca {write: pola do zapisu | null, action}. Czasy jako liczby ms (Worker zamienia je na znaczniki czasu).
// Zasady: ekipa (admin/member) nietknięta; wpisy ręczne wygasają same i nie są ruszane, dopóki nie ma roli na Discordzie;
// aktywna rola odnawia ważność na GRACE_MS; zniknięcie roli ustawia lapsedAt i skraca ważność do lapsedAt + GRACE_MS.
export function planUpdate(existing, found, now) {
  if (existing && (existing.role === 'admin' || existing.role === 'member')) return { write: null, action: 'crew' };
  const prevUntil = existing && existing.until != null ? Number(existing.until) : 0;
  if (found && found.ytTier > 0) {
    const until = Math.max(now + GRACE_MS, prevUntil > now ? prevUntil : 0);
    const next = { role: 'supporter', level: levelOfTier(found.ytTier), ytTier: found.ytTier, until, lapsedAt: null, source: 'discord', discordId: found.discordId };
    if (existing && existing.role === 'supporter' && existing.level === next.level && existing.ytTier === next.ytTier &&
        existing.source === 'discord' && existing.lapsedAt == null && existing.discordId === next.discordId && prevUntil >= now + GRACE_MS - 216e5) {
      return { write: null, action: 'unchanged' };
    }
    return { write: next, action: existing ? 'renewed' : 'created' };
  }
  // roli nie ma
  if (!existing || existing.source !== 'discord') return { write: null, action: 'not-ours' };
  if (existing.ytTier === 0) return { write: null, action: 'waiting' }; // połączony z Discordem, jeszcze bez roli
  if (existing.lapsedAt != null) {
    return { write: null, action: prevUntil > now ? 'grace' : 'expired' };
  }
  return { write: { lapsedAt: now, until: now + GRACE_MS }, action: 'lapsed' };
}
