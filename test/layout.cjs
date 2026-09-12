// Real Chromium layout: jsdom cannot detect a frame pushed below the viewport.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch(process.env.BROWSER_CHANNEL
    ? { channel: process.env.BROWSER_CHANNEL } : {});
  try {
    const page = await browser.newPage();
    await page.clock.install({time:new Date('2026-09-12T12:00:00Z')});
    await page.clock.pauseAt(new Date('2026-09-12T12:00:01Z'));
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../src/index.html')).href);
    await page.locator('#startBtn').click();
    await page.locator('#skipBtn').click();
    for (const [width, height] of [[1440,1080], [1366,768], [800,600], [400,760], [320,568]]) {
      await page.setViewportSize({width, height});
      const boxes = [];
      for (const reps of [5, 16, 30]) {
        await page.evaluate(reps => {
          document.querySelector('#exerciseCount').innerHTML = window.countMarkupTest({kind:'reps', reps});
        }, reps);
        const geometry = await page.evaluate(() => {
          const rect = selector => {
            const r = document.querySelector(selector).getBoundingClientRect();
            return { x:r.x, y:r.y, width:r.width, height:r.height, bottom:r.bottom };
          };
          return {frame:rect('.overlay-frame'), footer:rect('.ov-foot'), body:rect('.ov-body')};
        });
        boxes.push(geometry);
        assert.ok(geometry.frame.bottom <= height, `${width}×${height}, ${reps}: frame bottom ${geometry.frame.bottom} > viewport ${height}`);
        assert.ok(geometry.footer.bottom <= height, 'break actions must remain visible');
      }
      assert.deepEqual(boxes[0], boxes[1], `${width}×${height}: geometry changes with digit count`);
      assert.deepEqual(boxes[1], boxes[2]);
      const frame = await page.locator('.overlay-frame').boundingBox();
      const footer = await page.locator('.ov-foot').boundingBox();
      for(let i = 0; i < 24; i++) {
        await page.locator('#otherBtn').click();
        assert.deepEqual(await page.locator('.overlay-frame').boundingBox(), frame);
        assert.deepEqual(await page.locator('.ov-foot').boundingBox(), footer);
        assert.ok(await page.locator('.ov-body').evaluate(el => el.scrollWidth <= el.clientWidth), 'no horizontal clipping');
      }
    }
    await page.locator('#doneBtn').focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'dismissBreakBtn');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'doneBtn');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#overlay').isVisible(), false);
    assert.equal(await page.locator('#supportLink').getAttribute('href'), 'https://boosty.to/yagojeez/donate');
    assert.ok(await page.locator('.credits').innerText().then(s => s.includes('Глеб Ягодкин')));
    fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});
    await page.setViewportSize({width:400,height:920});
    await page.screenshot({path:path.resolve(__dirname,'../artifacts/settings.png'),fullPage:true});
    await page.locator('#skipBtn').click();
    await page.setViewportSize({width:1366,height:768});
    await page.screenshot({path:path.resolve(__dirname,'../artifacts/break-desktop.png')});
    await page.setViewportSize({width:400,height:760});
    const compactFrame = await page.locator('.overlay-frame').boundingBox();
    await page.clock.runFor(18000);
    assert.equal(await page.locator('#exerciseSteps li[aria-current="step"]').count(),1);
    await page.clock.runFor(39000);
    assert.deepEqual(await page.locator('.overlay-frame').boundingBox(),compactFrame);
    const activeInView = await page.locator('#exerciseSteps li[aria-current="step"]').evaluate(el => {
      const r = el.getBoundingClientRect(), parent = el.closest('.ov-body').getBoundingClientRect();
      return r.top >= parent.top - 1 && r.bottom <= parent.bottom + 1;
    });
    assert.ok(activeInView, 'current instruction scrolls into view without moving the frame');
    await page.screenshot({path:path.resolve(__dirname,'../artifacts/break-compact.png')});
    assert.deepEqual(errors, []);
    console.log('PASS: fixed geometry across digit counts, 120 replacements, five sizes; keyboard, credits, no JS errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
