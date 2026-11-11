# RTS Skaut: poziomy dostępu i połączenie z Discordem

Decyzje i plan: `docs/poziomy-dostepu.md` w repo `rts-workspace`.

## Jak to działa
1. Kibic loguje się przez Google. Bez wpisu w `members` ma poziom 0 (darmowy i Poziom I).
2. Klika „Połącz z Discordem” (Skaut, ekran Start). Worker sprawdza jego rolę na serwerze RTS (zgoda tylko na nazwę i role).
3. YouTube nadaje role na Discordzie (integracja kanału z serwerem). Poziom I/II/III = trzy role, mapowane w `DISCORD_ROLES`.
4. Worker zapisuje w Firestore `members/{email}`: `role: supporter`, `level` (0/1/2), `ytTier` (1/2/3), `until`, `lapsedAt`,
   `source: discord`, `discordId`. Reguły Firestore (`firestore.rules`) liczą z tego poziom.
5. Co godzinę (cron) Worker odpytuje bota Discorda o role połączonych osób. Zniknięcie roli: `lapsedAt` i ważność 3 dni
   (karencja), potem poziom 0. Zmiana pakietu działa przy najbliższej synchronizacji. Ekipa i ręczne wpisy admina są nietknięte.

## Pliki
- `logic.js` czysta logika (testy bez sieci), `worker.js` Cloudflare Worker, `wrangler.toml` konfiguracja bez sekretów.
- `test/access.test.mjs`: `node --test test/access.test.mjs` (17 testów z podstawionym Discordem i Firestore).
- `../tests/rules/`: testy reguł Firestore na emulatorze.

## Wdrożenie (jednorazowo)
Wymaga: konta Cloudflare, aplikacji Discord, bota na serwerze, wdrożonych reguł Firestore. Sekretów NIE wklejaj do czatów ani do repo.
1. Discord Developer Portal: nowa aplikacja, OAuth2 → Redirects: `https://<adres-workera>/link/callback`. Bot z uprawnieniem odczytu członków (bez intencji uprzywilejowanych), dodany na serwer.
2. W `wrangler.toml` uzupełnij `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, `DISCORD_ROLES`.
3. `npx wrangler secret put DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `STATE_SECRET` (losowy ciąg), `FIREBASE_SERVICE_ACCOUNT` (JSON w jednej linii).
4. `npx wrangler deploy`. W `config.js` Skauta ustaw `RTS_ACCESS_URL` na adres Workera. Przycisk „Połącz z Discordem” pojawi się dopiero wtedy.

## Zweryfikować na prawdziwym Discordzie (testy używają atrap)
- Czy integracja YouTube–Discord nadaje role per poziom i zabiera je po rezygnacji.
- Odpowiedź `GET /users/@me/guilds/{id}/member` z zakresem `guilds.members.read` oraz limity zapytań bota.
