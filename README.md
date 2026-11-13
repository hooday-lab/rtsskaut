# RTS Skaut
Narzędzie RTS Skaut (#RTSkaut): statystyki i karty dla dziennikarzy podcastu Rozmowy Tylko Sportowe. Logowanie Google + lista dostępu (Firebase), statystyki w Firestore.

## Wdrożenie
Jeden projekt Cloudflare (Workers Builds): `rts-skaut-access`, repozytorium `hooday-lab/rtsskaut`, gałąź `main`, **katalog główny `access`**, komenda wdrożenia `npx wrangler deploy`.
Ten Worker robi dwie rzeczy: serwuje stronę (https://rtsskaut.pl/, statyczne pliki składane skryptem `scripts/build-site.mjs` z listy dozwolonych plików do `dist/`) i obsługuje połączenie z Discordem (`/link/*`, `/health`, cron co godzinę). Szczegóły: `access/README.md`.
