#!/usr/bin/env node
/**
 * Shareland Docs — Screenshot Updater
 * Takes screenshots of key exchange screens and saves them to /images/screenshots/
 * Run manually or via cron after deploys.
 * 
 * Usage: node scripts/update-screenshots.js
 * Requires: playwright (npm install playwright)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://www.share.land/?device_id=internal-tester';
const OUTPUT_DIR = path.join(__dirname, '../images/screenshots');

const SCREENS = [
  {
    name: 'exchange-home',
    url: BASE_URL,
    description: 'Exchange home / market list',
    waitFor: '.market-card, [data-testid="market-list"]',
    clip: null // full page
  },
  {
    name: 'market-detail',
    url: BASE_URL,
    description: 'Market detail view',
    action: async (page) => {
      // Click first market card
      await page.click('.market-card:first-child, [data-testid="market-card"]:first-child');
      await page.waitForTimeout(1500);
    },
    clip: null
  },
  {
    name: 'portfolio',
    url: `${BASE_URL}#portfolio`,
    description: 'Portfolio dashboard',
    clip: null
  }
];

async function captureScreenshots() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2 // retina
  });

  console.log(`Capturing ${SCREENS.length} screenshots...`);

  for (const screen of SCREENS) {
    try {
      const page = await context.newPage();
      await page.goto(screen.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      if (screen.waitFor) {
        await page.waitForSelector(screen.waitFor, { timeout: 10000 }).catch(() => {
          console.warn(`  Selector not found for ${screen.name}, continuing anyway`);
        });
      }

      if (screen.action) {
        await screen.action(page);
      }

      const outPath = path.join(OUTPUT_DIR, `${screen.name}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`  ✅ ${screen.name} → ${outPath}`);
      await page.close();
    } catch (err) {
      console.error(`  ❌ ${screen.name}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('\nDone. Commit the /images/screenshots/ directory to update docs.');
}

captureScreenshots().catch(console.error);
