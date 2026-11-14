# Lista kontrolna premiery RTS Skaut

Zasada nadrzędna (`rts-workspace/docs/zasady-paczek.md`, pkt 6): żadna treść nie idzie na webhook Discorda, dopóki Bartek nie przeczyta jej w całości w czacie i nie potwierdzi („tak”, „wysyłaj”). Teksty pochodzą z `docs/premiera/teksty.py` (link do Discorda czytany z `config.js`).

## Przed startem (wszystko musi być zielone)
- [x] Tablica pkt 2: `rts-skaut` na 2. miejscu w KIBICACH, kategoria SŁUCHACZE widoczna tylko dla `YouTube Member…`.
- [ ] Tablica pkt 4: jasny motyw i telefon sprawdzone.
- [ ] Tablica pkt 6: test z 3 wspierającymi zaliczony.
- [x] Stara wiadomość z 25.10 w #rts-skaut usunięta ręcznie.
- [x] `python3 docs/premiera/teksty.py --check` → OK (sprawdza też zapis 🔴⚪🔴).
- [x] Zmienna `DISCORD_WEBHOOK_RTSSKAUT` ustawiona w środowisku.
- [ ] Link do YouTube w bio Instagrama i X ustawiony (IG nie klika linków w opisie).

## Kolejność publikacji
| # | Gdzie | Kto | Tekst | Plik graficzny |
|---|---|---|---|---|
| 1 ✅ | Discord #rts-skaut (nowa wiadomość powitalna), wysłana 14.11, HTTP 200 | Claude, webhook `DISCORD_WEBHOOK_RTSSKAUT`, po sygnale właściciela | tekst z tablicy/rozmowy: „📊 RTS Skaut” (poziomy, link do instrukcji) | `rts-skaut-discord-1.png` (1600×900) |
| 2 | Discord, ogłoszenie „RTS Skaut jest już na żywo” | do decyzji, gdzie (rekomendacja: #czat-z-ekipą) | `dc_ann` (+ `dc_faq` przypięte w #rts-skaut) | `rts-skaut-discord-1.png` |
| 3 | YouTube publiczny (post społeczności) | Patryk | `yt_pub` | `rts-skaut-yt-1…4.png` (karuzela 1080×1080) |
| 4 | X (wątek 4 wpisów) | Patryk | `x1` → `x2` → `x3` → `x4` | `rts-skaut-x-1.png` (1200×675) przy `x1` |
| 5 | Facebook | Patryk | `fb` | `rts-skaut-ig-1.png` (1080×1350) |
| 6 | Instagram | Patryk | `ig` (link w bio) | `rts-skaut-ig-1.png` |
| 7 | YouTube dla wspierających | Patryk | `yt_wsp` | `rts-skaut-wsp-1.png` (1080×1080) |

Patryk dostaje gotowe paczki (bez placeholderów) na Discordzie, Bartek niczego mu nie wkleja. Wysyłka paczki na webhook GOTOWIEC dopiero po zgodzie Bartka.

## Weryfikacja treści (zrobione 14.11)
- 10 tekstów: brak placeholderów, nawiasów, „RTS Stats”, próśb o typowanie. Posty X ≤ 280 znaków (najdłuższy 273).
- Linki w tekstach: rtsskaut.pl, zaproszenie Discord, link do wsparcia kanału. Bez innych.
- 8 grafik obejrzanych: brak starej marki, brak placeholderów.
- Kibic Rozmów (15,99 zł) świadomie pominięty w tekstach: w aplikacji jest poziomem zbliżonym do darmowego (`access/README.md`).

## Po publikacji
- [ ] Wpis w logu `integracje.md` (rts-workspace): które posty, które pliki, kody HTTP.
- [ ] Sprawdzić, że link zaproszenia na Discord działa z nowego urządzenia (incognito).
- [ ] Przez 24 h śledzić #czat-z-ekipą i #oklaski-i-skargi.
