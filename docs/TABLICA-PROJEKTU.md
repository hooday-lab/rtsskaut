# RTS Skaut i Rozmowy Tylko Sportowe: tablica projektu

Stan na 2026-11-13. Ten plik to jedyne źródło prawdy dla kolejnych czatów. Nie wpisujemy tu haseł, tokenów ani kluczy (sekrety są tylko w panelach Cloudflare, Discord i Firebase).

## 1. Cel i pozycjonowanie
- Marka: **RTS Skaut** (#RTSkaut), projekt podcastu **Rozmowy Tylko Sportowe**.
- Hasło: „Statystyki RTS Widzew Łódź” + „Od kibiców dla kibiców”.
- RTS Skaut to miejsce, gdzie kibic sprawdza statystyki klubu, drużyny i zawodników. Nie jest to „narzędzie do robienia karty przed meczem”.
- Zawsze mówimy: pieniądze za wsparcie idą na **rozwój podcastu oraz utrzymanie i dalszy rozwój RTS Skaut**.
- Nie jesteśmy oficjalnym źródłem danych i nie działamy w imieniu klubu.

## 2. Adresy i usługi
| Co | Gdzie |
|---|---|
| Strona | https://rtsskaut.pl/ (domena kupiona w OVH, DNS w Cloudflare) |
| Repozytorium | hooday-lab/rtsskaut, gałąź `main` (każdy merge wdraża stronę) |
| Hosting i API | Cloudflare Worker `rts-skaut-access` (Workers Builds, katalog główny `access`, `npx wrangler deploy`) |
| Awaryjny adres | https://rts-skaut-access.hooday.workers.dev/ |
| Logowanie i dane | Firebase projekt `rtsstat-55616` (Auth + Firestore, reguły w `firestore.rules`) |
| Discord (serwer RTS) | ID serwera `1549270230340210748`, aplikacja `1570743379153789020` |
| YouTube | kanał Rozmowy Tylko Sportowe, wsparcie: https://www.youtube.com/channel/UCD--b5ttUFyZz0kT90EImdg/join |
| Instrukcja dla kibiców | https://rtsskaut.pl/jak-polaczyc-discord.html |
| Brandbook | https://rtsskaut.pl/brand/ |

## 3. Poziomy i ceny
| Poziom | Nazwa | Cena | Rola Discord (YouTube Member) |
|---|---|---|---|
| 0 | Za darmo (każdy zalogowany) | 0 | brak |
| 1 | Stały Bywalec | 29,99 zł/mies. | `1570741549569150988` |
| 2 | Elita Rozmów | 59,99 zł/mies. | `1570741549569150989` |
| (I) | Kibic Rozmów | 15,99 zł/mies. | `1570741549569150987` (poziom 1 w aplikacji) |
Mapowanie: ytTier 1/2/3 → poziom 0/1/2 w kodzie, 3 dni karencji po utracie wsparcia. Ogólna rola „YouTube Member” jest pomijana.

## 4. Jak to działa (skrót)
- Logowanie: Google (popup) albo Discord (OAuth2, `/login/start`, potem Firebase custom token). Ekipa i admin (`CREW_EMAILS`) loguje się tylko przez Google.
- Połączenie YouTube z Discordem robi kibic w Discordzie (Ustawienia → Połączenia). Poziom ustawia Worker po rolach (na żądanie i co godzinę przez cron).
- Konfiguracja bez sekretów: `access/wrangler.toml`, `config.js`. Sekrety (poza repo): `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `STATE_SECRET`, `FIREBASE_SERVICE_ACCOUNT`.
- Szczegóły techniczne: `access/README.md`, testy: `cd access && node --test` (25 testów).

## 5. Decyzje UI (nie zmieniać bez powodu)
- Ekran logowania na komputerze: czerwony poziomy baner (wariant A), pod nim dwie kolumny równej wysokości: po lewej logowanie i „Odblokuj więcej”, po prawej pokoje Discorda.
- Przyciski Google i Discord mają tę samą szerokość (obok siebie na komputerze, jeden pod drugim na telefonie).
- „Odblokuj więcej” stoi tylko nad kartami Stały Bywalec i Elita Rozmów. Karta „Za darmo” stoi osobno po lewej.
- Pokoje Discorda: jasna karta (kolory motywu), wiersz = znak, emotka, pionowa kreska, nazwa. W jasnym motywie znak to fioletowa tabliczka, w ciemnym sam fioletowy znak bez tła.
- Pokoje pokazywane: 💬 czat-z-ekipą, 📊 rts-skaut, 😂 memy-dla-rozmów, 🗳️ forum-kibiców, 👏 oklaski-i-skargi, 🧠 pomysły-rozwój-podcastu, plus zajawka z kłódką 📢 ogłoszenia-dla-wspierających (do potwierdzenia).
- Marka: czerwone gradienty, fonty Barlow i Barlow Condensed, złoty kicker, biały emblemat bez ramki. Zasady w brandbooku (`brand/index.html`).

## 6. Co jest zrobione
Logowanie Google i Discord, poziomy z ról, strona na własnej domenie, instrukcja „połącz YouTube z Discordem”, plakietki poziomów z tooltipami, ekran logowania z pokojami i ścieżką wspierania, brandbook, kit premiery (teksty i grafiki w `docs/premiera/`).

## 7. Otwarte sprawy
1. **Link zaproszenia na Discord** (bez daty ważności, bez limitu użyć): wpisać do `config.js` jako `RTS_DISCORD_INVITE` i do tekstów premiery w miejsce `[LINK DO SERWERA DISCORD]` (zmienna `DCL` w `docs/premiera/teksty.py`). Dopóki go nie ma, pokoje i przycisk „Dołącz do serwera” są nieaktywne.
2. Admin Discorda: przenieść `rts-skaut` do sekcji KIBICE i poprawić role (rola YouTube Member ma widzieć kategorię SŁUCHACZE ROZMÓW).
3. Potwierdzić emotkę przy `forum-kibiców` (założona 🗳️) i czy zostawić zajawkę z kłódką w panelu pokoi.
4. Sprawdzić na rtsskaut.pl (incognito, Ctrl+Shift+R, komputer i telefon, jasny i ciemny motyw) ostatnie zmiany ekranu logowania. Jeśli widać starą wersję, sprawdzić w Cloudflare (Workers & Pages → `rts-skaut-access` → Deployments), czy ostatnie wdrożenie ma status Success.
5. Opcjonalnie: domena `www.rtsskaut.pl` w Workerze i w autoryzowanych domenach Firebase.
6. Test na prawdziwych rolach: poprosić 3 wspierających (@ToMaShreck, @Rosomagu, @arkady1910) o połączenie YouTube z Discordem.
7. Premiera („big bang”) po zamknięciu punktów 1–4. Kolejność publikacji: Discord → YouTube publiczny → X → Facebook i Instagram → YouTube dla wspierających. Teksty i grafiki: `docs/premiera/`.

## 8. Zasady współpracy
- Nowy czat startuje od tego pliku i `README.md`.
- Zmiany robi się na gałęzi, przez PR, a właściciel projektu udzielił trwałej zgody: **własne PR-y scalam sam po zielonych testach, bez pytania**.
- Nigdy nie prosić o wklejanie haseł, tokenów i kluczy API. Przed czymś nieodwracalnym ostrzegać.
- Po każdej zmianie strony: lista kroków testowych z rolami ([Admin], [Użytkownik]).
- Odpowiedzi numerowane (#1, #2…), na końcu sekcja „TWOJE KROKI”. Podglądy jako Artifact z linkiem, nigdy sam plik HTML.
