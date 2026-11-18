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
