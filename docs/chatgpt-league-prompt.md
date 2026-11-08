# ChatGPT prompt: 40-club league tournament (format sv-league-40)

The app imports this format (`sv-league-40`). The full rules are in `docs/json-format.md`, and `examples/tournament-league.example.json` is a valid file.

This prompt gives ChatGPT 40 clubs in 4 pots and asks it to:

- split every pot between S and V fairly (5 and 5, strong and weak clubs mixed evenly);
- build the full draw (160 matches) that the app accepts;
- keep matches between clubs of the same league (two English clubs, two Spanish clubs) as few as possible.

The app checks every format rule on import and refuses a file that breaks one. If that happens, paste the error list back to ChatGPT and ask for a corrected file. Same-league matches are not checked by the app; ChatGPT reports how many are left.

## What to send to ChatGPT

1. The prompt below, with the tournament number and the club list filled in.
2. The club list from the app (Import / Export, "Скопіювати список клубів"), so clubs that played before keep their ids and their history stays connected.
3. Optional: `examples/tournament-league.example.json` as a sample of a correct file.

Nothing else is needed: the prompt contains the format.

## Prompt

Fill in the tournament id, number and name, then paste the club list at the end. The clubs of a pot can be in any order: ChatGPT ranks them by their EA SPORTS FC 26 team rating before the split and shows that ranking, so it can be checked and corrected.

