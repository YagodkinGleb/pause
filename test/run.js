const { boot } = require('./harness');
const LIB = require('../src/exercises.js');

let pass = 0, fail = 0;
function check(name, cond, extra){
  if(cond){ pass++; console.log('  ok   ' + name); }
  else    { fail++; console.log('  FAIL ' + name + (extra ? '  → ' + extra : '')); }
}
function section(t){ console.log('\n' + t); }

const MIN = 60000;

/* ---------------------------------------------------------- */
section('1. Базовый цикл работа → предупреждение → перерыв');
{
  const t = boot();
  t.click('startBtn');
  check('фаза "Работа" после старта', t.phase() === 'РАБОТА', t.phase());
  check('оверлей закрыт', !t.overlayOpen());

  t.advance(24 * MIN);           // 24 из 25 минут
  check('через 24 мин ещё работа', t.phase() === 'РАБОТА');
  check('предупреждения ещё нет', !t.warningOpen());

  t.advance(35 * 1000);          // 24:35 → в зоне предупреждения
  check('предупреждение показано за 30 сек', t.warningOpen());
  check('фаза всё ещё работа', t.phase() === 'РАБОТА');

  t.advance(40 * 1000);          // перевалили 25 мин
  check('перешли в перерыв', t.phase() === 'ПАУЗА', t.phase());
  check('оверлей открыт', t.overlayOpen());
  check('предупреждение скрыто', !t.warningOpen());

  const r = t.invoked.filter(i => i.cmd === 'enter_rest');
  check('окно запрошено поверх остальных', r.length === 1, 'вызовов: ' + r.length);

  t.advance(5 * MIN + 2000);     // перерыв кончился
  check('вернулись в работу', t.phase() === 'РАБОТА', t.phase());
  check('оверлей закрыт', !t.overlayOpen());
  check('перерыв засчитан', t.$('statToday').textContent === '01', t.$('statToday').textContent);
}

/* ---------------------------------------------------------- */
section('2. Гонка: фаза не должна проскакивать дважды');
{
  const t = boot();
  t.click('startBtn');
  let switches = 0, prev = t.phase();
  for(let i = 0; i < 90; i++){
    t.advance(MIN);
    if(t.phase() !== prev){ switches++; prev = t.phase(); }
  }
  // 90 минут при цикле 25+5=30 → ровно 3 полных цикла = 6 переключений
  check('за 90 мин ровно 6 переключений фаз', switches === 6, 'получено ' + switches);
  check('перерывов засчитано 3', t.$('statToday').textContent === '03', t.$('statToday').textContent);
}

/* ---------------------------------------------------------- */
section('3. Сон компьютера во время работы');
{
  const t = boot();
  t.click('startBtn');
  t.advance(10 * MIN);           // отработал 10 мин из 25

  t.sleep(90 * MIN);             // ноутбук спал полтора часа
  t.advance(1500);               // проснулись, тикнули

  check('после долгого сна фаза — работа', t.phase() === 'РАБОТА', t.phase());
  check('перерыв НЕ выскочил сразу', !t.overlayOpen());
  const secs = t.time().split(':').map(Number);
  const left = secs[0]*60 + secs[1];
  check('отсчёт начат заново (~25 мин)', left > 24*60, 'осталось ' + t.time());
  check('подсказка объясняет причину',
        /не было|заново/.test(t.$('hint').textContent), t.$('hint').textContent);
}

section('4. Короткая отлучка не съедает рабочее время');
{
  const t = boot();
  t.click('startBtn');
  t.advance(10 * MIN);
  const before = t.time();

  t.sleep(2 * MIN);              // отошёл на 2 минуты (меньше перерыва в 5)
  t.advance(1500);

  const p = s => { const a = s.split(':').map(Number); return a[0]*60+a[1]; };
  check('отлучка не засчитана как работа', Math.abs(p(before) - p(t.time())) < 5,
        before + ' → ' + t.time());
  check('фаза не сменилась', t.phase() === 'РАБОТА');
}

