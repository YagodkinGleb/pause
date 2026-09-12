/* Передышка — логика приложения. */
(function(){
'use strict';

/* ================= мост в Rust ================= */
/* В браузере window.__TAURI__ отсутствует — приложение просто работает без
   захвата экрана и нативных уведомлений, всё остальное идентично. */
var TAURI = (window.__TAURI__ && window.__TAURI__.core) ? window.__TAURI__.core : null;
function invoke(cmd, args){
  if(!TAURI) return Promise.resolve(null);
  return TAURI.invoke(cmd, args || {}).catch(function(e){
    console.error('invoke ' + cmd + ' failed:', e);
    return null;
  });
}

/* ================= константы ================= */
var WARNING_SEC   = 30;      // за сколько секунд предупреждать о перерыве
var SNOOZE_MIN    = 5;       // на сколько откладывает кнопка «Отложить»
var MAX_SNOOZES   = 3;       // сколько раз подряд можно отложить
var GAP_THRESHOLD = 25000;   // разрыв в тиках, считающийся сном/блокировкой, мс
var STORE_KEY     = 'peredyshka.settings.v1';
var STATS_KEY     = 'peredyshka.stats.v1';
var RECENT_KEY    = 'peredyshka.recent.v1';

/* ================= состояние ================= */
var S = {
  phase: 'idle',          // idle | work | rest
  running: false,
  transitioning: false,   // защита от двойного перехода фазы
  phaseEndAt: 0,
  phaseTotalSec: 0,
  snoozesUsed: 0,
  warningShown: false,
  exercise: null,
  exerciseStartedAt: 0,
  exerciseStepKey: '',
  paused: false,
  pausedRemainingSec: 0,
  pauseStartedAt: 0,
  lastTickAt: 0,
  tickHandle: null,
  breathHandle: null,
  trayHandle: null
};

var autostartOn = false;   // читается из системы, не из настроек
var autostartKnown = false; // ответ от системы ещё не получен
var autostartBusy = false;

var settings = {
  autoOffered: false,      // предложение автозапуска показывается один раз
  workMin: 25,
  restMin: 5,
  volume: 70,
  muted: false,
  softMode: false,
  showTips: true
};

var stats = { date: '', done: 0, skipped: 0, streak: 0, lastDoneDate: '' };

/* Список недавних упражнений переживает перезапуск программы.
   Без этого каждое утро колода тасовалась с нуля, и первые упражнения
   дня нередко повторяли вчерашние — именно это и выглядело
   как «одно и то же». */
var recentSeed = [];
try{
  var rawRecent = localStorage.getItem(RECENT_KEY);
  if(rawRecent){
    var parsed = JSON.parse(rawRecent);
    if(Array.isArray(parsed)) recentSeed = parsed.slice(0, 12);
  }
}catch(e){ console.warn('recent load failed', e); }

var pickExercise = createPicker({ recent: recentSeed });

function saveRecent(){
  try{ localStorage.setItem(RECENT_KEY, JSON.stringify(pickExercise.recent())); }
  catch(e){ console.warn('recent save failed', e); }
}

/* ================= элементы ================= */
function $(id){ return document.getElementById(id); }
var el = {
  body: document.body,
  ring: $('ringWrap'), progress: $('progressCircle'),
  time: $('timeDisplay'), phaseLabel: $('phaseLabel'),
  presets: Array.prototype.slice.call(document.querySelectorAll('.preset')),
  workVal: $('workVal'), restVal: $('restVal'),
  workMinus: $('workMinus'), workPlus: $('workPlus'),
  restMinus: $('restMinus'), restPlus: $('restPlus'),
  volRange: $('volRange'), muteBtn: $('muteBtn'), volIcon: $('volIcon'),
  softMode: $('softMode'), tipsMode: $('tipsMode'), autoStart: $('autoStart'),
  autoOffer: $('autoOffer'), offerYes: $('offerYes'), offerNo: $('offerNo'),
  startBtn: $('startBtn'), skipBtn: $('skipBtn'), resetBtn: $('resetBtn'),
  statToday: $('statToday'), statSkipped: $('statSkipped'),
  statStreak: $('statStreak'),
  hint: $('hint'),
  warning: $('warning'), warningCountdown: $('warningCountdown'),
  snoozeBtn: $('snoozeBtn'), warnNowBtn: $('warnNowBtn'),
  overlay: $('overlay'), overlayTime: $('overlayTime'),
  overlayBreath: $('overlayBreath'),
  exerciseZone: $('exerciseZone'), exerciseName: $('exerciseName'),
  exerciseTime: $('exerciseTime'), exerciseCount: $('exerciseCount'),
  exerciseDetail: $('exerciseDetail'), exerciseTip: $('exerciseTip'),
  doneBtn: $('doneBtn'), otherBtn: $('otherBtn')
};

var SEGMENTS = 24;     // число сегментов шкалы прогресса

var ZONE_NAMES = {
  legs:'Ноги', glutes:'Ягодичные', hips:'Тазобедренные',
  core:'Корпус', back:'Спина', chest:'Грудь', arms:'Руки',
  shoulders:'Плечи', cardio:'Пульс',
  circuit:'Круговая', walk:'Прогулка', mobility:'Растяжка', full:'Всё тело'
};

/* ================= хранилище ================= */
function loadSettings(){
  try{
    var raw = localStorage.getItem(STORE_KEY);
    if(raw){
      var p = JSON.parse(raw);
      if(Number.isFinite(p.workMin)) settings.workMin = clamp(Math.round(p.workMin), 1, 180);
      if(Number.isFinite(p.restMin)) settings.restMin = clamp(Math.round(p.restMin), 1, 60);
      if(Number.isFinite(p.volume)) settings.volume = clamp(p.volume, 0, 100);
      if(typeof p.muted === 'boolean')  settings.muted   = p.muted;
      if(typeof p.softMode === 'boolean') settings.softMode = p.softMode;
      if(typeof p.showTips === 'boolean') settings.showTips = p.showTips;
      if(typeof p.autoOffered === 'boolean') settings.autoOffered = p.autoOffered;
    }
  }catch(e){ console.warn('settings load failed', e); }
}
function saveSettings(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(settings)); }
  catch(e){ console.warn('settings save failed', e); }
}

