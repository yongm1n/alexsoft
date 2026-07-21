#!/usr/bin/env node

const { chromium } = require('playwright');
const path = require('path');

const baseUrl = process.env.ALEXSOFT_URL || 'http://127.0.0.1:8074/';
const outputDir = process.env.ALEXSOFT_SHOTS || '/tmp/alexsoft-shots';

async function inspectViewport(browser, name, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  await page.evaluate(() => document.querySelectorAll('img').forEach((image) => { image.loading = 'eager'; }));
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete), null, { timeout: 4000 });
  await page.waitForTimeout(500);

  const layout = await page.evaluate(() => ({
    title: document.title,
    language: document.documentElement.lang,
    h1: document.querySelectorAll('h1').length,
    h2: document.querySelectorAll('h2').length,
    nav: document.querySelectorAll('nav a').length,
    cards: document.querySelectorAll('.project-card').length,
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));

  const shots = [{ label: 'hero', selector: '#top', progress: 0 }];
  if (name === 'desktop') {
    shots.push(
      { label: 'hero-shaped', selector: '#top', progress: .52 },
      { label: 'manifesto', selector: '#studio', progress: .78 },
      { label: 'approach', selector: '#approach', progress: .42 },
      { label: 'work-start', selector: '#work', progress: .03 },
      { label: 'work-late', selector: '#work', progress: .76 }
    );
  } else {
    shots.push(
      { label: 'manifesto', selector: '#studio', progress: .78 },
      { label: 'work', selector: '#work', progress: 0 }
    );
  }

  for (const shot of shots) {
    await page.evaluate(({ selector, progress }) => {
      const section = document.querySelector(selector);
      const start = section.getBoundingClientRect().top + window.scrollY;
      const distance = Math.max(0, section.offsetHeight - window.innerHeight);
      window.scrollTo(0, start + distance * progress);
    }, shot);
    await page.waitForTimeout(260);
    await page.screenshot({ path: path.join(outputDir, `${name}-${shot.label}.png`) });
  }

  await page.locator('.contact').scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(outputDir, `${name}-contact.png`) });

  if (name === 'mobile') {
    await page.locator('[data-menu-toggle]').click();
    const expanded = await page.locator('[data-menu-toggle]').getAttribute('aria-expanded');
    if (expanded !== 'true') errors.push('mobile menu did not expand');
    await page.keyboard.press('Escape');
  }

  const imageState = await page.evaluate(() => Array.from(document.images).map((image) => ({
    src: image.getAttribute('src'),
    complete: image.complete,
    width: image.naturalWidth
  })));
  const brokenImages = imageState.filter((image) => !image.complete || image.width === 0);

  console.log(JSON.stringify({ name, layout, brokenImages, errors }, null, 2));
  await page.close();
  return errors.length + brokenImages.length;
}

async function inspectReducedMotion(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const layout = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    visibleCraftSteps: Array.from(document.querySelectorAll('.craft-step')).filter((step) => getComputedStyle(step).opacity === '1').length,
    workCards: document.querySelectorAll('.project-card').length,
    workTrackDisplay: getComputedStyle(document.querySelector('.work-track')).display
  }));
  if (layout.horizontalOverflow > 2) errors.push(`reduced motion overflow: ${layout.horizontalOverflow}px`);
  if (layout.visibleCraftSteps !== 4) errors.push(`reduced motion hides craft steps: ${layout.visibleCraftSteps}/4`);
  await page.locator('.project-card:last-child').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(outputDir, 'reduced-motion-work.png') });
  console.log(JSON.stringify({ name: 'reduced-motion', layout, errors }, null, 2));
  await page.close();
  return errors.length;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist']
  });
  const failures = await inspectViewport(browser, 'desktop', { width: 1512, height: 900 })
    + await inspectViewport(browser, 'mobile', { width: 390, height: 844 })
    + await inspectReducedMotion(browser);
  await browser.close();
  process.exitCode = failures ? 1 : 0;
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
