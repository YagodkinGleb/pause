/* Передышка: чёрное поле, белая рамка, оранжевый акцент перерыва.
   Геометрия экрана не зависит от цифр и длины инструкций. */

:root{
  /* Значения сняты пипеткой с референса */
  --bg:#010101;
  --line:#FFFFFF;
  --work:#FFFFFF;
  --done:#16C252;        /* зелёный: счётчик выполненных перерывов */
  --break:#FB8309;       /* яркий сигнальный оранжевый */
  /* Синий из палитры референса в интерфейсе не используется:
     состояний всего два, и третий цвет только мешает их различать. */
  --muted:#8C8C8C;

  --on-bright:#010101;


  --dim:#262626;         /* незаполненные сегменты шкалы */
  --rule:#3A3A3A;

  --mono:Consolas,'Cascadia Mono','Courier New',monospace;

  --u:8px;
  --z-warning:20;
  --z-overlay:40;
}

*{ box-sizing:border-box; margin:0; padding:0; }
[hidden]{ display:none !important; }
html,body{ height:100%; }

body{
  background:var(--bg);
  color:var(--line);
  font-family:var(--mono);
  font-size:14px; line-height:1.3;
  -webkit-font-smoothing:antialiased;
  display:flex; align-items:flex-start; justify-content:center;
  overflow-x:hidden; overflow-y:auto;
  user-select:none; cursor:default;
}
/* Пока открыт полноэкранный перерыв, фоновый документ (главное окно
   под ним) не должен прокручиваться — иначе его полоса прокрутки
   просвечивает сбоку сквозь оверлей, даже когда самому оверлею
   скролл не нужен. */
body.overlay-open{ overflow:hidden; }

button{ font-family:inherit; cursor:pointer; color:inherit; }

:focus-visible{ outline:2px solid var(--line); outline-offset:2px; }

.visually-hidden{
  position:absolute; width:1px; height:1px; margin:-1px; padding:0;
  overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0;
}

.app{
  width:100%; max-width:400px;
  padding:16px 16px 24px;
  display:flex; flex-direction:column; gap:16px;
}

/* ---------------- Строка состояния ---------------- */
.sysline{
  display:flex; justify-content:space-between; align-items:center;
  font-size:9px; font-weight:700; letter-spacing:.10em;
  color:var(--muted);
  border-bottom:1px solid var(--rule); padding-bottom:8px;
}
.sys-state{
  background:var(--work); color:var(--on-bright);
  border:1px solid var(--work); padding:3px 8px;
}
/* Второй признак помимо цвета: в перерыве плашка обрамлена
   служебными скобками — состояние читается даже на монохромном
   экране и при любом типе дальтонизма */
body.rest-mode .sys-state::before{ content:'[ '; }
body.rest-mode .sys-state::after{ content:' ]'; }
body.rest-mode .sys-state{ background:var(--break); color:var(--on-bright); border-color:var(--break); }
body.warning-mode .sys-state{ background:var(--break); color:var(--on-bright); border-color:var(--break); }
body.paused .sys-state{ background:transparent; color:var(--muted); border-color:var(--rule); }

/* ---------------- Показание ---------------- */
.readout{
  border:2px solid var(--line);
  padding:18px 16px 16px;
  display:flex; flex-direction:column; gap:16px;
}
.time{
  font-size:64px; font-weight:700; line-height:1;
  letter-spacing:0; text-align:center;
  font-variant-numeric:tabular-nums lining-nums;
}
body.paused .time{ color:var(--muted); }

/* Сегментная шкала: заполняется блоками, как индикатор на приборе */
.bar{
  display:flex; gap:3px; height:16px;
}
.bar i{
  flex:1; background:var(--dim); display:block;
}
.bar i.on{ background:var(--line); }
body.rest-mode .bar i.on{ background:var(--break); }
body.warning-mode .bar i.on{ background:var(--line); }
body.paused .bar i.on{ background:var(--muted); }