function todayKey(){
  var d = new Date();
  return d.getFullYear() + '-' +
         String(d.getMonth()+1).padStart(2,'0') + '-' +
         String(d.getDate()).padStart(2,'0');
}
function daysBetween(a, b){
  if(typeof a !== 'string' || typeof b !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return null;
  var pa = a.split('-').map(Number), pb = b.split('-').map(Number);
  var da = Date.UTC(pa[0], pa[1]-1, pa[2]);
  var db = Date.UTC(pb[0], pb[1]-1, pb[2]);
  return Math.round((db - da) / 86400000);
}
function loadStats(){
  try{
    var raw = localStorage.getItem(STATS_KEY);
    if(raw) stats = Object.assign(stats, JSON.parse(raw));
  }catch(e){ console.warn('stats load failed', e); }
  ['done','skipped','streak'].forEach(function(key){
    stats[key] = Number.isFinite(stats[key]) ? Math.max(0, Math.floor(stats[key])) : 0;
  });
  if(typeof stats.lastDoneDate !== 'string') stats.lastDoneDate = '';

  var today = todayKey();
  if(stats.date !== today){       // новый день — счётчик за день обнуляем
    stats.date = today;
    stats.done = 0;
    stats.skipped = 0;
  }
  // серия рвётся, если пропустил день целиком
  var gap = daysBetween(stats.lastDoneDate, today);
  if(gap === null || gap > 1) stats.streak = stats.lastDoneDate === today ? stats.streak : 0;
}
function saveStats(){
  try{ localStorage.setItem(STATS_KEY, JSON.stringify(stats)); }
  catch(e){ console.warn('stats save failed', e); }
}
/* Разовое предложение автозапуска.
   Момент выбран так, чтобы оно было уместным: человек только что
   реально сделал перерыв, программа доказала пользу. Предлагать
   это на первом запуске — выпрашивать разрешение до всякой пользы. */
function maybeOfferAutostart(){
  if(settings.autoOffered) return;
  // Пока система не ответила, включён ли автозапуск, предлагать нельзя:
  // иначе можно предложить то, что уже работает.
  if(!autostartKnown) return;
  if(autostartOn) return;
  if(stats.done < 1) return;
  el.autoOffer.hidden = false;
}

function dismissOffer(){
  el.autoOffer.hidden = true;
  settings.autoOffered = true;
  saveSettings();
}

function recordBreak(completed){
  var today = todayKey();
  if(stats.date !== today){ stats.date = today; stats.done = 0; stats.skipped = 0; }

  if(completed){
    stats.done++;
    if(stats.lastDoneDate !== today){
      var gap = daysBetween(stats.lastDoneDate, today);
      stats.streak = (gap === 1) ? stats.streak + 1 : 1;
      stats.lastDoneDate = today;
    }
  } else {
    stats.skipped++;
  }
  saveStats();
  renderStats();
  if(completed) maybeOfferAutostart();
}

/* ================= утилиты ================= */
function clamp(v, lo, hi){ return Math.min(hi, Math.max(lo, v)); }
function fmt(sec){
  sec = Math.max(0, Math.round(sec));
  var m = Math.floor(sec/60), s = sec % 60;
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}
function remainingSec(){ return S.paused ? S.pausedRemainingSec : (S.phaseEndAt - Date.now()) / 1000; }

/* ================= звук ================= */
var audioCtx = null;
function ctx(){
  if(!audioCtx){
    var AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    audioCtx = new AC();
  }
  if(audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function playAlarm(kind){
  if(settings.muted || settings.volume === 0) return;
  var c = ctx();
  if(!c) return;

  // громкость слайдера воспринимается на слух линейно, если возвести в квадрат
  var vol = Math.pow(settings.volume / 100, 2) * 0.55;

  var pattern;
  if(kind === 'rest')      pattern = [659, 659, 880, 659, 880, 988, 1175];
  else if(kind === 'warn') pattern = [523, 494];
  else                     pattern = [523, 659];

  var t = c.currentTime + 0.02;
  pattern.forEach(function(freq){
    var dur = 0.34;
    // две волны сразу: синус даёт тело, треугольник — слышимость на слабых колонках
    ['sine','triangle'].forEach(function(type, i){
      var o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * (i ? 0.45 : 1), t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur + 0.03);
    });
    t += dur + 0.1;
  });
}

/* ================= отрисовка ================= */
function buildTicks(){
  // Сегментная шкала: заполняется дискретными блоками, как индикатор
  // на промышленном контроллере, а не плавно ползущей линией.
  var bar = $('progressBar');
  bar.innerHTML = '';
  for(var i = 0; i < SEGMENTS; i++){
    bar.appendChild(document.createElement('i'));
  }
}

function paintBar(frac){
  var bar = $('progressBar');
  var lit = Math.round(clamp(frac, 0, 1) * SEGMENTS);
  var cells = bar.children;
  for(var i = 0; i < cells.length; i++){
    cells[i].className = (i < lit) ? 'on' : '';
  }
}

function renderSettings(){
  el.workVal.textContent = pad2(settings.workMin);
  el.restVal.textContent = pad2(settings.restMin);
  el.volRange.value = settings.volume;
  el.volRange.style.setProperty('--fill', settings.volume + '%');
  el.muteBtn.classList.toggle('on', !settings.muted && settings.volume > 0);
  el.muteBtn.setAttribute('aria-pressed', String(settings.muted));
  el.muteBtn.setAttribute('aria-label', settings.muted ? 'Включить звук' : 'Выключить звук');
  el.volIcon.style.opacity = settings.muted ? 0.4 : 1;
  el.softMode.setAttribute('aria-checked', String(settings.softMode));
  el.tipsMode.setAttribute('aria-checked', String(settings.showTips));
  el.autoStart.setAttribute('aria-checked', String(autostartOn));
  el.autoStart.disabled = autostartBusy || !TAURI;
  el.autoStart.firstElementChild.textContent = autostartOn ? 'ВКЛ' : 'ВЫКЛ';
  el.softMode.firstElementChild.textContent = settings.softMode ? 'ВКЛ' : 'ВЫКЛ';
  el.tipsMode.firstElementChild.textContent = settings.showTips ? 'ВКЛ' : 'ВЫКЛ';

  el.presets.forEach(function(b){
    var selected = Number(b.dataset.work) === settings.workMin && Number(b.dataset.rest) === settings.restMin;
    b.classList.toggle('active', selected);
    b.setAttribute('aria-pressed', String(selected));
  });

  if(!S.running) renderTick();
}

function pad2(n){ return (n < 10 ? '0' : '') + n; }

function renderStats(){
  el.statToday.textContent = pad2(stats.done);
  el.statSkipped.textContent = pad2(stats.skipped);
  el.statStreak.textContent = pad2(stats.streak);
}

function renderTick(){
  // Пока таймер не запущен, отсчитывать не от чего: показываем
  // выставленную длительность работы, а не ноль
  if(!S.running){
    el.time.textContent = fmt(settings.workMin * 60);
    paintBar(0);
    return;
  }
  var rem = remainingSec();
  var txt = fmt(rem);
  el.time.textContent = txt;
  el.overlayTime.textContent = txt;
  if(S.phase === 'rest'){
    el.otherBtn.disabled = rem < 52;
    el.otherBtn.title = rem < 52 ? 'Осталось мало времени для новой связки' : 'Другая связка в оставшееся время';
    renderExerciseProgress();
  }

  var frac = S.phaseTotalSec > 0
    ? clamp((S.phaseTotalSec - rem) / S.phaseTotalSec, 0, 1) : 0;
  paintBar(frac);
}

function setDisabled(disabled){
  [el.workMinus, el.workPlus, el.restMinus, el.restPlus].forEach(function(b){
    b.disabled = disabled;
  });
  el.presets.forEach(function(b){ b.disabled = disabled; });
}

/* ================= дыхательная подсказка ================= */
function startBreath(){
  el.overlayBreath.textContent = 'Без спешки · в комфортной амплитуде';
}
function stopBreath(){
  clearInterval(S.breathHandle);
  el.overlayBreath.textContent = '';
}

/* ================= предупреждение ================= */
function showWarning(){
  if(S.warningShown) return;
  S.warningShown = true;
  el.body.classList.add('warning-mode');
  el.warning.classList.add('show');
  el.snoozeBtn.disabled = S.snoozesUsed >= MAX_SNOOZES;
  el.snoozeBtn.textContent = S.snoozesUsed >= MAX_SNOOZES
    ? 'Больше откладывать нельзя'
    : 'Отложить на ' + SNOOZE_MIN + ' мин';
  playAlarm('warn');
  invoke('notify', {
    title: 'Перерыв через полминуты',
    body: 'Заканчивай мысль'
  });
}
function hideWarning(){
  S.warningShown = false;
  el.body.classList.remove('warning-mode');
  el.warning.classList.remove('show');
}
function snooze(){
  if(!S.running || S.paused || S.phase !== 'work' || !S.warningShown) return;
  if(S.snoozesUsed >= MAX_SNOOZES) return;
  S.snoozesUsed++;
  S.phaseEndAt += SNOOZE_MIN * 60 * 1000;
  S.phaseTotalSec += SNOOZE_MIN * 60;
  hideWarning();
  el.hint.textContent = 'Отложено на ' + SNOOZE_MIN + ' мин. Осталось отсрочек: ' +
                        (MAX_SNOOZES - S.snoozesUsed);
  renderTick();
}

/* ================= экран отдыха ================= */

/* =====================================================================
   Точечно-матричные цифры — подпись направления.
   Число повторов набирается точками, как на светодиодном табло
   промышленного контроллера. Растровая сетка 5×7 на знак.
   ===================================================================== */
var GLYPHS = {
  '0':['01110','10001','10011','10101','11001','10001','01110'],
  '1':['00100','01100','00100','00100','00100','00100','01110'],
  '2':['01110','10001','00001','00010','00100','01000','11111'],
  '3':['11111','00010','00100','00010','00001','10001','01110'],
  '4':['00010','00110','01010','10010','11111','00010','00010'],
  '5':['11111','10000','11110','00001','00001','10001','01110'],
  '6':['00110','01000','10000','11110','10001','10001','01110'],
  '7':['11111','00001','00010','00100','01000','01000','01000'],
  '8':['01110','10001','10001','01110','10001','10001','01110'],
  '9':['01110','10001','10001','01111','00001','00010','01100'],
  '\u00D7':['00000','10001','01010','00100','01010','10001','00000'],
  ' ':['00000','00000','00000','00000','00000','00000','00000']
};

/* Собирает SVG из точек. dot — радиус, step — шаг сетки */
function dotMatrix(text, dot, step){
  var chars = String(text).split('');
  var gap = step;                       // просвет между знаками
  var w = chars.length * (5 * step + gap) - gap;
  var h = 7 * step;
  var out = '';
  var x0 = 0;

  chars.forEach(function(ch){
    var g = GLYPHS[ch];
    if(g){
      for(var r = 0; r < 7; r++){
        for(var c = 0; c < 5; c++){
          if(g[r][c] === '1'){
            var cx = x0 + c * step + step/2;
            var cy = r * step + step/2;
            out += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) +
                   '" r="' + dot + '"/>';
          }
        }
      }
    }
    x0 += 5 * step + gap;
  });

  return '<svg class="dm" viewBox="0 0 ' + w.toFixed(0) + ' ' + h.toFixed(0) +
         '" role="img" aria-hidden="true">' + out + '</svg>';
}

/* Разбирает задание в крупную надпись: «3 × 20», «45 сек», «2 × 40 сек» */
function countMarkup(ex){
  if(!ex || !ex.kind) return '';
  if(ex.kind === 'sequence') return dotMatrix(String(ex.seconds), 4.2, 10) + '<span class="u">СЕКУНД</span>';
  var sets = ex.sets || 1;
  var num, unit;

  if(ex.kind === 'hold'){
    num = String(ex.hold);
    unit = 'СЕК' + (ex.perSide ? ' НА СТОРОНУ' : '');
  } else if(ex.kind === 'side'){
    num = String(ex.reps);
    unit = 'НА КАЖДУЮ СТОРОНУ';
  } else {
    num = String(ex.reps);
    unit = 'ПОВТОРОВ';
  }
  if(sets > 1){
    // «3×20» уже само себя объясняет — дублировать подходы в подписи незачем
    num = sets + '\u00D7' + num;
    unit = unit + ' В ПОДХОДЕ';
  }
  return dotMatrix(num, 4.2, 10) + '<span class="u">' + unit + '</span>';
}

function showExercise(){
  var next = pickExercise(Math.max(0, remainingSec()) / 60);
  if(!next) return;
  S.exercise = next;
  S.exerciseStartedAt = Date.now();
  S.exerciseStepKey = '';
  saveRecent();
  el.exerciseZone.textContent = (ZONE_NAMES[S.exercise.zone] || S.exercise.zone).toUpperCase();
  // Крупно выносим то, что человек должен запомнить, встав со стула:
  // сколько подходов на сколько повторов. Остальное — пояснение.
  el.exerciseName.textContent = S.exercise.name || S.exercise.title;
  el.exerciseDetail.textContent = S.exercise.detail;
  $('exerciseSpace').textContent = 'Стоя · без инвентаря' + (S.exercise.support ? ' · рядом со стеной' : ' · на месте');
  $('exerciseSteps').replaceChildren();
  S.exercise.steps.forEach(function(step, index){
    var li = document.createElement('li');
    var heading = document.createElement('div');
    heading.className = 'step-heading';
    var name = document.createElement('strong');
    name.textContent = step.name;
    var time = document.createElement('span');
    time.textContent = step.duration + ' сек';
    heading.append(name, time);
    var form = document.createElement('p');
    form.textContent = step.form;
    li.append(heading, form);
    li.dataset.step = index;
    $('exerciseSteps').appendChild(li);
  });
  document.querySelector('.ov-body').scrollTop = 0;

  // сколько это займёт на самом деле — чтобы задание не выглядело
  // взятым с потолка и было видно, что оно влезает в перерыв
  el.exerciseTime.textContent = 'Связка ' + fmt(S.exercise.totalSec) + ' мин · затем свободный отдых';
  renderTip();
  renderExerciseProgress();
}
function renderTip(){
  if(settings.showTips && S.exercise.tip){
    el.exerciseTip.textContent = S.exercise.tip;
    el.exerciseTip.hidden = false;
  } else {
    el.exerciseTip.hidden = true;
  }
}
function renderExerciseProgress(){
  if(!S.exercise) return;
  var elapsed = Math.max(0, Math.floor((Date.now() - S.exerciseStartedAt) / 1000));
  var left = S.exercise.preparationSec - elapsed;
  var key = 'prepare', label = 'ПРИГОТОВЬСЯ', status = 'Встань и прочитай движения';
  var active = -1;
  if(left <= 0){
    var cursor = S.exercise.preparationSec;
    key = 'finished'; label = 'СВОБОДНЫЙ ОТДЫХ'; status = 'Связка закончилась. Отдохни от экрана'; left = 0;
    for(var i = 0; i < S.exercise.steps.length; i++){
      var step = S.exercise.steps[i];
      cursor += step.restBefore;
      if(elapsed < cursor){
        key = 'transition-' + i; label = 'ПЕРЕДЫШКА'; status = 'Дальше: ' + step.name; left = cursor - elapsed; break;
      }
      cursor += step.duration;
      if(elapsed < cursor){
        active = i; key = 'step-' + i; label = 'ШАГ ' + (i + 1) + ' / ' + S.exercise.steps.length;
        status = step.name; left = cursor - elapsed; break;
      }
    }
  }
  el.exerciseCount.innerHTML = left > 0 ? countMarkup({kind:'sequence', seconds:left}) : '<span class="count-finished" aria-hidden="true">✓</span><span class="u">ГОТОВО</span>';
  if(S.exerciseStepKey !== key){
    S.exerciseStepKey = key;
    $('stepLabel').textContent = label;
    $('stepStatus').textContent = status;
    Array.from($('exerciseSteps').children).forEach(function(li,i){
      li.classList.toggle('active', i === active);
      if(i === active){
        li.setAttribute('aria-current','step');
        if(typeof li.scrollIntoView === 'function') li.scrollIntoView({block:'nearest'});
      } else li.removeAttribute('aria-current');
    });
  }
}
var previousFocus = null;
function openOverlay(){
  showExercise();
  previousFocus = document.activeElement;
  $('mainScreen').inert = true;
  el.overlay.hidden = false;
  el.overlay.classList.add('show');
  el.body.classList.add('overlay-open');
  el.overlay.focus();
}
function closeOverlay(){
  var wasOpen = el.overlay.classList.contains('show');
  el.overlay.classList.remove('show');
  el.overlay.hidden = true;
  $('mainScreen').inert = false;
  el.body.classList.remove('overlay-open');
  if(wasOpen && previousFocus && previousFocus.isConnected) previousFocus.focus();
}

/* ================= переходы фаз ================= */
function goWork(){
  if(S.transitioning) return;
  S.transitioning = true;
  S.paused = false;
  el.body.classList.remove('paused');
  el.startBtn.textContent = 'Пауза';

  S.phase = 'work';
  S.phaseTotalSec = settings.workMin * 60;
  S.phaseEndAt = Date.now() + S.phaseTotalSec * 1000;
  S.snoozesUsed = 0;
  hideWarning();
  closeOverlay();
  stopBreath();

  el.body.classList.remove('rest-mode');
  el.ring.classList.remove('breathe');
  el.phaseLabel.textContent = 'РАБОТА';
  el.skipBtn.textContent = 'Отдохнуть сейчас';
  el.hint.textContent = 'Следующий перерыв через ' + settings.workMin + ' мин';

  playAlarm('work');
  invoke('enter_work');
  updateTray();
  renderTick();

  S.transitioning = false;
}

function goRest(){
  if(S.transitioning || !S.running || S.phase !== 'work') return;
  S.transitioning = true;
  S.paused = false;
  S.lastTickAt = Date.now();
  el.body.classList.remove('paused');
  el.startBtn.textContent = 'Пауза';

  S.phase = 'rest';
  S.phaseTotalSec = settings.restMin * 60;
  S.phaseEndAt = Date.now() + S.phaseTotalSec * 1000;
  hideWarning();

  el.body.classList.add('rest-mode');
  el.ring.classList.add('breathe');
  el.phaseLabel.textContent = 'ПАУЗА';
  el.skipBtn.textContent = 'Вернуться к работе';
  el.hint.textContent = 'Разомнись — потом вернёшься к задаче';

  openOverlay();
  startBreath();
  playAlarm('rest');

  invoke('notify', {
    title: 'Перерыв: ' + S.exercise.title,
    body: S.exercise.detail
  });
  // в мягком режиме окно не трогаем вовсе — только звук и уведомление
  if(!settings.softMode) invoke('enter_rest');
  updateTray();
  renderTick();

  S.transitioning = false;
}

/* ================= трей ================= */
function updateTray(){
  var text;
  if(!S.running) text = 'Передышка — остановлена';
  else if(S.paused) text = 'Пауза · ' + fmt(remainingSec());
  else if(S.phase === 'rest') text = 'Перерыв · ' + fmt(remainingSec());
  else text = 'До перерыва · ' + fmt(remainingSec());
  invoke('set_tray', { phase: S.phase, tooltip: text });
}

/* ================= главный тик ================= */
function tick(){
  var now = Date.now();
  var gap = now - S.lastTickAt;
  S.lastTickAt = now;
  if(stats.date !== todayKey()){ loadStats(); renderStats(); }

  // на паузе время не идёт: сдвигаем конец фазы вперёд на прошедшее
  if(S.paused){
    return;
  }

  /* Компьютер спал или был заблокирован.
     Время «отсутствия» не должно засчитываться как работа: иначе вернувшись
     с обеда ты сразу получаешь перерыв за отдых, который уже состоялся. */
  if(gap > GAP_THRESHOLD && S.running){
    var awaySec = gap / 1000;
    if(S.phase === 'rest'){
      // отсутствовал во время перерыва — перерыв и так состоялся
      recordBreak(true);
      goWork();
      el.hint.textContent = 'Перерыв засчитан — отсчёт пошёл заново';
      renderTick();
      return;
    }
    if(awaySec >= settings.restMin * 60){
      // отсутствовал дольше, чем длится перерыв — считаем, что отдохнул
      goWork();
      el.hint.textContent = 'Компьютер был неактивен ' +
                            Math.round(awaySec/60) + ' мин — отсчёт начат заново';
      renderTick();
      return;
    }
    // короткая отлучка — просто не засчитываем её как рабочее время
    S.phaseEndAt += gap;
    S.phaseTotalSec += gap / 1000;   // иначе кольцо прогресса дёрнется назад
  }

  var rem = remainingSec();

  if(S.phase === 'work'){
    if(rem <= WARNING_SEC && rem > 0){
      showWarning();
      el.warningCountdown.textContent = Math.max(0, Math.ceil(rem));
    }
    if(rem <= 0){ goRest(); return; }
  } else if(S.phase === 'rest'){
    if(rem <= 0){ recordBreak(true); goWork(); return; }
  }

  renderTick();
}

/* ================= пауза ================= */
function setPaused(on){
  if(!S.running || S.paused === on) return;
  if(on){
    S.pausedRemainingSec = remainingSec();
    S.pauseStartedAt = Date.now();
  } else {
    var pausedFor = Date.now() - S.pauseStartedAt;
    S.phaseEndAt += pausedFor;
    S.exerciseStartedAt += pausedFor;
  }
  S.paused = on;
  el.body.classList.toggle('paused', on);
  if(on){
    hideWarning();
    el.startBtn.textContent = 'Продолжить';
    el.phaseLabel.textContent = 'ОСТАНОВЛЕНО';
    el.hint.textContent = 'Время не идёт, пока стоит пауза';
  } else {
    el.startBtn.textContent = 'Пауза';
    el.phaseLabel.textContent = S.phase === 'rest' ? 'ПАУЗА' : 'РАБОТА';
    el.hint.textContent = S.phase === 'rest'
      ? 'Отойди от экрана'
      : 'Следующий перерыв через ' + settings.workMin + ' мин';
    S.lastTickAt = Date.now();
  }
  updateTray();
}

/* ================= старт / стоп ================= */
function start(){
  ctx(); // разблокировать звук пользовательским жестом
  S.running = true;
  S.paused = false;
  el.startBtn.textContent = 'Пауза';
  el.skipBtn.hidden = false;
  el.resetBtn.hidden = false;
  setDisabled(true);
  S.lastTickAt = Date.now();
  goWork();
  clearInterval(S.tickHandle);
  S.tickHandle = setInterval(tick, 1000);
  clearInterval(S.trayHandle);
  S.trayHandle = setInterval(updateTray, 20000);
}

function stop(){
  S.running = false;
  S.paused = false;
  el.body.classList.remove('paused');
  S.phase = 'idle';
  clearInterval(S.tickHandle);
  clearInterval(S.trayHandle);
  stopBreath();
  hideWarning();
  closeOverlay();
  invoke('enter_work');
  el.startBtn.textContent = 'Начать';
  el.skipBtn.hidden = true;
  el.resetBtn.hidden = true;
  setDisabled(false);
  el.body.classList.remove('rest-mode');
  el.ring.classList.remove('breathe');
  el.phaseLabel.textContent = 'ОЖИДАНИЕ';
  el.hint.textContent = 'Крестик прячет окно в трей, программа продолжит работать';
  renderSettings();
  updateTray();
}

/* ================= события ================= */
function bump(field, delta, lo, hi){
  settings[field] = clamp(settings[field] + delta, lo, hi);
  saveSettings();
  renderSettings();
}

/* Шаг в одну минуту: пресеты сверху закрывают типовые режимы,
   а плюс-минус нужны как раз для точной подгонки. */
el.workMinus.onclick = function(){ bump('workMin', -1, 1, 180); };
el.workPlus .onclick = function(){ bump('workMin',  1, 1, 180); };
el.restMinus.onclick = function(){ bump('restMin', -1, 1, 60); };
el.restPlus .onclick = function(){ bump('restMin',  1, 1, 60); };

el.presets.forEach(function(b){
  b.onclick = function(){
    settings.workMin = Number(b.dataset.work);
    settings.restMin = Number(b.dataset.rest);
    saveSettings(); renderSettings();
  };
});

el.volRange.oninput = function(){
  settings.volume = Number(el.volRange.value);
  if(settings.volume > 0) settings.muted = false;
  saveSettings(); renderSettings();
};
el.muteBtn.onclick = function(){
  settings.muted = !settings.muted;
  saveSettings(); renderSettings();
  if(!settings.muted) playAlarm('work');
};
el.softMode.onclick = function(){
  settings.softMode = !settings.softMode;
  saveSettings(); renderSettings();
};
function changeAutostart(next){
  if(autostartBusy || !TAURI) return;
  var before = autostartOn;
  autostartBusy = true;
  autostartOn = next;                 // сразу показываем результат
  autostartKnown = true;
  renderSettings();
  invoke('set_autostart', { enabled: next }).then(function(real){
    autostartBusy = false;
    autostartOn = typeof real === 'boolean' ? real : before;
    if(typeof real !== 'boolean' || real !== next){
      $('appStatus').textContent = 'Windows не подтвердила изменение автозапуска. Попробуй ещё раз.';
      $('appStatus').hidden = false;
    }
    renderSettings();
  });
}
el.autoStart.onclick = function(){ changeAutostart(!autostartOn); };

el.tipsMode.onclick = function(){
  settings.showTips = !settings.showTips;
  saveSettings(); renderSettings();
  if(el.overlay.classList.contains('show')) renderTip();
};

el.startBtn.onclick = function(){
  if(!S.running) start();
  else setPaused(!S.paused);
};
el.resetBtn.onclick = function(){ stop(); };

el.skipBtn.onclick = function(){
  if(S.phase === 'work'){ goRest(); }
  else { recordBreak(false); goWork(); }
};

el.snoozeBtn.onclick = snooze;
el.warnNowBtn.onclick = function(){ goRest(); };

el.offerYes.onclick = function(){
  dismissOffer();
  changeAutostart(true);
};
el.offerNo.onclick = dismissOffer;

function finishBreak(completed){
  if(!S.running || S.phase !== 'rest') return;
  recordBreak(completed); goWork();
}
el.doneBtn.onclick = function(){ finishBreak(true); };
$('dismissBreakBtn').onclick = function(){ finishBreak(false); };
el.otherBtn.onclick = function(){
  if(S.phase === 'rest' && !S.paused && remainingSec() >= 52) { showExercise(); renderTick(); }
};
$('supportLink').onclick = function(e){
  if(!TAURI) return;
  e.preventDefault();
  invoke('open_support').then(function(ok){
    if(ok !== true){
      $('appStatus').textContent = 'Не удалось открыть браузер. Адрес поддержки: https://boosty.to/yagojeez/donate';
      $('appStatus').hidden = false;
    }
  });
};

document.addEventListener('keydown', function(e){
  if(e.repeat) return;
  if(e.key === 'Tab' && el.overlay.classList.contains('show')){
    var buttons = Array.from(el.overlay.querySelectorAll('button:not(:disabled)'));
    var first = buttons[0], last = buttons[buttons.length - 1];
    if(e.shiftKey && (document.activeElement === first || document.activeElement === el.overlay)){
      e.preventDefault(); last.focus();
    } else if(!e.shiftKey && (document.activeElement === last || document.activeElement === el.overlay)){
      e.preventDefault(); first.focus();
    }
  }
  if(e.key === 'Escape'){
    if(el.overlay.classList.contains('show')){
      e.preventDefault(); finishBreak(false);
    } else if(S.warningShown){
      hideWarning();
    }
  }
  if(e.key === ' ' && !el.overlay.classList.contains('show')
     && document.activeElement === document.body){
    e.preventDefault();
    if(!S.running) start(); else setPaused(!S.paused);
  }
});

/* Вкладка/окно снова видимы — пересчитать немедленно, не ждать секунды */
document.addEventListener('visibilitychange', function(){
  if(!document.hidden && S.running) renderTick();
});

window.countMarkupTest = countMarkup;

/* ================= инициализация ================= */
invoke('get_autostart').then(function(on){
  if(autostartBusy) return;
  if(typeof on === 'boolean'){ autostartOn = on; autostartKnown = true; }
  renderSettings();
});

buildTicks();
loadSettings();
loadStats();
renderSettings();
renderStats();
renderTick();
updateTray();
invoke('launched_at_login').then(function(on){ if(on === true && !S.running) start(); });

window.addEventListener('focus', function(){
  if(autostartBusy) return;
  invoke('get_autostart').then(function(on){
    if(!autostartBusy && typeof on === 'boolean'){
      autostartOn = on; autostartKnown = true; renderSettings();
    }
  });
});

})();