section('5. Сон во время перерыва = перерыв состоялся');
{
  const t = boot();
  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  check('в перерыве', t.phase() === 'ПАУЗА', t.phase());

  t.sleep(20 * MIN);             // ушёл и правда отдохнул
  t.advance(1500);

  check('вернулись к работе', t.phase() === 'РАБОТА', t.phase());
  check('перерыв засчитан как выполненный', t.$('statToday').textContent === '01');
}

/* ---------------------------------------------------------- */
section('6. Отсрочка');
{
  const t = boot();
  t.click('startBtn');
  t.advance(24 * MIN + 35000);
  check('предупреждение видно', t.warningOpen());

  t.click('snoozeBtn');
  check('предупреждение скрыто', !t.warningOpen());
  check('фаза осталась рабочей', t.phase() === 'РАБОТА');

  // на момент отсрочки оставалось ~25 сек, отсрочка добавляет 5 мин → ~5:25
  t.advance(4 * MIN);
  check('через 4 мин перерыв ещё не начался', t.phase() === 'РАБОТА', t.phase());

  t.advance(2 * MIN);
  check('после отсрочки перерыв наступил', t.phase() === 'ПАУЗА', t.phase());
}

section('7. Лимит отсрочек — три штуки');
{
  const t = boot();
  t.click('startBtn');
  t.advance(24 * MIN + 35000);
  for(let i = 0; i < 3; i++){
    t.click('snoozeBtn');
    t.advance(5 * MIN);
  }
  check('кнопка отсрочки заблокирована', t.$('snoozeBtn').disabled === true);
  const label = t.$('snoozeBtn').textContent;
  check('надпись объясняет блокировку', /нельзя|кончил/i.test(label), label);
}

/* ---------------------------------------------------------- */
section('9. Упражнения не повторяются подряд');
{
  const t = boot();
  t.click('startBtn');
  const seen = [];
  for(let i = 0; i < 8; i++){
    t.advance(25 * MIN + 2000);
    seen.push(t.$('exerciseName').textContent);
    t.advance(5 * MIN + 2000);
  }
  const dupAdjacent = seen.some((v,i) => i > 0 && v === seen[i-1]);
  check('нет двух одинаковых подряд', !dupAdjacent, seen.join(' | '));
  check('разнообразие есть', new Set(seen).size >= 6, 'уникальных: ' + new Set(seen).size);
}

/* ---------------------------------------------------------- */
section('10. Клавиатура');
{
  const t = boot();
  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  check('оверлей открыт', t.overlayOpen());
  t.key('Escape');
  check('Esc закрывает перерыв', !t.overlayOpen());
  check('Esc возвращает к работе', t.phase() === 'РАБОТА', t.phase());
  check('пропуск засчитан как пропуск, не как выполнение',
        t.$('statToday').textContent === '00', t.$('statToday').textContent);
}

/* ---------------------------------------------------------- */
section('11. Мягкий режим не захватывает экран');
{
  const t = boot();
  t.click('softMode');
  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  const grabs = t.invoked.filter(i => i.cmd === 'enter_rest');
  check('enter_rest не вызывался', grabs.length === 0, 'вызовов: ' + grabs.length);
  const notes = t.invoked.filter(i => i.cmd === 'notify');
  check('уведомление всё равно отправлено', notes.length >= 1);
  check('оверлей в окне всё равно показан', t.overlayOpen());
}

/* ---------------------------------------------------------- */
section('12. Настройки сохраняются');
{
  const t = boot();
  t.click('workPlus'); t.click('workPlus');   // 25 → 27, шаг 1 мин
  t.click('restPlus');                        // 5 → 6
  t.$('volRange').value = '30';
  t.$('volRange').oninput();

  const saved = JSON.parse(t.store['peredyshka.settings.v1']);
  check('работа сохранена', saved.workMin === 27, saved.workMin);
  check('отдых сохранён', saved.restMin === 6, saved.restMin);
  check('громкость сохранена', saved.volume === 30, saved.volume);

  const t2 = boot({ seedStore: t.store });
  check('после перезапуска работа восстановлена', t2.$('workVal').textContent === '27');
  check('после перезапуска отдых восстановлен', t2.$('restVal').textContent === '06');
  check('после перезапуска громкость восстановлена', t2.$('volRange').value === '30');
}