/* ---------------- Пресеты ---------------- */
.presets{ display:flex; gap:8px; }
.preset{
  flex:1; padding:10px 0;
  border:1px solid var(--rule); background:transparent;
  font-size:12px; font-weight:700; letter-spacing:.04em;
  color:var(--muted);
}
.preset:hover:not(:disabled){ border-color:var(--line); color:var(--line); }
.preset.active{ background:var(--line); color:var(--bg); border-color:var(--line); }
.preset:disabled{ opacity:.4; cursor:default; }

/* ---------------- Настройки ---------------- */
.controls{ display:flex; flex-direction:column; }
.row{
  display:flex; align-items:center; justify-content:space-between;
  gap:12px; min-height:48px;
  padding:8px 0; border-bottom:1px solid var(--rule);
}
.row label{
  font-size:11px; font-weight:700; letter-spacing:.08em;
  text-transform:uppercase;
  display:flex; flex-direction:column; gap:2px;
}
.row label em{
  font-style:normal; font-size:9px; font-weight:400;
  letter-spacing:.06em; color:var(--muted); text-transform:uppercase;
}

/* Скобки — подпись направления: значения зажаты в рамки */
.stepper{ display:flex; align-items:center; gap:0; }
.stepper button{
  position:relative;
  width:32px; height:32px;
  border:1px solid var(--rule); background:transparent;
  font-size:15px; font-weight:700; line-height:1;
  display:flex; align-items:center; justify-content:center;
}
.stepper button::after{
  content:''; position:absolute; top:50%; left:50%;
  transform:translate(-50%,-50%); width:44px; height:44px;
}
.stepper button:hover:not(:disabled){ background:var(--line); color:var(--bg); }
.stepper button:disabled{ opacity:.3; cursor:default; }
.stepper .val{
  min-width:46px; height:32px; line-height:30px; text-align:center;
  border-top:1px solid var(--rule); border-bottom:1px solid var(--rule);
  font-size:15px; font-weight:700;
  font-variant-numeric:tabular-nums lining-nums;
}
.stepper .unit{
  font-size:9px; font-weight:700; letter-spacing:.10em;
  color:var(--muted); margin-left:8px; min-width:22px;
  text-transform:uppercase;
}

.vol-group{ display:flex; align-items:center; gap:10px; width:158px; }
.icon-btn{
  position:relative; width:32px; height:32px; flex-shrink:0;
  border:1px solid var(--rule); background:transparent; color:var(--muted);
  display:flex; align-items:center; justify-content:center;
}
.icon-btn::after{
  content:''; position:absolute; top:50%; left:50%;
  transform:translate(-50%,-50%); width:44px; height:44px;
}
.icon-btn:hover{ border-color:var(--line); color:var(--line); }
.icon-btn.on{ color:var(--line); border-color:var(--line); }
.icon-btn svg{ width:15px; height:15px; }

input[type=range]{
  flex:1; -webkit-appearance:none; appearance:none;
  height:8px; cursor:pointer; background:transparent;
  border:1px solid var(--rule);
  background-image:linear-gradient(to right,
    var(--line) 0%, var(--line) var(--fill,70%),
    transparent var(--fill,70%), transparent 100%);
}
input[type=range]::-webkit-slider-thumb{
  -webkit-appearance:none; appearance:none;
  width:4px; height:16px; background:var(--line); border:none;
}

/* Переключатель — текстовый, без графики: ВКЛ / ВЫКЛ */
.switch{
  position:relative; min-width:60px; height:28px; flex-shrink:0;
  border:1px solid var(--rule); background:transparent;
  font-family:var(--mono); font-size:9px; font-weight:700;
  letter-spacing:.10em; color:var(--muted);
  display:flex; align-items:center; justify-content:center;
}
.switch::before{
  content:''; position:absolute; top:50%; left:50%;
  transform:translate(-50%,-50%); width:60px; height:44px;
}
.switch[aria-checked="true"]{
  background:var(--line); color:var(--bg); border-color:var(--line);
}

