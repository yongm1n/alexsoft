#!/usr/bin/env node

const { chromium } = require('playwright');
const path = require('path');

const baseUrl = process.env.ALEXSOFT_CONCEPT_URL || 'http://127.0.0.1:8074/concept-02/';
const outputDir = process.env.ALEXSOFT_CONCEPT_SHOTS || '/tmp/alexsoft-concept-02';

async function inspect(browser, name, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  await page.evaluate(() => document.querySelectorAll('img').forEach((image) => { image.loading = 'eager'; }));
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete), null, { timeout: 5000 });
  await page.waitForTimeout(350);

  const layout = await page.evaluate(() => ({
    title: document.title,
    language: document.documentElement.lang,
    gsapVersion: window.gsap?.version || null,
    scrollTriggers: window.ScrollTrigger?.getAll().length || 0,
    hasGsapClass: document.documentElement.classList.contains('has-gsap'),
    h1: document.querySelectorAll('h1').length,
    h2: document.querySelectorAll('h2').length,
    projects: document.querySelectorAll('[data-stack-card]').length,
    services: document.querySelectorAll('.service-item').length,
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));

  if (!layout.gsapVersion) errors.push('GSAP did not load');
  if (!layout.hasGsapClass) errors.push('GSAP enhancement class is missing');
  if (layout.scrollTriggers < 1) errors.push('ScrollTrigger did not create any triggers');

  const shots = name === 'desktop'
    ? ['#top', '.intro', '#work', '#services', '#philosophy', '#contact']
    : ['#top', '#work', '#contact'];

  for (const selector of shots) {
    const label = selector.replace(/[.#]/g, '') || 'hero';
    await page.locator(selector).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(280);
    await page.screenshot({ path: path.join(outputDir, `${name}-${label}.png`) });
  }

  if (name === 'mobile') {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-menu-toggle]').click();
    const expanded = await page.locator('[data-menu-toggle]').getAttribute('aria-expanded');
    if (expanded !== 'true') errors.push('mobile menu did not expand');
    await page.keyboard.press('Escape');
  }

  const brokenImages = await page.evaluate(() => Array.from(document.images)
    .filter((image) => !image.complete || image.naturalWidth === 0)
    .map((image) => image.getAttribute('src')));

  console.log(JSON.stringify({ name, layout, brokenImages, errors }, null, 2));
  await page.close();
  return errors.length + brokenImages.length + (layout.horizontalOverflow > 2 ? 1 : 0);
}

async function inspectReducedMotion(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const layout = await page.evaluate(() => ({
    gsapLoaded: Boolean(window.gsap),
    hasGsapClass: document.documentElement.classList.contains('has-gsap'),
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    projectPosition: getComputedStyle(document.querySelector('[data-stack-card]')).position,
    visibleReveals: Array.from(document.querySelectorAll('.reveal')).every((element) => getComputedStyle(element).opacity === '1')
  }));
  if (layout.horizontalOverflow > 2) errors.push(`overflow: ${layout.horizontalOverflow}px`);
  if (!layout.gsapLoaded) errors.push('GSAP asset did not load in reduced-motion mode');
  if (layout.hasGsapClass) errors.push('GSAP enhancement should stay disabled for reduced motion');
  if (layout.projectPosition !== 'relative') errors.push(`project position: ${layout.projectPosition}`);
  if (!layout.visibleReveals) errors.push('reduced motion hides reveal content');
  console.log(JSON.stringify({ name: 'reduced-motion', layout, errors }, null, 2));
  await page.close();
  return errors.length;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist']
  });
  const failures = await inspect(browser, 'desktop', { width: 1512, height: 900 })
    + await inspect(browser, 'mobile', { width: 390, height: 844 })
    + await inspectReducedMotion(browser);
  await browser.close();
  process.exitCode = failures ? 1 : 0;
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
