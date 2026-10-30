# ChatGPT prompt: 40-club league tournament (format sv-league-40)

The app imports this format (`sv-league-40`). The full rules are in `docs/json-format.md`, and `examples/tournament-league.example.json` is a valid file.

This prompt asks ChatGPT for the full draw (160 matches) in the JSON format the app imports. Two things to know:

- Give ChatGPT the final list of 40 clubs with pot and owner. It must not change clubs, pots or owners.
- The app checks every rule on import and refuses a file that breaks one. If that happens, paste the error list back to ChatGPT and ask for a corrected file.

## What to send to ChatGPT

Copy everything inside the block below, then paste your club list at the end.

````
Створи жеребкування турніру EA SPORTS FC 26 за форматом лігового етапу Ліги чемпіонів для двох гравців, S та V, і поверни результат як JSON у форматі нижче (schemaVersion 1, format "sv-league-40").

Використовуй лише мій список клубів наприкінці. Не змінюй клуби, кошики чи власників.

СТРУКТУРА
- 40 клубів, 2 гравці (S та V), по 20 клубів у кожного.
- 4 кошики по 10 клубів, у кожному кошику 5 клубів S та 5 клубів V.
- 8 турів, 20 матчів у кожному турі, разом 160 матчів.
- Одна загальна таблиця на 40 клубів.

ПРАВИЛА ЖЕРЕБКУВАННЯ
1. Клуби S грають лише проти клубів V. Матчі S проти S та V проти V заборонені.
2. Кожен клуб грає 8 матчів проти 8 різних суперників.
3. Кожен клуб має рівно 2 суперників з кожного з 4 кошиків, включно зі своїм.
4. Проти двох суперників з одного кошика: один матч удома, один на виїзді.
5. Разом у кожного клубу 4 домашні та 4 виїзні матчі.
6. Жодна пара клубів не зустрічається двічі.
7. У кожному турі кожен клуб грає рівно один матч.

ВИПАДКОВІСТЬ
- Обирай суперників випадково серед усіх допустимих.
- Не привʼязуй суперників до однакових номерів у кошиках і не використовуй циклічні шаблони.
- Перемішай порядок турів: суперники з різних кошиків мають бути розкидані по всіх турах.
- Випадковість не може порушувати жодного правила.

КОДИ КЛУБІВ
Кожен клуб має код: номер кошика, власник, номер у кошику. Наприклад 1S-1, 1V-3, 2S-4, 4V-5. Номер у кошику береться з порядку в моєму списку.

ПЕРЕВІРКА
Перед відповіддю запусти код (Python) і перевір кожне правило: 40 клубів, по 8 матчів, по 2 суперники з кожного кошика, по одному домашньому й одному виїзному проти кожного кошика, немає матчів одного гравця, немає повторних пар, кожен клуб грає раз у кожному турі, разом 160 матчів. Якщо хоч одна умова порушена, виправ жеребкування. Не пиши, що перевірка пройдена, якщо ти її не запускав.

ФОРМАТ ВІДПОВІДІ
Поверни лише JSON в одному блоці коду, без Excel і без таблиць:

{
  "schemaVersion": 1,
  "tournament": {
    "id": "fc26-t05",
    "number": 5,
    "name": "Турнір 5",
    "game": "EA SPORTS FC 26",
    "format": "sv-league-40",
    "status": "planned"
  },
  "players": [{ "id": "S", "name": "S" }, { "id": "V", "name": "V" }],
  "groups": [{ "id": "L", "name": "Ліга" }],
  "clubs": [
    { "id": "real-madrid", "name": "Real Madrid", "country": "Spain", "owner": "S", "group": "L", "pot": 1, "code": "1S-1" }
  ],
  "matches": [
    { "id": "L1-1", "stage": "group", "group": "L", "matchday": 1, "home": "real-madrid", "away": "arsenal", "result": null }
  ]
}

Правила полів:
- clubs: рівно 40. id це латинський slug у нижньому регістрі (real-madrid, paris-saint-germain). Якщо я дам список уже відомих id, використовуй саме їх. group завжди "L". pot від 1 до 4. code у форматі {кошик}{власник}-{номер}, наприклад "3V-2".
- matches: рівно 160. id у форматі "L{тур}-{номер матчу в турі}", від "L1-1" до "L8-20". stage завжди "group", group завжди "L". matchday від 1 до 8. home це господар (записаний першим), away це гість. result завжди null.
- status "planned": турнір майбутній, результати вносяться в застосунку після старту.

МІЙ СПИСОК КЛУБІВ (кошик, власник, клуб):
<встав список сюди>
````

## Club list to paste at the end

One line per club, in pot order. The order inside a pot and owner gives the number in the code (the first S club of pot 1 is 1S-1).

```
Кошик 1, S: Real Madrid, Bayern Munich, ...
Кошик 1, V: Manchester City, Barcelona, ...
Кошик 2, S: ...
Кошик 2, V: ...
Кошик 3, S: ...
Кошик 3, V: ...
Кошик 4, S: ...
Кошик 4, V: ...
```

If clubs already played in earlier tournaments, also paste the club list from the app (Import / Export page, "Скопіювати список клубів") with the line "Use these club ids exactly", so their history stays connected.
