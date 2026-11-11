# Test reguł Firestore (poziomy dostępu)

Wymaga Javy i Node. Uruchomienie (z katalogu `tests/rules`, nic nie trafia do repo poza tym folderem):

```
npm i firebase-tools@13 @firebase/rules-unit-testing@3 firebase@10
npx firebase emulators:exec --only firestore --project rts-test "node rules.test.js"
```

Sprawdza: darmowy (bez wpisu w `members`) czyta `data/stats`, tła i `settings`, ale nie historię; Poziom I i II
nie czytają historii; Poziom III, dawni wspierający (bez pola `level`) i ekipa czytają; wygasły wspierający wraca do
poziomu 0; kopie zapasowe tylko ekipa; nikt poza adminem nie zapisuje `members` ani `data`.