/* ---------------------------------------------------------- */
section('13. Серия дней');
{
  const day = d => '2026-07-' + String(d).padStart(2,'0');
  // вчера была серия 4 дня
  const seed = { 'peredyshka.stats.v1': JSON.stringify({
    date: day(23), done: 5, skipped: 0, streak: 4, lastDoneDate: day(23) }) };

  const t = boot({ seedStore: seed, startTime: new Date('2026-07-24T10:00:00').getTime() });
  check('счётчик за день обнулён на новый день', t.$('statToday').textContent === '00');
  check('серия сохранена до первого перерыва', t.$('statStreak').textContent === '04');

  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  t.click('doneBtn');
  check('серия выросла до 5', t.$('statStreak').textContent === '05', t.$('statStreak').textContent);
  check('перерыв засчитан', t.$('statToday').textContent === '01');
}

section('14. Серия рвётся после пропущенного дня');
{
  const seed = { 'peredyshka.stats.v1': JSON.stringify({
    date:'2026-07-20', done: 3, skipped: 0, streak: 9, lastDoneDate:'2026-07-20' }) };
  const t = boot({ seedStore: seed, startTime: new Date('2026-07-24T10:00:00').getTime() });
  check('серия обнулена', t.$('statStreak').textContent === '00', t.$('statStreak').textContent);

  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  t.click('doneBtn');
  check('серия начата заново с 1', t.$('statStreak').textContent === '01', t.$('statStreak').textContent);
}

/* ---------------------------------------------------------- */
section('15. Звук и громкость');
{
  const t = boot();
  t.click('startBtn');
  const before = t.sounds.length;
  t.advance(25 * MIN + 2000);
  check('сигнал перерыва прозвучал', t.sounds.length > before);

  const t2 = boot();
  t2.click('muteBtn');
  t2.click('startBtn');
  const b2 = t2.sounds.length;
  t2.advance(25 * MIN + 2000);
  check('в беззвучном режиме тишина', t2.sounds.length === b2,
        'звуков: ' + (t2.sounds.length - b2));
}

/* ---------------------------------------------------------- */
section('16. Остановка сбрасывает всё');
{
  const t = boot();
  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  check('в перерыве', t.overlayOpen());
  t.click('resetBtn');            // сбросить
  check('оверлей закрыт', !t.overlayOpen());
  check('фаза сброшена', t.phase() === 'ОЖИДАНИЕ', t.phase());
  const back = t.invoked.filter(i => i.cmd === 'enter_work');
  check('окно возвращено из полноэкранного', back.length >= 1);

  t.advance(60 * MIN);
  check('после остановки таймер стоит', t.phase() === 'ОЖИДАНИЕ', t.phase());
}

/* ---------------------------------------------------------- */
section('18. Подсказки про глаза — отдельно и выключаются');
{
  const t = boot();
  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  check('подсказка показана по умолчанию', t.$('exerciseTip').hidden === false);
  check('подсказка не пустая', t.$('exerciseTip').textContent.length > 10);
  check('подсказка отличается от упражнения',
        t.$('exerciseTip').textContent !== t.$('exerciseName').textContent);

  t.click('tipsMode');
  check('после выключения подсказка скрыта', t.$('exerciseTip').hidden === true);

  const saved = JSON.parse(t.store['peredyshka.settings.v1']);
  check('настройка сохранена', saved.showTips === false, saved.showTips);

  const t2 = boot({ seedStore: t.store });
  t2.click('startBtn');
  t2.advance(25 * MIN + 2000);
  check('после перезапуска подсказки остались выключены',
        t2.$('exerciseTip').hidden === true);
}

section('19. Названия зон переведены');
{
  const t = boot();
  // проверяем через реальный показ: зона на экране не должна остаться латиницей
  t.click('startBtn');
  let latin = 0;
  for(let i = 0; i < 20; i++){
    t.advance(25 * MIN + 2000);
    if(/^[a-z]+$/i.test(t.$('exerciseZone').textContent)) latin++;
    t.advance(5 * MIN + 2000);
  }
  check('все показанные зоны переведены на русский', latin === 0,
        'непереведённых показов: ' + latin);
}

