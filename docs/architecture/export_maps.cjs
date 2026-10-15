// Export the SVG diagrams with browser-shaped Thai text.
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--disable-gpu'] });
  try {
    for (const [name, width, height] of [
      ['everyvan-system-map', 2000, 1580],
      ['everyvan-feature-map', 2200, 2250],
    ]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1.5 });
      const svgPath = path.join(__dirname, name + '.svg');
      await page.setContent('<html><body style="margin:0">' + fs.readFileSync(svgPath, 'utf8') + '</body></html>');
      await page.evaluate(() => document.fonts.ready);
      const errors = await page.evaluate(() => {
        const root = document.querySelector('svg');
        const w = root.viewBox.baseVal.width;
        const h = root.viewBox.baseVal.height;
        return [...document.querySelectorAll('text')].flatMap(el => {
          const b = el.getBBox();
          const x = Number(el.getAttribute('x'));
          const y = Number(el.getAttribute('y'));
          const cellEnd = w === 2200 && y > 463 && y < 2025
            ? ({100: 645, 670: 1080, 1200: 1570, 1690: 2100})[x]
            : undefined;
          return b.x < 0 || b.y < 0 || b.x + b.width > w || b.y + b.height > h || (cellEnd && b.x + b.width > cellEnd)
            ? [el.textContent] : [];
        });
      });
      if (errors.length) throw new Error('Clipped labels: ' + JSON.stringify(errors));
      await page.screenshot({ path: path.join(__dirname, name + '.png'), timeout: 45000 });
      console.log(name + ': PNG exported; all labels inside canvas');
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
