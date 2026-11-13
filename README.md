# RTS Skaut
Narzędzie RTS Skaut (#RTSkaut): statystyki i karty dla dziennikarzy podcastu Rozmowy Tylko Sportowe. Logowanie Google + lista dostępu (Firebase), statystyki w Firestore.

## Wdrożenie strony
Strona (https://rtsskaut.pl/) jest Workerem ze statycznymi plikami: `wrangler.jsonc` w katalogu głównym, a skrypt `scripts/build-site.mjs` składa katalog `dist/` z listy dozwolonych plików (index.html, sw.js, config.js, brand/). Cloudflare buduje go z gałęzi `main` (Workers Builds, projekt `rtsskaut`, katalog główny `/`, komenda wdrożenia `npx wrangler deploy`).
Worker poziomów dostępu (Discord) jest osobny: patrz `access/README.md` (projekt `rts-skaut-access`, katalog główny `access`).