/* ---------------------------------------------------------- */
section('20. Пауза');
{
  const t = boot();
  t.click('startBtn');
  t.advance(10 * MIN);
  const before = t.time();

  t.click('startBtn');                 // пауза
  check('фаза показывает паузу', t.phase() === 'ОСТАНОВЛЕНО', t.phase());

  t.advance(30 * MIN);                 // долго стоим на паузе
  check('время на паузе не идёт', t.time() === before, before + ' → ' + t.time());
  check('перерыв не наступил', !t.overlayOpen());

  t.click('startBtn');                 // продолжить
  check('фаза вернулась к работе', t.phase() === 'РАБОТА', t.phase());

  t.advance(15 * MIN + 5000);          // оставалось 15 мин из 25
  check('после снятия паузы перерыв наступает', t.phase() === 'ПАУЗА', t.phase());
}

section('21. Сброс отличается от паузы');
{
  const t = boot();
  t.click('startBtn');
  t.advance(10 * MIN);
  t.click('resetBtn');
  check('таймер сброшен', t.phase() === 'ОЖИДАНИЕ', t.phase());
  t.advance(60 * MIN);
  check('после сброса ничего не происходит', t.phase() === 'ОЖИДАНИЕ');
}

section('22. Пропущенные перерывы видны');
{
  const t = boot();
  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  t.key('Escape');
  check('пропуск посчитан', t.$('statSkipped').textContent === '01',
        t.$('statSkipped').textContent);
  check('в выполненные не попал', t.$('statToday').textContent === '00');
}

section('23. Показано, сколько займёт упражнение');
{
  const t = boot();
  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  const txt = t.$('exerciseTime').textContent;
  check('оценка времени показана', /\d/.test(txt), txt);
  check('оценка не пустая и осмысленная', /сек|мин/.test(txt), txt);
}

/* ---------------------------------------------------------- */
section('24. Начальное показание таймера');
{
  const t = boot();
  check('до старта показано время работы, а не ноль',
        t.time() === '25:00', t.time());

  t.click('workPlus'); t.click('workPlus');   // 25 → 27, шаг 1 мин
  check('показание следует за настройкой', t.time() === '27:00', t.time());

  const t2 = boot({ seedStore: {
    'peredyshka.settings.v1': JSON.stringify({ workMin: 50, restMin: 10 }) } });
  check('после перезапуска показано сохранённое время',
        t2.time() === '50:00', t2.time());

  t2.click('startBtn');
  t2.click('resetBtn');
  check('после сброса снова показано время работы',
        t2.time() === '50:00', t2.time());
}

/* ---------------------------------------------------------- */
section('25. Автозапуск');
{
  const t = boot();
  check('тумблер есть в настройках', !!t.$('autoStart'));
  check('по умолчанию выключен',
        t.$('autoStart').getAttribute('aria-checked') === 'false');

  t.click('autoStart');
  check('после нажатия включён',
        t.$('autoStart').getAttribute('aria-checked') === 'true');
  const calls = t.invoked.filter(i => i.cmd === 'set_autostart');
  check('система получила команду', calls.length === 1 && calls[0].args.enabled === true);

  t.click('autoStart');
  check('повторное нажатие выключает',
        t.$('autoStart').getAttribute('aria-checked') === 'false');
}

section('26. Состояние читается из системы, а не из настроек');
{
  const t = boot({ autostart: true });
  const asked = t.invoked.filter(i => i.cmd === 'get_autostart');
  check('приложение спросило систему при запуске', asked.length === 1);
}

