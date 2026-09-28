const { chromium } = require('playwright');

async function run() {
  console.log('--- PLAYWRIGHT COMPREHENSIVE UI VERIFICATION ---');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR MSG:', msg.text());
      errors.push(msg.text());
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });
  page.on('pageerror', err => {
    console.error('BROWSER PAGE ERROR:', err.message);
    errors.push(err.message);
  });

  console.log('1. Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });

  const title = await page.title();
  console.log('Page title:', title);

  // 1. Initial State: ImportManager Onboarding Screen
  const importContainer = await page.$('#import-manager-container');
  console.log('✓ Import Manager screen present:', !!importContainer);

  const sidebar = await page.$('aside');
  console.log('✓ Sidebar navigation present:', !!sidebar);

  const importFilesBtn = await page.$('#btn-import-files');
  console.log('✓ "Choisir des fichiers" button present:', !!importFilesBtn);

  const importDirBtn = await page.$('#btn-import-dir');
  console.log('✓ "Choisir un dossier" button present:', !!importDirBtn);

  const loadDemosBtn = await page.$('#btn-load-demos');
  console.log('✓ "Tester avec des démos" button present:', !!loadDemosBtn);

  await page.screenshot({ path: 'public/01_onboarding_import_manager.png', fullPage: true });
  console.log('Screenshot 1: saved to public/01_onboarding_import_manager.png');

  // 2. Load Demo Samples
  if (loadDemosBtn) {
    console.log('\n2. Clicking "Tester avec des démos"...');
    await loadDemosBtn.click();
    // Wait for samples to index and home screen to render
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'public/02_home_with_library.png', fullPage: true });
    console.log('Screenshot 2: Home with library saved to public/02_home_with_library.png');

    // Check Home sections
    const homeSections = await page.$$('section');
    console.log(`✓ Number of library sections rendered on Home: ${homeSections.length}`);

    // Check Importer button in header
    const homeImportBtn = await page.$('#home-btn-import');
    console.log('✓ Recurrent Import button present in Home header:', !!homeImportBtn);

    // 3. Play a track
    const playButtons = await page.$$('button[title*="Lire"], div.group');
    console.log(`Found clickable media elements: ${playButtons.length}`);
    if (playButtons.length > 0) {
      console.log('\n3. Starting playback of first media item...');
      await playButtons[0].click();
      await page.waitForTimeout(1000);

      // Check MiniPlayer
      const miniPlayer = await page.$('#mini-player-container');
      console.log('✓ Mini player visible at bottom:', !!miniPlayer);

      await page.screenshot({ path: 'public/03_playback_with_miniplayer.png', fullPage: true });
      console.log('Screenshot 3: Playback with MiniPlayer saved to public/03_playback_with_miniplayer.png');
    }

    // 4. Test Navigation to Settings (Check BrowserCapabilities & Shortcuts)
    console.log('\n4. Navigating to Settings...');
    const settingsLink = await page.$('#sidebar-settings-btn');
    if (settingsLink) {
      await settingsLink.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'public/04_settings_capabilities.png', fullPage: true });
      console.log('Screenshot 4: Settings & Capabilities saved to public/04_settings_capabilities.png');
    }

    // 5. Test Navigation to Music View
    console.log('\n5. Navigating to Music View...');
    const musicLink = await page.$('aside button:has-text("Musique")');
    if (musicLink) {
      await musicLink.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'public/05_music_view.png', fullPage: true });
      console.log('Screenshot 5: Music View saved to public/05_music_view.png');
    }
  }

  await browser.close();
  console.log('\n--- PLAYWRIGHT INSPECTION COMPLETE ---');
  if (errors.length > 0) {
    console.log('Errors observed:', errors);
  } else {
    console.log('✓ Zero errors observed in browser runtime!');
  }
}

run().catch(err => {
  console.error('Playwright verification script failed:', err);
  process.exit(1);
});
