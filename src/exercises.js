/* Короткие домашние связки. Источники движений и принципы: EXERCISES.md.
   Длительности — ориентир приложения, а не медицинский протокол.
   Все движения стоя, без прыжков, пола и спортивного инвентаря. */
const READ_OVERHEAD = 18;
const TRANSITION_SEC = 4;
const MOVEMENTS = {
  march: {name:'Шаги на месте', zone:'legs', form:'Шагай тихо, невысоко поднимая стопы. Руки двигаются свободно. Держи темп, при котором легко говорить.'},
  sideStep: {name:'Шаг в сторону и обратно', zone:'legs', form:'Сделай небольшой шаг вправо, приставь левую ногу и вернись. Затем начни влево. Не прыгай, колени мягкие.'},
  heels: {name:'Подъёмы на носки', zone:'legs', support:true, form:'Держись кончиками пальцев за стену. Плавно подними пятки и опусти их, не раскачиваясь. Амплитуда комфортная.'},
  toes: {name:'Подъёмы носков', zone:'legs', support:true, form:'Придерживайся за стену, оставь пятки на полу. Невысоко поднимай и опускай носки обеих стоп, сохраняя равновесие.'},
  heelTap: {name:'Касания пяткой впереди', zone:'legs', form:'По очереди выставляй правую и левую пятку на пол чуть впереди себя и возвращай стопу. Переноси вес спокойно, без широких шагов.'},
  legSide: {name:'Отведение ноги в сторону', zone:'hips', support:true, form:'Придерживайся за стену. Чередуй небольшие отведения правой и левой ноги в сторону. Таз ровный, корпус не наклоняй.'},
  legBack: {name:'Отведение ноги назад', zone:'glutes', support:true, form:'Рука на стене. По очереди отводи прямую ногу немного назад и возвращай. Не прогибай поясницу и не делай махов.'},
  knee: {name:'Невысокие подъёмы коленей', zone:'hips', support:true, form:'С опорой на стену по очереди невысоко поднимай колени и опускай стопы. Не округляй спину и не подтягивай колено руками.'},
  curl: {name:'Сгибание ног стоя', zone:'legs', support:true, form:'Придерживайся за стену. По очереди сгибай колени, направляя пятку назад. Колени рядом, таз не уходит вперёд.'},
  weight: {name:'Перенос веса', zone:'legs', form:'Стопы чуть шире таза. Плавно переноси вес с одной ноги на другую, оставляя обе стопы на полу. Не приседай глубоко.'},
  shoulders: {name:'Круги плечами назад', zone:'shoulders', form:'Плавно подними плечи, отведи назад и опусти. Руки свободные, голова смотрит вперёд. Делай небольшие медленные круги.'},
  reach: {name:'Потянуться вперёд и раскрыться', zone:'back', form:'Вытяни руки перед собой на уровне груди, затем согни локти и мягко сведи лопатки. Не поднимай плечи и не прогибай поясницу.'},
  wallSlide: {name:'Скольжение руками у стены', zone:'shoulders', support:true, form:'Встань спиной к стене, локти согнуты. Скользи руками вверх и вниз только в удобном диапазоне. Не пытайся прижать руки силой.'},
  turn: {name:'Повороты грудной клетки', zone:'back', form:'Стопы устойчиво на полу, руки скрещены на груди. Плавно поворачивай грудную клетку вправо и влево, таз оставляй почти неподвижным.'},
  sideBend: {name:'Небольшие наклоны в стороны', zone:'back', form:'Стоя ровно, скользи ладонью вниз по боковой поверхности бедра. Вернись и повтори в другую сторону. Не наклоняйся вперёд.'},
  press: {name:'Отжимания от стены', zone:'chest', support:true, form:'Ладони на стене на уровне груди. Плавно согни руки и оттолкнись обратно. Стой ближе к стене, чтобы нагрузка оставалась лёгкой.'}
};

