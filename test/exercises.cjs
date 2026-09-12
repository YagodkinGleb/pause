const assert = require('node:assert/strict');
const lib = require('../src/exercises');
assert.equal(new Set(lib.ROUTINES.map(r => r.name)).size, lib.ROUTINES.length);
assert.equal(new Set(lib.ROUTINES.map(r => r.moves.slice().sort().join('|'))).size, lib.ROUTINES.length);
assert.ok(lib.poolFor(1).length >= 16);
for (let seconds = 0; seconds <= 3600; seconds++) {
  for (const {item} of lib.poolFor(seconds / 60)) {
    const task = lib.buildTask(item, seconds / 60);
    assert.ok(task.steps.length >= 2);
    assert.ok(task.totalSec + task.preparationSec <= seconds, `${item.name} exceeds ${seconds}s`);
    assert.ok(task.totalSec <= 180, 'long breaks should not turn into long workouts');
    assert.equal(task.totalSec, task.steps.reduce((sum,s) => sum + s.duration + s.restBefore,0));
    assert.ok(task.steps.every(s => s.duration >= 15 && s.duration <= 35 && s.form.length > 40));
  }
}
let seed = 42;
const random = () => ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 4294967296);
const pick = lib.createPicker({random});
const first = Array.from({length:16}, () => pick(1).name);
assert.equal(new Set(first).size, first.length);
const restart = lib.createPicker({random, recent:pick.recent()});
for (let i=0;i<8;i++) assert.ok(!first.slice(-8).includes(restart(1).name));
assert.equal(pick(0.5), null);
for (const routine of lib.ROUTINES) assert.ok(routine.moves.every(id => lib.MOVEMENTS[id]));
console.log('PASS: all routines fit every duration 0–3600s, transitions included; rotation survives restart');
