/**
 * RTS Skaut – powiadomienia dla admina (Google Apps Script, aplikacja internetowa).
 * Zero haseł w repo: wszystkie sekrety siedzą we Właściwościach skryptu (Ustawienia projektu → Właściwości skryptu).
 *
 * Właściwości skryptu:
 *   ADMIN_EMAILS      – adresy admina, po przecinku (np. hooday@gmail.com)
 *   FIREBASE_API_KEY  – ten sam apiKey co w config.js (jest publiczny)
 *   DISCORD_WEBHOOK   – (opcjonalnie) webhook kanału #prosby-o-dostep
 *   DISCORD_INVITE    – (opcjonalnie) link zapraszający na Discorda wspierających; trafia do maila powitalnego
 *   SITE_URL          – adres aplikacji, np. https://hooday-lab.github.io/rtsstat/
 *
 * Wdrożenie: Wdróż → Nowe wdrożenie → Aplikacja internetowa → Wykonuj jako: Ja; Dostęp: Wszyscy.
 * Adres kończący się na /exec wklej do config.js jako RTS_NOTIFY_URL.
 *
 * Bezpieczeństwo: każde żądanie niesie token Firebase zalogowanego użytkownika. Skrypt sprawdza go
 * w Google (accounts:lookup) i bierze adres z weryfikacji, nie z treści żądania.
 */
function doPost(e) {
  var out = ContentService.createTextOutput('ok');
  try {
    var body = JSON.parse(e.postData.contents);
    var P = PropertiesService.getScriptProperties();
    var who = verify_(body.idToken, P.getProperty('FIREBASE_API_KEY'));
    if (!who) return out;
    var admins = (P.getProperty('ADMIN_EMAILS') || '').toLowerCase().split(',').map(function (x) { return x.trim(); });
    var site = P.getProperty('SITE_URL') || '';

    if (body.type === 'request') {
      // ogranicznik: jedna wiadomość na adres na godzinę
      var cache = CacheService.getScriptCache(), key = 'rq_' + who;
      if (cache.get(key)) return out;
      cache.put(key, '1', 3600);
      var nick = String(body.nick || '').slice(0, 80);
      var txt = 'Nowa prośba o dostęp do RTS Skaut\nAdres: ' + who + '\nNazwa na YouTube: ' + nick +
        '\n\n1) Sprawdź w YouTube Studio → Zarabianie → Wspierający, czy ta osoba ma poziom „Tylko dla orłów”.\n2) Wejdź do aplikacji → Ustawienia → Prośby o dostęp → Nadaj dostęp.\n' + site;
      MailApp.sendEmail(admins.join(','), 'RTS Skaut: prośba o dostęp (' + nick + ')', txt);
      discord_(P.getProperty('DISCORD_WEBHOOK'), '🔔 **Prośba o dostęp do RTS Skaut**\nAdres: ' + who + '\nYouTube: ' + nick + '\nSprawdź w Studio: Zarabianie → Wspierający, potem nadaj dostęp w aplikacji.');
    }

    if (body.type === 'granted' && admins.indexOf(who) >= 0) {
      var to = String(body.email || '').toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return out;
      var invite = P.getProperty('DISCORD_INVITE');
      var msg = 'Cześć!\n\nDziękujemy za wspieranie Rozmów Tylko Sportowych. Masz już dostęp do RTS Skaut na ' + (+body.days || 31) +
        ' dni: ' + site + '\nZaloguj się przez Google kontem ' + to + '.\n' +
        (invite ? '\nDiscord dla wspierających: ' + invite + '\n' : '') +
        '\nOd kibiców dla kibiców,\nRozmowy Tylko Sportowe';
      MailApp.sendEmail(to, 'Masz dostęp do RTS Skaut', msg);
    }
  } catch (err) { console.error(err); }
  return out;
}

function verify_(idToken, apiKey) {
  if (!idToken || !apiKey) return null;
  var r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + apiKey, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ idToken: idToken })
  });
  if (r.getResponseCode() !== 200) return null;
  var u = (JSON.parse(r.getContentText()).users || [])[0];
  return u && u.emailVerified ? String(u.email).toLowerCase() : null;
}

function discord_(hook, text) {
  if (!hook) return;
  UrlFetchApp.fetch(hook, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify({ content: text }) });
}
