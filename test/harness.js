/* Тестовый стенд: гоняем реальный app.js в jsdom с управляемым временем. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SRC = path.join(__dirname, '..', 'src');

function boot(opts){
  opts = opts || {};
  const html = fs.readFileSync(path.join(SRC,'index.html'),'utf8')
    .replace(/<script src="[^"]+"><\/script>/g,'');

  const dom = new JSDOM(html, {
    pretendToBeVisual:false,
    url:'http://localhost/',
    runScripts:'outside-only'
  });
  const w = dom.window;

  // ---- управляемое время ----
  let now = opts.startTime || 1700000000000;
  const timers = [];
  let seq = 0;
  const RealDate = w.Date;
  class MockDate extends RealDate {
    constructor(...args){
      if(args.length === 0) super(now); else super(...args);
    }
    static now(){ return now; }
  }
  w.Date = MockDate;

  w.setInterval = (fn, ms) => { const id = ++seq; timers.push({id, fn, ms, next: now+ms, repeat:true}); return id; };
  w.setTimeout  = (fn, ms) => { const id = ++seq; timers.push({id, fn, ms, next: now+ms, repeat:false}); return id; };
  w.clearInterval = id => { const i = timers.findIndex(t=>t.id===id); if(i>=0) timers.splice(i,1); };
  w.clearTimeout  = w.clearInterval;

  // продвинуть время, исполняя таймеры
  function advance(ms){
    const target = now + ms;
    let guard = 0;
    while(true){
      const due = timers.filter(t=>t.next<=target).sort((a,b)=>a.next-b.next)[0];
      if(!due || ++guard > 200000) break;
      now = due.next;
      if(due.repeat) due.next = now + due.ms;
      else timers.splice(timers.indexOf(due),1);
      due.fn();
    }
    now = target;
  }
  // «уснуть»: время прыгает вперёд, таймеры не выполнялись
  function sleep(ms){
    now += ms;
    timers.forEach(t => { if(t.next <= now) t.next = now; });
  }

  // ---- заглушки браузерных API ----
  const invoked = [];
  let autostart = opts.autostart || false;

  // Синхронный аналог промиса: весь прогон тестов — одна синхронная
  // задача, и настоящие микрозадачи разрешились бы только после неё.
  const syncPromise = v => ({
    then(fn){ const r = fn ? fn(v) : v; return syncPromise(r); },
    catch(){ return syncPromise(v); }
  });

  w.__TAURI__ = { core: { invoke: (cmd,args)=>{
    invoked.push({cmd,args});
    if(opts.invokeResult && Object.hasOwn(opts.invokeResult,cmd)) return syncPromise(opts.invokeResult[cmd]);
    if(cmd === 'launched_at_login') return syncPromise(!!opts.launchedAtLogin);
    if(cmd === 'get_autostart') return syncPromise(autostart);
    if(cmd === 'set_autostart'){ autostart = !!args.enabled; return syncPromise(autostart); }
    return syncPromise(undefined);
  } } };

  const sounds = [];
  class FakeGain { constructor(){ this.gain = { setValueAtTime(){}, exponentialRampToValueAtTime(){} }; } connect(){} }
  class FakeOsc {
    constructor(){ this.frequency = { setValueAtTime:(v)=>{ this._f=v; }, value:0 }; }
    connect(){} start(){ sounds.push(this._f); } stop(){}
  }
  w.AudioContext = class { constructor(){ this.state='running'; this.currentTime=0; this.destination={}; }
    resume(){} createOscillator(){ return new FakeOsc(); } createGain(){ return new FakeGain(); } };

  const store = {};
  Object.defineProperty(w, 'localStorage', { value:{
    getItem:k=>k in store?store[k]:null,
    setItem:(k,v)=>{store[k]=String(v);},
    removeItem:k=>{delete store[k];},
    clear:()=>{Object.keys(store).forEach(k=>delete store[k]);}
  }, configurable:true });
  if(opts.seedStore) Object.assign(store, opts.seedStore);

  // ---- загрузка исходников в контекст окна ----
  const ex = fs.readFileSync(path.join(SRC,'exercises.js'),'utf8');
  const app = fs.readFileSync(path.join(SRC,'app.js'),'utf8');
  w.eval(ex);
  w.eval(app);

  const $ = id => w.document.getElementById(id);
  return {
    w, $, advance, sleep, invoked, sounds, store,
    now: () => now,
    phase: () => $('phaseLabel').textContent,
    time: () => $('timeDisplay').textContent,
    overlayOpen: () => $('overlay').classList.contains('show'),
    warningOpen: () => $('warning').classList.contains('show'),
    click: id => $(id).onclick && $(id).onclick(),
    key: k => {
      const ev = new w.KeyboardEvent('keydown',{key:k, bubbles:true});
      w.document.dispatchEvent(ev);
    }
  };
}

module.exports = { boot };