section('27. Предложение автозапуска — один раз и после первого перерыва');
{
  const t = boot();
  check('на старте предложения нет', t.$('autoOffer').hidden === true);

  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  check('во время перерыва предложения ещё нет', t.$('autoOffer').hidden === true);

  t.click('doneBtn');
  check('после первого выполненного перерыва предложение показано',
        t.$('autoOffer').hidden === false);

  t.click('offerYes');
  check('предложение скрылось', t.$('autoOffer').hidden === true);
  check('автозапуск включился',
        t.$('autoStart').getAttribute('aria-checked') === 'true');

  // второй перерыв — предложение больше не появляется
  t.advance(25 * MIN + 2000);
  t.click('doneBtn');
  check('повторно не предлагается', t.$('autoOffer').hidden === true);
}

section('28. Отказ от предложения запоминается');
{
  const t = boot();
  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  t.click('doneBtn');
  check('предложение показано', t.$('autoOffer').hidden === false);
  t.click('offerNo');
  check('скрылось после отказа', t.$('autoOffer').hidden === true);
  check('автозапуск не включён',
        t.$('autoStart').getAttribute('aria-checked') === 'false');

  const t2 = boot({ seedStore: t.store });
  t2.click('startBtn');
  t2.advance(25 * MIN + 2000);
  t2.click('doneBtn');
  check('после перезапуска программы не предлагается снова',
        t2.$('autoOffer').hidden === true);
}

section('29. Если автозапуск уже включён — не предлагаем');
{
  const t = boot({ autostart: true });
  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  t.click('doneBtn');
  check('предложения нет', t.$('autoOffer').hidden === true);
}

section('31. Шаг настройки — одна минута');
{
  const t = boot();
  check('старт с 25', t.$('workVal').textContent === '25');
  t.click('workPlus');
  check('плюс даёт 26', t.$('workVal').textContent === '26', t.$('workVal').textContent);
  t.click('workMinus'); t.click('workMinus');
  check('минус даёт 24', t.$('workVal').textContent === '24', t.$('workVal').textContent);

  for(let i = 0; i < 30; i++) t.click('workMinus');
  check('не опускается ниже 1', Number(t.$('workVal').textContent) >= 1,
        t.$('workVal').textContent);

  // пресеты продолжают работать
  const t2 = boot();
  t2.$('presets').children[1].onclick();
  check('пресет 50/10 применяется', t2.$('workVal').textContent === '50', t2.$('workVal').textContent);
  check('перерыв из пресета тоже', t2.$('restVal').textContent === '10');
}

section('32. Равномерность выбора упражнений');
{
  const pool = LIB.poolFor(1);
  const counts = {};
  // три полных круга: каждое упражнение должно выпасть ровно трижды
  const pick = LIB.createPicker();
  for(let i = 0; i < pool.length * 3; i++){
    const e = pick(1);
    counts[e.name] = (counts[e.name] || 0) + 1;
  }
  const vals = Object.values(counts);
  const min = Math.min(...vals), max = Math.max(...vals);
  check('за три круга разброс не больше единицы', max - min <= 1,
        'мин ' + min + ', макс ' + max);
  check('задействованы все упражнения', Object.keys(counts).length === pool.length,
        Object.keys(counts).length + ' из ' + pool.length);
}

section('33. Недавние упражнения переживают перезапуск');
{
  const t = boot();
  t.click('startBtn');
  const first = [];
  for(let i = 0; i < 5; i++){
    t.advance(25 * MIN + 2000);
    first.push(t.$('exerciseName').textContent);
    t.click('doneBtn');
  }
  check('список недавних сохранён', !!t.store['peredyshka.recent.v1']);

  // перезапуск программы с тем же хранилищем
  const t2 = boot({ seedStore: t.store });
  t2.click('startBtn');
  const after = [];
  for(let i = 0; i < 5; i++){
    t2.advance(25 * MIN + 2000);
    after.push(t2.$('exerciseName').textContent);
    t2.click('doneBtn');
  }
  const overlap = after.filter(n => first.includes(n)).length;
  check('после перезапуска не повторяет вчерашние', overlap === 0,
        'совпало: ' + overlap + ' — ' + after.filter(n => first.includes(n)).join(', '));
}

/* ---------------------------------------------------------- */
console.log('\n' + '─'.repeat(52));
console.log(`Пройдено: ${pass}   Провалено: ${fail}`);
process.exit(fail ? 1 : 0);