// Разные задачи, а не десятки вариаций приседания. Активное движение
// соединено с подвижностью или лёгкой работой другой части тела.
const ROUTINES = [
  {name:'Шаги + свободные плечи', zone:'shoulders', moves:['march','shoulders']},
  {name:'Стопы + раскрытие груди', zone:'back', moves:['heels','reach']},
  {name:'Боковой шаг + повороты', zone:'back', moves:['sideStep','turn']},
  {name:'Пятки + руки у стены', zone:'shoulders', moves:['heelTap','wallSlide']},
  {name:'Бёдра + мягкие наклоны', zone:'hips', moves:['legSide','sideBend']},
  {name:'Шаги + раскрытие груди', zone:'back', moves:['march','reach']},
  {name:'Ноги назад + плечи', zone:'glutes', moves:['legBack','shoulders']},
  {name:'Колени + повороты корпуса', zone:'hips', moves:['knee','turn']},
  {name:'Пятки назад + раскрытие груди', zone:'legs', moves:['curl','reach']},
  {name:'Перенос веса + руки у стены', zone:'shoulders', moves:['weight','wallSlide']},
  {name:'Носки вверх + плечи назад', zone:'legs', moves:['toes','shoulders']},
  {name:'Шаги + отжимания у стены', zone:'chest', moves:['march','press']},
  {name:'Боковой шаг + наклоны', zone:'back', moves:['sideStep','sideBend']},
  {name:'Стопы + повороты корпуса', zone:'legs', moves:['heels','turn']},
  {name:'Бёдра + раскрытие груди', zone:'hips', moves:['legSide','reach']},
  {name:'Пятки вперёд + плечи назад', zone:'shoulders', moves:['heelTap','shoulders']},
  {name:'Ноги назад + отжимания', zone:'glutes', moves:['legBack','press']},
  {name:'Перенос веса + раскрытие груди', zone:'back', moves:['weight','reach']},
  {name:'Размяться целиком', zone:'full', moves:['march','reach','heels']},
  {name:'Ноги, спина, плечи', zone:'full', moves:['sideStep','turn','shoulders']},
  {name:'У стены: снизу вверх', zone:'full', moves:['heels','press','wallSlide']},
  {name:'После долгого сидения', zone:'full', moves:['legBack','reach','heelTap']},
  {name:'Смена позы', zone:'full', moves:['weight','sideBend','knee']},
  {name:'Спокойная активность', zone:'full', moves:['curl','shoulders','sideStep']}
];
const BONUS_TIPS = [
  'В свободное время переведи взгляд на дальний предмет, оторвавшись от экрана.',
  'Дыши свободно. Не нужно подстраивать дыхание под таймер.',
  'Когда закончишь связку, оставшееся время можно провести вдали от экрана.'
];
function workBudget(restMin){ return Math.max(0, Math.floor(restMin * 60) - READ_OVERHEAD); }
function tierForRest(restMin){ return restMin <= 2 ? 'short' : restMin <= 6 ? 'medium' : 'long'; }
function poolFor(restMin){
  return ROUTINES.filter(r => r.moves.length * 15 + (r.moves.length - 1) * TRANSITION_SEC <= workBudget(restMin))
    .map(item => ({item}));
}
function buildTask(routine, restMin){
  const budget = Math.min(180, workBudget(restMin));
  const count = routine.moves.length;
  const duration = Math.min(35, Math.floor((budget - (count - 1) * TRANSITION_SEC) / count));
  if(duration < 15) return null;
  const roundSec = count * duration + (count - 1) * TRANSITION_SEC;
  const rounds = Math.min(2, Math.floor((budget + 15) / (roundSec + 15)));
  const steps = [];
  for(let round = 0; round < rounds; round++) {
    routine.moves.forEach((id, index) => {
      steps.push({...MOVEMENTS[id], id, duration, round:round + 1,
        restBefore:steps.length === 0 ? 0 : index === 0 ? 15 : TRANSITION_SEC});
    });
  }
  const workSec = steps.reduce((sum,s) => sum + s.duration, 0);
  const totalSec = steps.reduce((sum,s) => sum + s.duration + s.restBefore, 0);
  return {name:routine.name, title:routine.name, kind:'sequence', zone:routine.zone,
    detail:'Двигайся спокойно, без рывков и задержки дыхания. При боли остановись.',
    steps, rounds, workSec, totalSec, preparationSec:READ_OVERHEAD,
    support:steps.some(s => s.support)};
}
function shuffle(arr, rnd){
  const result = arr.slice();
  for(let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [result[i],result[j]] = [result[j],result[i]];
  }
  return result;
}
function createPicker(opts = {}){
  const rnd = opts.random || Math.random;
  const validNames = new Set(ROUTINES.map(r => r.name));
  let recent = (opts.recent || []).filter(n => validNames.has(n)).slice(-8);
  let lastZone = null;
  const decks = new Map();
  function pick(restMin){
    const pool = poolFor(restMin).map(p => p.item);
    if(!pool.length) return null;
    const key = pool.map(r => r.name).join('|');
    let deck = decks.get(key);
    if(!deck || !deck.length) {
      const shuffled = shuffle(pool, rnd);
      deck = shuffled.filter(r => !recent.includes(r.name)).concat(shuffled.filter(r => recent.includes(r.name)));
      decks.set(key, deck);
    }
    // History wins over zone alternation, including when duration changes.
    let index = deck.findIndex(r => !recent.includes(r.name) && r.zone !== lastZone);
    if(index < 0) index = deck.findIndex(r => !recent.includes(r.name));
    if(index < 0) index = 0;
    const routine = deck.splice(index,1)[0];
    lastZone = routine.zone;
    recent.push(routine.name); recent = recent.slice(-8);
    return {...buildTask(routine, restMin), tier:tierForRest(restMin), tip:BONUS_TIPS[Math.floor(rnd()*BONUS_TIPS.length)]};
  }
  pick.recent = () => recent.slice();
  return pick;
}
if(typeof module !== 'undefined' && module.exports) {
  module.exports = {MOVEMENTS, ROUTINES, BONUS_TIPS, READ_OVERHEAD, TRANSITION_SEC,
    workBudget, tierForRest, poolFor, buildTask, createPicker, shuffle};
}