```
Створи жеребкування турніру EA SPORTS FC 26 за форматом лігового етапу Ліги чемпіонів для двох гравців, S та V, і поверни результат як JSON у форматі нижче (schemaVersion 1, format "sv-league-40").

Використовуй лише клуби з мого списку наприкінці. Не змінюй клуби і кошики. Власників (S чи V) визначаєш ти, за правилами нижче.

СТРУКТУРА
- 40 клубів, 2 гравці (S та V), по 20 клубів у кожного.
- 4 кошики по 10 клубів, у кожному кошику 5 клубів S та 5 клубів V.
- 8 турів, 20 матчів у кожному турі, разом 160 матчів.
- Одна загальна таблиця на 40 клубів.

КРОК 1. ЧЕСНИЙ РОЗПОДІЛ МІЖ S ТА V
Клуби в моєму списку записані без порядку за силою. Спершу впорядкуй 10 клубів кожного кошика від найсильнішого до найслабшого за загальним рейтингом команди (OVR) в EA SPORTS FC 26. Якщо рейтингу клубу не знаєш точно, оціни силу за складом і останніми сезонами. Покажи цей порядок у відповіді.
Потім розбий кошик на пари сусідів за силою: 1 і 2, 3 і 4, 5 і 6, 7 і 8, 9 і 10. У кожній парі випадково (як підкиданням монети) один клуб отримує S, другий V. Так у кожного гравця в кожному кошику буде по одному клубу з кожного рівня сили, і жоден гравець не забере всі найсильніші клуби.

КРОК 2. СУПЕРНИКИ
Правила, які не можна порушувати:
1. Клуби S грають лише проти клубів V.
2. Кожен клуб грає 8 матчів проти 8 різних суперників.
3. Кожен клуб має рівно 2 суперників з кожного з 4 кошиків, включно зі своїм.
4. Проти двох суперників з одного кошика: один матч удома, один на виїзді. Разом 4 домашні та 4 виїзні матчі.
5. Жодна пара клубів не зустрічається двічі.

Як це побудувати: для кожної пари кошиків (a, b), а таких пар 16, візьми 5 клубів S з кошика a і 5 клубів V з кошика b. Обери дві перестановки p1 і p2 чисел від 1 до 5, такі що p1(i) не дорівнює p2(i) для жодного i. Клуб S номер i грає вдома проти клубу V номер p1(i) і на виїзді проти клубу V номер p2(i). Так кожен клуб автоматично має по одному домашньому й одному виїзному матчу проти кожного кошика.

Матчі між клубами однієї ліги (наприклад, дві англійські або дві іспанські команди): їх має бути якомога менше. Для кожної пари кошиків переглянь усі допустимі пари перестановок (їх небагато) і обери ту, де таких матчів найменше. Серед однаково добрих варіантів обирай випадково. Якщо без матчу однієї ліги не обійтися, це дозволено. Ліга клубу визначається країною його чемпіонату.

КРОК 3. ТУРИ
Розклади 160 матчів на 8 турів так, щоб у кожному турі кожен клуб грав рівно один матч (20 матчів у турі). Це завжди можливо: граф матчів двочастковий і кожен клуб має 8 матчів, тож його можна розбити на 8 досконалих паросполучень (теорема Кеніга). Знаходь паросполучення по черзі, наприклад алгоритмом Гопкрофта–Карпа. Перемішай порядок турів, щоб суперники з різних кошиків були розкидані по всіх турах.

ВИПАДКОВІСТЬ
- Монетка в кроці 1, вибір серед однаково добрих варіантів у кроці 2 і порядок турів у кроці 3 мають бути справді випадковими.
- Не привʼязуй суперників до однакових номерів у кошиках і не використовуй циклічні шаблони.
- Випадковість не може порушувати жодного правила.

КОДИ КЛУБІВ
Кожен клуб має код: номер кошика, власник, номер у кошику серед клубів цього власника, за силою. Найсильніший клуб S у кошику 1 це 1S-1, наступний клуб S у кошику 1 це 1S-2, і так до 1S-5. Так само 1V-1 ... 1V-5, 2S-1 ... 4V-5.

ПЕРЕВІРКА
Усе роби кодом (Python). Перед відповіддю запусти перевірку кожного правила: 40 клубів, по 20 у S та V, по 5 S і 5 V у кожному кошику, у кожній парі сусідів за силою різні власники, по 8 матчів у клубу, по 2 суперники з кожного кошика, по одному домашньому й одному виїзному проти кожного кошика, немає матчів одного гравця, немає повторних пар, кожен клуб грає раз у кожному турі, разом 160 матчів. Якщо хоч одна умова порушена, виправ жеребкування. Не пиши, що перевірка пройдена, якщо ти її не запускав.

Після JSON коротко напиши:
- порядок за силою в кожному кошику (з рейтингом, якщо знаєш) і пари сусідів;
- розподіл: які клуби отримав S і які V у кожному кошику;
- скільки матчів між клубами однієї ліги залишилося і які саме (ліга, клуби, тур).

ФОРМАТ ВІДПОВІДІ
Поверни JSON в одному блоці коду, без Excel і без таблиць:

{
  "schemaVersion": 1,
  "tournament": {
    "id": "fc26-t10",
    "number": 10,
    "name": "Турнір 10",
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
- clubs: рівно 40. id це латинський slug у нижньому регістрі (real-madrid, paris-saint-germain). Якщо клуб є в списку відомих id, використовуй саме його id і назву. country це країна чемпіонату клубу англійською (England, Spain, Germany, Italy, France, Portugal, Netherlands, Scotland, Turkey, ...). group завжди "L". pot від 1 до 4. code у форматі {кошик}{власник}-{номер}, наприклад "3V-2".
- matches: рівно 160. id у форматі "L{тур}-{номер матчу в турі}", від "L1-1" до "L8-20". stage завжди "group", group завжди "L". matchday від 1 до 8. home це господар (записаний першим), away це гість. result завжди null.
- status "planned": турнір майбутній, результати вносяться в застосунку після старту.

ВІДОМІ ID КЛУБІВ (зі застосунку):
<встав список клубів зі застосунку сюди>

МІЙ СПИСОК КЛУБІВ (порядок у кошику довільний):
Кошик 1: <клуб>, <клуб>, <клуб>, <клуб>, <клуб>, <клуб>, <клуб>, <клуб>, <клуб>, <клуб>
Кошик 2: ...
Кошик 3: ...
Кошик 4: ...
```

## After ChatGPT answers

1. Read the ranking, the split and the list of same-league matches it reports. If a club is ranked wrong, say so (for example "Napoli сильніший за Juventus, переставь їх і зроби розподіл знову"). To try another draw, ask "Зроби інший випадковий розподіл і жеребкування".
2. In the app: Імпорт, paste the JSON, "Перевірити". The preview shows the clubs by pot, with S and V badges and codes.
3. If the import shows errors, copy the whole list to ChatGPT with "Виправ ці помилки і надішли весь JSON знову".
4. Keep `planned` while another tournament is in progress; start this one later with "Почати турнір".

## If you choose the owners yourself

Write the owner next to every club in the list (`Кошик 1, S: ...` and `Кошик 1, V: ...`, five clubs each), and replace the section "КРОК 1" in the prompt with: "Власники вже вказані в моєму списку. Не змінюй їх." Everything else stays the same.
