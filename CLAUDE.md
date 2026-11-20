# rtsskaut: instrukcje dla Claude

Język pracy: polski (właściciel: Bartek).

## Oszczędzanie zasobów (decyzja Bartka 20.11.2026; PILNUJE CLAUDE, Bartek tego nie pamięta)
Cel: nie przekraczać darmowych limitów i nie płacić za narzędzia. Claude jest strażnikiem i przypomina o tym sam.
- Jeden Pull request = jedna paczka zmian. Commity zbieraj lokalnie i pushuj raz; każdy push może uruchomić Actions i build hostingu. PR jako szkic, „gotowy” dopiero po lokalnej kontroli.
- Przed pushem uruchom lokalną kontrolę (jeśli projekt ją ma); nie używaj CI jako testu „na próbę”.
- Nowy workflow, cron, zaplanowane zadanie lub automat: tylko po zgodzie Bartka, z `concurrency` + `cancel-in-progress`, `paths-ignore` dla dokumentacji, `timeout-minutes` i bez uruchomień na każdy push do gałęzi roboczych.
- Zmiany samej dokumentacji i grafik nie powinny uruchamiać CI ani buildów.
- Zapytania do zewnętrznych API i odświeżanie danych tylko wtedy, gdy dane mogły się zmienić; stosuj cache.
- Gdy checki padają natychmiast (0 s) albo GitHub/Cloudflare/Supabase zgłasza limit: nie pushuj ponownie, powiedz Bartkowi jednym zdaniem i kontroluj lokalnie.
- Na początku miesiąca przypomnij Bartkowi o przeglądzie zużycia (GitHub Billing, Cloudflare Usage, Supabase Usage) i sprawdź, czy budżet GitHub Actions ma blokadę 0 USD.
- Model: szybki do drobiazgów i kompilacji, najmocniejszy tylko do architektury i trudnych błędów; zamykaj wątki po skończonej paczce.
- rtsskaut: Firebase `rtsstat-55616` (plan darmowy): ogranicz odczyty/zapisy (cache, `usage.js`), bez pętli odpytywania.