/* ---------------- Кнопки ---------------- */
.actions{ display:flex; gap:8px; }
.btn{
  flex:1; padding:0; height:44px;
  border:2px solid var(--line); background:transparent; color:var(--line);
  font-size:13px; font-weight:700; letter-spacing:.05em;
  text-transform:uppercase;
}
.btn:hover{ background:var(--line); color:var(--bg); }
.btn.primary{ background:var(--line); border-color:var(--line); color:var(--bg); }
.btn.primary:hover{ background:#D8D8D8; border-color:#D8D8D8; color:var(--bg); }
body.rest-mode .btn.primary{
  background:var(--break); border-color:var(--break); color:var(--on-bright);
}
body.rest-mode .btn.primary:hover{ background:#FF9526; border-color:#FF9526; }

.link-btn{
  align-self:center;
  background:none; border:none; padding:6px 10px;
  color:var(--muted); font-size:10px; font-weight:700; letter-spacing:.10em;
}
.link-btn:hover{ color:var(--line); }

/* ---------------- Счётчики ---------------- */
.stats{ display:flex; gap:8px; }
.stats span{
  flex:1; border:1px solid var(--rule); padding:8px 4px;
  display:flex; flex-direction:column; align-items:center; gap:3px;
}
.stats i{
  font-style:normal; font-size:8px; font-weight:700;
  letter-spacing:.10em; color:var(--muted);
}
.stats b{
  font-size:20px; font-weight:700; line-height:1;
  font-variant-numeric:tabular-nums lining-nums;
}
/* Единственное место зелёного: сделанные перерывы.
   Оранжевого в этом блоке нет, спутать не с чем. */
.stats span:first-child b{ color:var(--done); }

.hint{
  font-size:10px; line-height:1.5; color:var(--muted);
  text-align:center; letter-spacing:.03em; min-height:30px;
}

/* ---------------- Предупреждение ---------------- */
.warning{
  position:fixed; left:0; right:0; bottom:0; z-index:var(--z-warning);
  background:var(--break); color:var(--on-bright);
  border-top:none;
  padding:14px 16px 16px;
  display:none; flex-direction:column; gap:12px;
}
.warning.show{ display:flex; }
.warning-text{
  font-size:12px; font-weight:700; letter-spacing:.08em;
  text-align:center;
}
/* Предупреждение — уже оранжевое: это тот же сигнал, что и перерыв,
   только раньше. Отдельного цвета ему не нужно. */
.warning-text b{
  color:var(--on-bright); font-size:22px;
  font-variant-numeric:tabular-nums;
}
.warning-actions{ display:flex; gap:8px; }
.warning-actions .btn{
  height:40px; font-size:11px;
  border-color:var(--on-bright); color:var(--on-bright);
}
.warning-actions .btn:hover{ background:var(--on-bright); color:var(--break); }
.warning-actions .btn.primary{
  background:var(--on-bright); border-color:var(--on-bright); color:var(--break);
}
.warning-actions .btn.primary:hover{ background:#1E1E1E; border-color:#1E1E1E; }

/* =====================================================================
   ПЕРЕРЫВ — сигнальное поле
   Оранжевый приглушён по краям: мгновенная вспышка чистым #E66000
   во весь экран в тёмной комнате физически бьёт по глазам.
   ===================================================================== */
.overlay{
  position:fixed; inset:0; z-index:var(--z-overlay);
  background:var(--bg);
  display:none; overflow:hidden;
  padding:clamp(8px,2vw,24px);
}
.overlay.show{ display:block; }

.overlay-frame{
  height:100%; min-height:0;
  border:2px solid var(--line);
  padding:clamp(16px,2.5vw,32px);
  display:grid; grid-template-rows:auto minmax(0,1fr) auto; gap:20px;
  max-width:1180px; margin:0 auto;
}

.ov-head{
  display:flex; align-items:center; justify-content:space-between;
  gap:16px; padding-bottom:14px;
  border-bottom:2px solid var(--line);
}
.ov-mark{
  font-size:11px; font-weight:700; letter-spacing:.16em;
  background:var(--break); color:var(--on-bright); padding:5px 12px;
}
.ov-clock{
  font-size:clamp(34px,5vw,52px); font-weight:700; line-height:1;
  font-variant-numeric:tabular-nums lining-nums;
}

.ov-main{
  min-height:0; min-width:0;
  display:grid; grid-template-columns:minmax(160px,30%) minmax(0,1fr); gap:36px;
  align-items:center; padding:8px 0;
}

/* Число повторов, набранное точками — подпись направления */
.count{ display:flex; flex-direction:column; gap:16px; width:100%; }
.count:empty{ display:none; }
.count .dm{
  display:block;
  width:100%; height:clamp(100px,20vh,200px);
  fill:var(--break);
}
.count .u{
  font-size:11px; font-weight:700; letter-spacing:.16em;
  color:var(--line);
}

.ov-body{ display:flex; flex-direction:column; gap:12px; max-width:680px; width:100%; height:100%; min-height:0; overflow-y:auto; scrollbar-gutter:stable; padding:8px 12px 8px 0; }
.exercise-zone{
  font-size:10px; font-weight:700; letter-spacing:.16em;
  color:var(--muted);
}
.exercise-name{
  font-size:clamp(22px,2.5vw,30px); font-weight:700;
  letter-spacing:.02em; text-transform:uppercase; line-height:1.15;
}
.exercise-detail{
  font-size:12px; line-height:1.65; white-space:pre-line;
  max-width:60ch; color:var(--line);
}
.exercise-tip{
  font-size:11px; line-height:1.5; color:var(--muted);
  border-top:1px solid var(--rule); padding-top:12px; margin-top:4px;
  max-width:60ch;
}

.ov-foot{
  display:flex; flex-direction:column; gap:14px;
  padding-top:16px; border-top:2px solid var(--line);
}
.ov-meta{
  display:flex; gap:20px; flex-wrap:wrap;
  font-size:10px; font-weight:700; letter-spacing:.12em;
  color:var(--muted); text-transform:uppercase;
}
.overlay-actions{ display:flex; gap:8px; flex-wrap:wrap; }
.overlay-btn{
  height:46px; padding:0 30px;
  border:2px solid var(--line); background:transparent; color:var(--line);
  font-size:13px; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
}
.overlay-btn:hover{ background:var(--line); color:var(--bg); }
.overlay-btn:disabled{ opacity:.4; cursor:default; background:transparent; color:var(--muted); }
.overlay-btn.quiet{ border-color:var(--rule); color:var(--muted); }
.overlay-btn.done{
  background:var(--break); border-color:var(--break); color:var(--on-bright);
}
.overlay-btn.done:hover{ background:#FF7519; border-color:#FF7519; color:var(--on-bright); }
.overlay-esc{
  font-size:9px; font-weight:700; letter-spacing:.14em; color:var(--muted);
}

/* Никаких анимаций — переключение мгновенное, как срабатывание реле */
@media (prefers-contrast: more){
  :root{ --muted:#B5B5B5; --rule:#6A6A6A; --dim:#404040; }
}
.ov-timer{ display:flex; align-items:center; gap:14px; }
.ov-timer > span:first-child{ font-size:10px; color:var(--muted); letter-spacing:.1em; }
.ov-readout{ min-width:0; display:flex; flex-direction:column; gap:20px; }
#stepStatus{ font-size:15px; line-height:1.5; min-height:4.5em; color:var(--muted); }
.count-finished{ height:clamp(100px,20vh,200px); font-size:90px; line-height:1; color:var(--done); display:flex; align-items:center; justify-content:center; }
.exercise-space{ font-size:12px; color:var(--muted); }
.exercise-steps{ list-style:none; counter-reset:steps; display:flex; flex-direction:column; gap:10px; }
.exercise-steps li{ counter-increment:steps; padding:12px 14px; border:1px solid var(--rule); border-left:3px solid var(--rule); }
.exercise-steps li.active{ border-left-color:var(--break); background:#16120c; }
.step-heading{ display:flex; gap:10px; align-items:baseline; font-size:15px; line-height:1.4; }
.step-heading::before{ content:counter(steps,decimal-leading-zero); color:var(--break); font-size:12px; }
.step-heading strong{ flex:1; }
.step-heading span{ white-space:nowrap; color:var(--muted); font-size:12px; }
.exercise-steps li p{ font-size:13px; line-height:1.6; color:#c0c0c0; margin-top:7px; }
.credits{ border-top:1px solid var(--rule); display:flex; align-items:center; justify-content:space-between; gap:12px; padding-top:12px; font-size:11px; color:var(--muted); }
.credits > span{ display:flex; flex-direction:column; gap:4px; }
.credits small{ font-size:9px; letter-spacing:.08em; text-transform:uppercase; }
.credits a{ color:var(--muted); text-decoration:none; min-height:36px; display:flex; align-items:center; gap:8px; border-bottom:1px solid transparent; }
.credits a:hover{ color:var(--break); border-bottom-color:var(--break); }
.app-status{ font-size:12px; line-height:1.5; color:var(--muted); overflow-wrap:anywhere; user-select:text; }
@media (max-width:700px){
  .overlay-frame{ padding:16px; gap:14px; }
  .ov-head{ gap:8px; padding-bottom:12px; }
  .ov-mark{ font-size:9px; padding:5px 7px; letter-spacing:.06em; }
  .ov-timer > span:first-child{ display:none; }
  .ov-clock{ font-size:30px; }
  .ov-main{ grid-template-columns:1fr; grid-template-rows:86px minmax(0,1fr); gap:12px; padding:0; }
  .ov-readout{ display:grid; grid-template-columns:84px minmax(0,1fr); grid-template-rows:auto 1fr; gap:4px 14px; height:86px; }
  .count{ grid-column:1; grid-row:1 / 3; gap:4px; }
  .count .dm,.count-finished{ height:60px; font-size:52px; }
  .count .u{ font-size:9px; letter-spacing:.04em; text-align:center; }
  #stepLabel{ grid-column:2; font-size:10px; }
  #stepStatus{ grid-column:2; font-size:12px; min-height:0; }
  .ov-body{ padding-top:0; }
  .exercise-name{ font-size:21px; }
  .ov-foot{ gap:10px; padding-top:12px; }
  .ov-meta{ font-size:9px; gap:6px; letter-spacing:.03em; }
  .overlay-actions{ display:grid; grid-template-columns:1fr 1fr; }
  .overlay-btn{ padding:0 8px; font-size:11px; height:44px; }
  .overlay-btn.quiet{ grid-column:1 / -1; height:32px; border:0; text-transform:none; }
  .overlay-esc{ display:none; }
  .step-heading{ font-size:14px; flex-wrap:wrap; }
}

/* ---------------- Разовое предложение автозапуска ----------------
   Показывается один раз, после первого выполненного перерыва:
   к этому моменту программа уже доказала пользу, и предложение
   выглядит уместно, а не как выпрашивание разрешений на старте. */
.offer{
  border:2px solid var(--break);
  padding:14px 16px 16px;
  display:flex; flex-direction:column; gap:12px;
}
.offer[hidden]{ display:none; }
.offer-text{
  font-size:11.5px; line-height:1.55; letter-spacing:.02em;
}
.offer-actions{ display:flex; gap:8px; }
.offer-actions .btn{ height:38px; font-size:11px; }
