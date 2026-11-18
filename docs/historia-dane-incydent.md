# Historia zawodników: niespójne wiersze (incydent 18.11.2026)

Wykryte przy karcie „Top 10 kadry Widzewa”: Bergier miał 21 występów w Widzewie w sezonie 2022/23, choć do Widzewa przyszedł w lipcu 2025.

## Przyczyna
- Źródło: `api_player_career` (API-Football), wiersz = zawodnik × sezon × rozgrywki × **klub**. Dostawca potrafi zwrócić w jednym sezonie wiersze z dwóch klubów (np. Ravas 2022: Widzew 33 mecze i Cracovia 30 meczów, czyli dwa pełne sezony; Bergier 2022: Śląsk 7 meczów i „Widzew” 14 meczów, w tym drugi wiersz sprzeczny z publicznymi źródłami).
- Eksport `studio/history/history.sql` (repo `rts-workspace`) **sumuje** wiersze z różnych klubów w jednym sezonie (`sum(m)`, `sum(apps)`) i opisuje wynik klubem z największą liczbą minut. Stąd sumy ponad 34 mecze i błędny klub.
- Skala: 131 z 2664 par zawodnik-sezon to wiele klubów, z czego 44 są fizycznie niemożliwe (ponad 34 mecze albo 3200 minut), głównie sezony 2022/23, 2023/24 i 2024/25. Pozostałe 87 mogą być poprawne (prawdziwy transfer w sezonie) albo cicho błędne jak Bergier.

## Co zrobiono
- Aplikacja (widok „Rozwój”) pomija wiersze niemożliwe: `usage.js` → `rowPlausible`, filtr w `gLoad` (index.html), z informacją pod widokiem.
- Ranking „Top 10 kadry” liczony wierszami samego Widzewa, bez sumowania klubów, z wyłączeniem wiersza Bergier 2022.

## Do zrobienia (wymaga zgody właściciela: zapis do produkcyjnego Firestore)
1. Poprawić `history.sql`: nie sumować klubów, brać wiersz klubu z największą liczbą minut (statystyki tylko z tego klubu), dopisać flagę wielu klubów w sezonie.
2. Dopisać do `build_history.py` kontrolę niemożliwych wartości (przerywa eksport).
3. Ponowić eksport i wgrać `data/history_*` (najpierw kopia zapasowa obecnych dokumentów).
4. Zdecydować o wierszu Bergier 2022 u dostawcy (zgłoszenie błędu do API-Football lub ręczne wyłączenie).

## Audyt 18.11.2026: czy bierzemy pod uwagę Puchar Polski i inne rozgrywki?
**Nie.** Sprawdzone na bazie (Supabase `clubfantasy-test`) i na danych w Firestore:
- **Historia 2021–2025:** eksport czyta wyłącznie `api_league_id = 106` (Ekstraklasa). Puchar Polski jest w tabeli `api_player_career` osobno (`api_league_id = 108`, „Cup”, 651 wierszy), podobnie puchary europejskie, I liga, II liga, mecze towarzyskie i reprezentacje. Żaden z nich nie trafia do `data/history_*`.
- **Bieżący sezon 2026/27 (`data/stats`):** wszystkie 121 meczów, z których zbudowano dane, to liga 106, sezon 2026 (Ekstraklasa). Numer kolejki jest wymuszany z pola „Regular Season - N”, więc mecz pucharowy nie przejdzie przez `pobierz_mecze.sql`.
- **Test niezależny:** liczba bramek w zdarzeniach (359) = bramki w tabeli meczów (359). Statystyki każdego zawodnika (mecze, minuty, gole, asysty) są **równe sumie z surowych danych meczowych**, poza dwoma drobiazgami: zawodnicy bez identyfikatora (pid 0, 12 wpisów 251 minut, celowo pomijani) i jeden zawodnik z 9 minutami (pid 536449), którego brakuje.

## Czego audyt NIE potwierdził (problemy)
1. **Zmiana klubu w trakcie sezonu (bieżący sezon).** `studio/delta/delta.py` przypisuje zawodnika do klubu z ostatniego przetworzonego meczu (`p[2]=tid`), a statystyki sumuje w jednym wierszu. Dotyczy trzech zawodników: Jordi Sánchez (Wisła Kraków i Pogoń Szczecin, 14 meczów, 9 goli widoczne przy Pogoni), Michael Ameyaw (Raków i Korona), Samuel Akere (Widzew i Wisła Płock). Skutek: bramki zawodników nie zgadzają się z tabelą meczów dla Pogoni (+6) i Wisły Kr. (-7), a Sánchez ma 14 meczów przy 13 rozegranych przez Pogoń.
2. **Historia (patrz wyżej):** sumowanie klubów w jednym sezonie.
3. **Bergier 2022:** wiersz „Widzew” (14 meczów, 97 minut) pochodzi od dostawcy i jest sprzeczny z publicznymi źródłami.

## Powtarzalna kontrola
`python3 -I scripts/kontrola-danych.py <katalog>`: katalog z `stats.json` (zawartość `data/stats`) i opcjonalnie `h2021.json` … `h2025.json`. Sprawdza duplikaty meczów, zgodność bramek, niemożliwe wartości i sumy minut klubów. Uruchamiać po każdym wgraniu danych. Nie sprawdza rozgrywek (to wymaga bazy): ten punkt zostaje w zapytaniu `api_league_id = 106`.
