# Powiadomienia o prośbach o dostęp (Apps Script)

1. script.google.com → Nowy projekt → wklej `powiadomienia.gs`.
2. Ustawienia projektu → Właściwości skryptu: `ADMIN_EMAILS`, `FIREBASE_API_KEY` (apiKey z config.js), `SITE_URL`, opcjonalnie `DISCORD_WEBHOOK`, `DISCORD_INVITE`.
3. Wdróż → Nowe wdrożenie → Aplikacja internetowa; wykonuj jako: Ja; dostęp: Wszyscy. Zaakceptuj uprawnienia (Gmail, zewnętrzne żądania).
4. Adres `/exec` wklej do `config.js` jako `RTS_NOTIFY_URL`.
5. Reguły: wklej `firestore.rules` w Firebase → Firestore → Reguły → Opublikuj.
Żadnych haseł ani tokenów w repo.
