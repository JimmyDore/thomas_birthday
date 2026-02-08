import { chromium } from 'playwright';
import { setTimeout as sleep } from 'timers/promises';

const SCREENSHOTS_DIR = '/Users/jimmydore/Projets/thomas_birthday/screenshots';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro size
  });
  const page = await context.newPage();

  // Navigate to game
  await page.goto('http://localhost:8765');
  await sleep(1000);

  // Screenshot: Start screen
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-start-screen.png` });
  console.log('Screenshot: Start screen');

  // Click play button (center of screen, 60% height)
  const { width, height } = page.viewportSize();
  await page.mouse.click(width / 2, height * 0.6);
  await sleep(500);

  // Screenshot: Act 1 beginning
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-act1-start.png` });
  console.log('Screenshot: Act 1 start');

  // Play Act 1: simulate swipes across the screen to slash watches
  // We'll do aggressive horizontal swipes to hit as many watches as possible
  console.log('Playing Act 1 (60 seconds)...');

  const act1Start = Date.now();
  let screenshotCount = 3;

  while (true) {
    const elapsed = (Date.now() - act1Start) / 1000;

    // Check if we've moved to transition state
    const state = await page.evaluate(() => window.gameState);
    if (state !== 'act1') break;

    // Do swipes across different heights to catch watches
    // Watches launch from bottom and go up, so swipe at various heights
    for (let yFrac of [0.3, 0.4, 0.5, 0.6, 0.7]) {
      const y = height * yFrac;
      // Left-to-right swipe
      await page.mouse.move(30, y);
      await page.mouse.down();
      for (let x = 30; x < width - 30; x += 20) {
        await page.mouse.move(x, y + (Math.random() - 0.5) * 20);
      }
      await page.mouse.up();
      await sleep(50);

      // Right-to-left swipe
      await page.mouse.move(width - 30, y + 15);
      await page.mouse.down();
      for (let x = width - 30; x > 30; x -= 20) {
        await page.mouse.move(x, y + 15 + (Math.random() - 0.5) * 20);
      }
      await page.mouse.up();
      await sleep(50);
    }

    // Take periodic screenshots during Act 1
    if (elapsed > 10 && screenshotCount === 3) {
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-act1-mid.png` });
      console.log('Screenshot: Act 1 mid-game');
      screenshotCount++;
    }
    if (elapsed > 50 && screenshotCount === 4) {
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-act1-late.png` });
      console.log('Screenshot: Act 1 late');
      screenshotCount++;
    }

    await sleep(100);
  }

  // Now on transition screen - capture inventory data BEFORE screenshot
  await sleep(500);

  const act1Data = await page.evaluate(() => {
    return {
      inventory: inventory.map((item, i) => ({
        index: i,
        brand: item.brand,
        displayPrice: item.price,
        cost: item.cost,
        isFake: item.isFake,
        isGolden: item.isGolden,
      })),
      act1Spending: act1Spending,
      score: score,
    };
  });

  console.log('\n=== ACT 1 RESULTS ===');
  console.log(`Total items in inventory: ${act1Data.inventory.length}`);
  console.log(`Act 1 Spending (tracked): ${act1Data.act1Spending} EUR`);
  console.log(`Score after Act 1: ${act1Data.score}`);
  console.log('\nInventory details:');
  for (const item of act1Data.inventory) {
    const type = item.isGolden ? 'GOLDEN' : item.isFake ? 'FAKE' : 'REAL';
    console.log(`  [${item.index}] ${item.brand} | Display Price: ${item.displayPrice} EUR | Internal Cost: ${item.cost} EUR | Type: ${type}`);
  }

  // Check the mismatch
  const displayPriceSum = act1Data.inventory.reduce((s, i) => s + i.displayPrice, 0);
  console.log(`\nSum of display prices: ${displayPriceSum} EUR`);
  console.log(`act1Spending total: ${act1Data.act1Spending} EUR`);
  console.log(`MISMATCH: Display prices (${displayPriceSum}) vs tracked spending (${act1Data.act1Spending})`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-transition.png` });
  console.log('\nScreenshot: Transition screen');

  // Click "Vendre!" button (center, 85% height)
  await page.mouse.click(width / 2, height * 0.85);
  await sleep(500);

  // Screenshot: Act 2 beginning
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-act2-start.png` });
  console.log('Screenshot: Act 2 start');

  // Play Act 2: slash buyer offers
  console.log('\nPlaying Act 2 (45 seconds)...');
  const act2Start = Date.now();
  let act2Screenshots = 7;

  while (true) {
    const elapsed = (Date.now() - act2Start) / 1000;
    const state = await page.evaluate(() => window.gameState);
    if (state !== 'act2') break;

    // Swipe to accept offers
    for (let yFrac of [0.3, 0.4, 0.5, 0.6, 0.7]) {
      const y = height * yFrac;
      await page.mouse.move(30, y);
      await page.mouse.down();
      for (let x = 30; x < width - 30; x += 25) {
        await page.mouse.move(x, y + (Math.random() - 0.5) * 15);
      }
      await page.mouse.up();
      await sleep(50);
    }

    // Take a screenshot early in Act 2 to see buyer cards with prices
    if (elapsed > 3 && act2Screenshots === 7) {
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-act2-offers.png` });
      console.log('Screenshot: Act 2 buyer offers');

      // Also log what's on screen
      const offerData = await page.evaluate(() => {
        return watches.filter(w => w.isBuyerOffer).map(w => ({
          brand: w.brand,
          offerPrice: w.offerPrice,
          cost: w.cost,
          displayPrice: w.price,
          isFake: w.isFake,
          isGolden: w.isGolden,
          targetIndex: w.targetIndex,
        }));
      });
      console.log('Current buyer offers on screen:');
      for (const o of offerData) {
        console.log(`  ${o.brand} | Offer: ${o.offerPrice} EUR | Card shows "Payé: ${o.cost} EUR" | Original display price was: ${o.displayPrice} EUR`);
      }
      act2Screenshots++;
    }

    if (elapsed > 20 && act2Screenshots === 8) {
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/08-act2-mid.png` });
      console.log('Screenshot: Act 2 mid');
      act2Screenshots++;
    }

    await sleep(100);
  }

  // Game over screen
  await sleep(500);

  const finalData = await page.evaluate(() => {
    return {
      act1Spending,
      act2Revenue,
      score,
      inventory: inventory.map((item, i) => ({
        index: i,
        brand: item.brand,
        displayPrice: item.price,
        cost: item.cost,
        isFake: item.isFake,
        isGolden: item.isGolden,
        sold: item.sold,
        soldFor: item.soldFor,
      })),
    };
  });

  console.log('\n=== FINAL RESULTS ===');
  console.log(`Act 1 Spending: ${finalData.act1Spending} EUR`);
  console.log(`Act 2 Revenue: ${finalData.act2Revenue} EUR`);
  console.log(`Final Score (profit): ${finalData.score} EUR`);
  console.log('\nDetailed inventory:');
  for (const item of finalData.inventory) {
    const type = item.isGolden ? 'GOLDEN' : item.isFake ? 'FAKE' : 'REAL';
    const soldInfo = item.sold ? `Sold for ${item.soldFor} EUR` : 'UNSOLD';
    const profit = item.sold ? item.soldFor - item.cost : -item.cost;
    console.log(`  [${item.index}] ${item.brand} | Display: ${item.displayPrice} EUR | Cost: ${item.cost} EUR | ${soldInfo} | Profit: ${profit >= 0 ? '+' : ''}${profit} EUR | ${type}`);
  }

  // Highlight the price inconsistency
  console.log('\n=== PRICE ANALYSIS ===');
  const realItems = finalData.inventory.filter(i => !i.isFake && !i.isGolden);
  const fakeItems = finalData.inventory.filter(i => i.isFake);
  const goldenItems = finalData.inventory.filter(i => i.isGolden);

  console.log(`Real watches: ${realItems.length}`);
  if (realItems.length > 0) {
    console.log(`  Display prices range: ${Math.min(...realItems.map(i => i.displayPrice))}-${Math.max(...realItems.map(i => i.displayPrice))} EUR`);
    console.log(`  Internal cost (ALL): ${realItems[0].cost} EUR (always fixed at 10)`);
    console.log(`  >> ISSUE: Player sees "47 EUR" on the card in Act 1, but Act 2 shows "Payé: 10 EUR"`);
  }

  console.log(`Fake watches: ${fakeItems.length}`);
  if (fakeItems.length > 0) {
    console.log(`  Display prices range: ${Math.min(...fakeItems.map(i => i.displayPrice))}-${Math.max(...fakeItems.map(i => i.displayPrice))} EUR`);
    console.log(`  Internal cost (ALL): ${fakeItems[0].cost} EUR (always fixed at 15)`);
  }

  console.log(`Golden watches: ${goldenItems.length}`);
  if (goldenItems.length > 0) {
    console.log(`  Display prices range: ${Math.min(...goldenItems.map(i => i.displayPrice))}-${Math.max(...goldenItems.map(i => i.displayPrice))} EUR`);
    console.log(`  Internal cost (ALL): ${goldenItems[0].cost} EUR (always fixed at 50)`);
  }

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/09-game-over.png` });
  console.log('\nScreenshot: Game over');

  await browser.close();
  console.log('\nDone! Screenshots saved to screenshots/');
}

main().catch(console.error);
