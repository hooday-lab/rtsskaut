# Test na prawdziwych rolach (punkt 6 tablicy)

Cel: sprawdzić na żywych kontach wspierających, że integracja YouTube–Discord nadaje role i że RTS Skaut ustawia poziom sam. Testy w repo używają atrap, więc to jedyny test prawdziwego łańcucha.

Uczestnicy: @ToMaShreck, @Rosomagu, @arkady1910 (każdy wspiera kanał na YouTube). Rozsyła właściciel (Bartek), w wiadomości prywatnej na Discordzie.

## Wymagania przed wysyłką (wszystko [Admin])
1. Kategoria SŁUCHACZE ROZMÓW widoczna dla ról `YouTube Member…` (sprawdzenie: Ustawienia serwera → Role → „Wyświetl serwer jako rolę”).
2. Zweryfikowane, że role `YouTube Member: Kibic Rozmów / Stały Bywalec / Elita Rozmów` mają ID z `access/wrangler.toml` (`DISCORD_ROLES`): 1570741549569150987 / …88 / …89.
3. Strona i Worker działają (https://rtsskaut.pl/ otwiera się, wdrożenie w Cloudflare ma status Success).

## Wiadomość do wspierających
Wysyłana prywatnie, każdej osobie osobno, razem z infografiką `docs/premiera/rts-skaut-test-wspierajacych.png` (cztery kroki). Ról nikomu nie zmieniamy: test ma sprawdzić, że wszystko nadaje się samo.
```
Cześć! Mam prośbę na 5 minut. 🔴⚪🔴

Budujemy RTS Skaut: statystyki RTS Widzew Łódź, od kibiców dla kibiców (rtsskaut.pl). Podstawowe karty są dla wszystkich za darmo, a wspierający nasz kanał na YouTube dostają więcej (Stały Bywalec, Elita Rozmów). Poziom ma się nadawać sam, bez niczyjej pomocy.

Zanim pokażemy to wszystkim, chcę sprawdzić, czy to naprawdę działa na kontach wspierających. Dlatego proszę o pomoc właśnie Ciebie.

W załączniku jest infografika z czterema krokami. Na końcu napisz mi trzy rzeczy: jaki poziom widzisz przy swoim koncie, czy na serwerze widzisz kategorię SŁUCHACZE ROZMÓW i co było niejasne.

Instrukcja ze zdjęciami: https://rtsskaut.pl/jak-polaczyc-discord.html

Niczego więcej nie potrzebuję. Nie podawaj nikomu haseł ani kodów, nas to nie dotyczy. Dzięki, że jesteście z nami!
```

## Kroki testowe
- **Krok #1 [Admin]:** wyślij wiadomość trzem osobom i zapisz godzinę wysyłki.
- **Krok #2 [Gracz Rzeczywisty]:** każda z 3 osób wykonuje punkty 1–3 z wiadomości i odpisuje.
- **Krok #3 [Admin]:** po odpowiedzi sprawdź na serwerze, że osoba ma rolę `YouTube Member: …` właściwą dla swojego pakietu.
- **Krok #4 [Gracz Rzeczywisty]:** po kliknięciu „Połącz z Discordem” plakietka przy koncie pokazuje poziom (Kibic / Bywalec / Elita). Dla Stałego Bywalca i Elity odblokowują się karty z kłódką.
- **Krok #5 [Admin]:** (opcjonalnie, Claude może zrobić odczyt tylko do odczytu) w Firestore `members/{email}` jest wpis `source: discord`, `level` zgodny z pakietem.
- **Krok #6 [Gracz Rzeczywisty]:** kategoria SŁUCHACZE ROZMÓW jest widoczna na serwerze.
- **Krok #7 [Admin]:** po godzinie (cron) wpisy nadal są i poziomy się nie zmieniły.

## Kryteria zaliczenia
- Każdy z 3 testerów widzi poprawny poziom bez pomocy ekipy.
- Zgodność z mapowaniem (tablica, sekcja 3): `ytTier` 1/2/3 → `level` 0/1/2, czyli Kibic Rozmów = poziom 0 (funkcjonalnie jak darmowy), Stały Bywalec = 1, Elita Rozmów = 2.
- Żaden niewspierający nie widzi SŁUCHACZY.

## Co robimy, gdy nie działa
- Brak roli po połączeniu YouTube: sprawdzić, czy to samo konto YouTube, czy integracja serwera nadaje role (Ustawienia serwera → Integracje → YouTube).
- Rola jest, a poziom 0: sprawdzić ID ról w `DISCORD_ROLES`, odświeżyć klikając „Połącz z Discordem” jeszcze raz, poczekać do pełnej godziny.
- Wynik wpisać w tablicy (punkt 6).
