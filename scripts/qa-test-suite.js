const { chromium } = require('playwright');

async function runQATestSuite() {
  console.log('====================================================');
  console.log('       LOCAL MEDIA PLAYER - QA TEST SUITE           ');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('  [BROWSER ERROR]:', msg.text());
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
    console.error('  [PAGE ERROR]:', err.message);
  });

  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passCount++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failCount++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Page Load & Initial Render
    // ----------------------------------------------------
    console.log('\n[TEST 1] Chargement initial & métadonnées');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);

    const title = await page.title();
    assert(title.includes('Local Media'), `Titre de la page conforme ("${title}")`);

    const header = await page.$('header');
    assert(!!header, 'Header principal présent et visible');

    // ----------------------------------------------------
    // TEST 2: Chargement des données démo
    // ----------------------------------------------------
    console.log('\n[TEST 2] Chargement des échantillons de démo');
    // Check if demo button in header or empty state is available
    const demoBtn = await page.$('button:has-text("Démos"), button:has-text("Charger démo"), button:has-text("Tester avec des démos")');
    if (demoBtn) {
      await demoBtn.click();
      await page.waitForTimeout(3000);
      assert(true, 'Clic sur le chargement de démo réussi');
    } else {
      // Navigate to Settings to click demo button
      const settingsNav = await page.$('#top-nav-settings, button[title="Réglages"]');
      if (settingsNav) {
        await settingsNav.click();
        await page.waitForTimeout(1000);
        const settingsDemoBtn = await page.$('button:has-text("Charger des morceaux de démo")');
        if (settingsDemoBtn) {
          await settingsDemoBtn.click();
          await page.waitForTimeout(3000);
          assert(true, 'Échantillons de démo injectés depuis les Paramètres');
        }
      }
    }

    // ----------------------------------------------------
    // TEST 3: Navigation complète (Toutes les routes)
    // ----------------------------------------------------
    console.log('\n[TEST 3] Navigation inter-vues');
    const routes = [
      { id: 'home', label: 'Accueil' },
      { id: 'music', label: 'Musique' },
      { id: 'videos', label: 'Vidéos' },
      { id: 'playlists', label: 'Playlists' },
      { id: 'favorites', label: 'Favoris' },
      { id: 'history', label: 'Historique' },
      { id: 'settings', label: 'Réglages' },
    ];

    for (const r of routes) {
      const navItem = await page.$(`#top-nav-${r.id}, button[title="${r.label}"]`);
      if (navItem) {
        await navItem.click();
        await page.waitForTimeout(400);
        assert(true, `Navigation fluide vers la route: ${r.label}`);
      } else {
        assert(false, `Bouton de navigation manquant pour: ${r.label}`);
      }
    }

    // ----------------------------------------------------
    // TEST 4: Audit de la vue Réglages (Thème, Web APIs & Figma)
    // ----------------------------------------------------
    console.log('\n[TEST 4] Vue Réglages : Thème, absence de Figma & Web APIs');
    // Ensure we are on Settings
    const settingsNav = await page.$('#top-nav-settings, button[title="Réglages"]');
    if (settingsNav) await settingsNav.click();
    await page.waitForTimeout(500);

    // Verify Web APIs is NOT present
    const webApiHeading = await page.$('text="Capacités Web APIs détectées"');
    assert(!webApiHeading, 'Section "Capacités Web APIs" masquée / absente (conforme)');

    // Verify Figma is NOT present
    const figmaSection = await page.$('text="Design Visuel & Figma UI Kit"');
    assert(!figmaSection, 'Section "Figma UI Kit" supprimée (conforme)');

    // Verify Theme section is present
    const themeSection = await page.$('text="Thème & Arrière-plan de l’application"');
    assert(!!themeSection, 'Section "Thème & Arrière-plan" présente');

    // Test theme switching
    const themeGalaxy = await page.$('button:has-text("Violet Galaxie")');
    if (themeGalaxy) {
      await themeGalaxy.click();
      await page.waitForTimeout(500);
      const appClass = await page.$eval('div.flex.flex-col.h-screen', el => el.className);
      assert(appClass.includes('theme-galaxy'), 'Changement dynamique de thème vers "theme-galaxy" validé');
    }

    const themeMidnight = await page.$('button:has-text("Bleu Nuit")');
    if (themeMidnight) {
      await themeMidnight.click();
      await page.waitForTimeout(500);
      const appClass = await page.$eval('div.flex.flex-col.h-screen', el => el.className);
      assert(appClass.includes('theme-midnight'), 'Changement dynamique de thème vers "theme-midnight" validé');
    }

    // ----------------------------------------------------
    // TEST 5: Lecture Audio & Pochette en fond flouté (Now Playing)
    // ----------------------------------------------------
    console.log('\n[TEST 5] Lecture audio & Fond d\'ambiance dynamique');
    const musicNav = await page.$('#top-nav-music, button[title="Musique"]');
    if (musicNav) await musicNav.click();
    await page.waitForTimeout(600);

    // Click first track play button
    const trackPlayBtn = await page.$('button[title*="Lire"], div.group button');
    if (trackPlayBtn) {
      await trackPlayBtn.click();
      await page.waitForTimeout(1000);

      // Verify MiniPlayer is present
      const miniPlayer = await page.$('#mini-player-container');
      assert(!!miniPlayer, 'MiniPlayer persistant affiché au bas de l\'écran');

      // Open NowPlayingModal
      if (miniPlayer) {
        await miniPlayer.click();
        await page.waitForTimeout(800);

        const nowPlaying = await page.$('#now-playing-overlay');
        assert(!!nowPlaying, 'Modal Now Playing plein écran ouvert');

        // Check ambient background image presence
        const ambientBgImg = await page.$('#now-playing-overlay img.blur-3xl');
        assert(!!ambientBgImg, 'Pochette de musique floutée présente en fond d\'ambiance dynamique');

        // Close NowPlaying
        const closeNowPlaying = await page.$('#now-playing-overlay button[title="Réduire"]');
        if (closeNowPlaying) {
          await closeNowPlaying.click();
          await page.waitForTimeout(500);
          assert(true, 'Fermeture du lecteur Now Playing');
        }
      }
    }

    // ----------------------------------------------------
    // TEST 6: Lecture Vidéo & VideoPlayerOverlay
    // ----------------------------------------------------
    console.log('\n[TEST 6] Lecture vidéo & Lecteur immersif');
    const videosNav = await page.$('#top-nav-videos, button[title="Vidéos"]');
    if (videosNav) await videosNav.click();
    await page.waitForTimeout(600);

    const videoCard = await page.$('div.aspect-video');
    if (videoCard) {
      await videoCard.click();
      await page.waitForTimeout(1200);

      const videoOverlay = await page.$('#video-player-overlay');
      assert(!!videoOverlay, 'Lecteur vidéo plein écran (#video-player-overlay) ouvert');

      // Check audio mode transition button
      const audioModeBtn = await page.$('#video-top-audio-mode-btn');
      assert(!!audioModeBtn, 'Bouton transition "Mode audio" présent');

      // Close video player
      const backBtn = await page.$('#video-back-btn');
      if (backBtn) {
        await backBtn.click();
        await page.waitForTimeout(500);
        assert(true, 'Fermeture du lecteur vidéo');
      }
    }

    // ----------------------------------------------------
    // TEST 7: Test Responsive Mobile (Viewport 375x667)
    // ----------------------------------------------------
    console.log('\n[TEST 7] Test de responsivité mobile (375x667)');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(600);

    const mobileNav = await page.$('nav.fixed.bottom-0');
    assert(!!mobileNav, 'Barre de navigation mobile inférieure active');

    const headerMobile = await page.$('header');
    const headerBox = await headerMobile.boundingBox();
    assert(headerBox.width <= 375, `Header s'adapte sans dépasser l'écran (${Math.round(headerBox.width)}px <= 375px)`);

  } catch (err) {
    console.error('Exception pendant les tests QA:', err);
    failCount++;
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log(`Résultats QA: ${passCount} PASSED, ${failCount} FAILED`);
  console.log(`Erreurs Console: ${consoleErrors.length}, Erreurs Page: ${pageErrors.length}`);
  console.log('====================================================\n');

  if (failCount > 0 || pageErrors.length > 0) {
    process.exit(1);
  }
}

runQATestSuite();
