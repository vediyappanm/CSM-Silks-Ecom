/**
 * End-to-end icon + navigation + page smoke audit.
 * Run: node scripts/e2e-icons-audit.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173';
const findings = [];
const outDir = path.resolve('scripts/e2e-artifacts');
fs.mkdirSync(outDir, { recursive: true });

function note(severity, area, message) {
  findings.push({ severity, area, message });
  console.log(`[${severity.toUpperCase()}] ${area}: ${message}`);
}

async function countIcons(page) {
  return page.evaluate(() => {
    const svgs = document.querySelectorAll('svg');
    const brokenImgs = [...document.querySelectorAll('img')].filter(img => !img.complete || img.naturalWidth === 0);
    const zeroSizeSvgs = [...svgs].filter(svg => {
      const r = svg.getBoundingClientRect();
      return r.width === 0 && r.height === 0 && svg.closest('[hidden], [aria-hidden="true"], .is-hidden') == null;
    });
    const buttonsWithoutLabel = [...document.querySelectorAll('button')].filter(btn => {
      const text = (btn.textContent || '').trim();
      const aria = btn.getAttribute('aria-label') || btn.getAttribute('title') || '';
      const hasSvg = btn.querySelector('svg');
      return hasSvg && !text && !aria;
    });
    return {
      svgCount: svgs.length,
      brokenImgs: brokenImgs.map(img => img.src || img.alt || 'unknown').slice(0, 10),
      zeroSizeSvgs: zeroSizeSvgs.length,
      iconButtonsMissingLabel: buttonsWithoutLabel.length,
    };
  });
}

async function visit(page, route, area) {
  const res = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
  const status = res?.status() || 0;
  if (status >= 400) note('error', area, `HTTP ${status} for ${route}`);
  await page.waitForTimeout(400);
  const icons = await countIcons(page);
  if (icons.svgCount === 0) note('error', area, `No SVG icons rendered on ${route}`);
  else note('info', area, `${icons.svgCount} icons on ${route}`);
  if (icons.brokenImgs.length) note('warn', area, `Broken images: ${icons.brokenImgs.join(', ')}`);
  if (icons.zeroSizeSvgs > 3) note('warn', area, `${icons.zeroSizeSvgs} zero-size SVGs (may be offscreen/hidden)`);
  if (icons.iconButtonsMissingLabel) note('error', area, `${icons.iconButtonsMissingLabel} icon buttons missing aria-label`);
  const bodyText = await page.locator('body').innerText();
  if (/page not found|something went wrong|application error/i.test(bodyText)) {
    note('error', area, `Error UI on ${route}`);
  }
  await page.screenshot({ path: path.join(outDir, `icons-${area.replace(/\W+/g, '_')}.png`), fullPage: true });
  return icons;
}

async function clickNavIcon(page, label, expectPath) {
  const btn = page.getByRole('button', { name: label }).or(page.getByLabel(label)).first();
  if (!(await btn.count())) {
    note('error', 'nav', `Icon control missing: ${label}`);
    return;
  }
  await btn.click();
  await page.waitForTimeout(800);
  if (expectPath && !page.url().includes(expectPath)) {
    note('error', 'nav', `${label} did not navigate to ${expectPath}, got ${page.url()}`);
  } else {
    note('info', 'nav', `${label} works -> ${page.url()}`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', err => note('error', 'runtime', err.message));

  // Favicon
  const favicon = await page.request.get(`${BASE}/favicon.svg`);
  if (!favicon.ok()) note('error', 'favicon', `favicon.svg status ${favicon.status()}`);
  else note('info', 'favicon', 'favicon.svg OK');

  // Desktop pages
  const routes = [
    ['/', 'home'],
    ['/womens', 'womens'],
    ['/mens', 'mens'],
    ['/search', 'search'],
    ['/tracking', 'tracking'],
    ['/login', 'login'],
    ['/signup', 'signup'],
    ['/wishlist', 'wishlist'],
    ['/cart', 'cart'],
    ['/tryon', 'tryon'],
    ['/admin', 'admin'],
  ];
  for (const [route, area] of routes) {
    await visit(page, route, area);
  }

  // Product detail from mens
  await page.goto(`${BASE}/mens`, { waitUntil: 'networkidle' });
  const productLink = page.locator('a[href*="/product/"]').first();
  if (await productLink.count()) {
    await productLink.click();
    await page.waitForLoadState('networkidle');
    await visit(page, page.url().replace(BASE, ''), 'product');
    // Product icon buttons
    for (const label of ['Save to wishlist', 'Share product', 'Add to cart']) {
      const el = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
      if (!(await el.count())) note('warn', 'product', `Missing button: ${label}`);
      else {
        const box = await el.boundingBox();
        if (!box || box.width < 8 || box.height < 8) note('error', 'product', `${label} has invalid size`);
        else note('info', 'product', `${label} icon button OK`);
      }
    }
  } else {
    note('error', 'product', 'No product link to open detail');
  }

  // Navbar icon actions from home
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await clickNavIcon(page, 'Notifications', '/login'); // guest may redirect
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await clickNavIcon(page, 'Wishlist', '/wishlist'); // public page
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await clickNavIcon(page, 'Cart', '/login'); // protected
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await clickNavIcon(page, 'Login', '/login');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const themeBtn = page.getByRole('button', { name: /theme|dark|light/i }).first();
  if (await themeBtn.count()) {
    const before = await page.locator('html').getAttribute('data-theme');
    await themeBtn.click();
    await page.waitForTimeout(300);
    const after = await page.locator('html').getAttribute('data-theme');
    if (before === after) note('warn', 'theme', 'Theme toggle did not change data-theme');
    else note('info', 'theme', `Theme toggled ${before || 'light'} -> ${after || 'light'}`);
  } else {
    note('error', 'theme', 'Theme toggle button missing');
  }

  // Floating buttons
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const floatBtns = page.locator('.fb, .float-stack button, .float-stack a');
  const floatCount = await floatBtns.count();
  if (floatCount === 0) note('warn', 'float', 'No floating action buttons');
  else note('info', 'float', `${floatCount} floating controls present`);

  // Google button on login
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  const googleBtn = page.getByRole('button', { name: /continue with google/i });
  if (await googleBtn.count()) {
    const box = await googleBtn.boundingBox();
    if (!box || box.height < 30) note('error', 'google', 'Google button too small/hidden');
    else note('info', 'google', 'Google button visible and sized');
  } else note('error', 'google', 'Google button missing');

  // Mobile bottom nav icons
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const bottomNav = page.locator('.mob-bottom-nav');
  const navVisible = await bottomNav.isVisible().catch(() => false);
  if (!navVisible) note('error', 'mobile', 'Mobile bottom nav not visible at 390px');
  const tabs = page.locator('.mob-bottom-tab');
  const tabCount = await tabs.count();
  if (tabCount < 4) note('error', 'mobile', `Expected 5 bottom tabs, found ${tabCount}`);
  else {
    note('info', 'mobile', `${tabCount} bottom nav tabs`);
    const storefrontTabs = ['Home tab', 'Shop tab', 'Try on tab'];
    for (const label of storefrontTabs) {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      const tab = page.getByRole('button', { name: label });
      if (!(await tab.count())) {
        note('error', 'mobile', `Missing bottom tab: ${label}`);
        continue;
      }
      const hasSvg = await tab.locator('svg').count();
      if (!hasSvg) note('error', 'mobile', `Bottom tab missing icon: ${label}`);
      if (!(await tab.isVisible())) note('error', 'mobile', `Bottom tab not visible: ${label}`);
      else {
        await tab.click();
        await page.waitForTimeout(400);
        note('info', 'mobile', `${label} clickable`);
      }
    }
  }

  // OTP login + authed icon routes
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  const phone = `9${String(Date.now()).slice(-9)}`;
  await page.getByPlaceholder(/98765|mobile|phone/i).fill(phone);
  await page.getByRole('button', { name: /send otp/i }).click();
  await page.waitForTimeout(1200);
  const devOtp = page.locator('.auth-dev-otp');
  if (await devOtp.count()) {
    const otp = ((await devOtp.innerText()).match(/\d{6}/) || [])[0];
    if (otp) {
      const otpInputs = page.locator('[data-otp-index]');
      for (let i = 0; i < 6; i += 1) await otpInputs.nth(i).fill(otp[i]);
      await page.locator('button.auth-primary').click();
      await page.waitForTimeout(1500);
      if (page.url().includes('/login')) note('error', 'auth', 'OTP login failed');
      else {
        note('info', 'auth', 'OTP login OK');
        await page.goto(BASE, { waitUntil: 'networkidle' });
        await clickNavIcon(page, 'Notifications', '/notifications');
        await page.goto(BASE, { waitUntil: 'networkidle' });
        await clickNavIcon(page, 'Cart', '/cart');
        await page.goto(BASE, { waitUntil: 'networkidle' });
        await clickNavIcon(page, 'Account', '/account');
        // Account page icons
        await visit(page, '/account', 'account');
        await visit(page, '/orders', 'orders');
        await visit(page, '/notifications', 'notifications');
      }
    }
  } else {
    note('warn', 'auth', 'Dev OTP not shown; skipped authed icon checks');
  }

  // Admin icons
  await page.evaluate(() => {
    localStorage.removeItem('csm_access_token');
    localStorage.removeItem('csm_refresh_token');
  });
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder(/email or username/i).fill('admin@csmsilks.com');
  await page.locator('input[type="password"]').fill('admin123');
  await page.getByRole('button', { name: /^login$/i }).click();
  await page.waitForTimeout(2000);
  const adminIcons = await countIcons(page);
  if (adminIcons.svgCount < 5) note('error', 'admin', `Too few admin icons: ${adminIcons.svgCount}`);
  else note('info', 'admin', `${adminIcons.svgCount} admin icons`);
  const adminNav = page.locator('.admin-nav button, .admin-sidebar button, aside button');
  const navCount = await adminNav.count();
  if (navCount < 5) note('warn', 'admin', `Few admin nav items: ${navCount}`);
  for (let i = 0; i < Math.min(navCount, 8); i += 1) {
    const item = adminNav.nth(i);
    const hasSvg = await item.locator('svg').count();
    const text = (await item.innerText()).trim();
    if (!hasSvg) note('error', 'admin', `Admin nav missing icon: ${text || i}`);
    await item.click();
    await page.waitForTimeout(400);
  }
  note('info', 'admin', 'Admin nav items clicked');

  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    findings,
    summary: {
      errors: findings.filter(f => f.severity === 'error').length,
      warnings: findings.filter(f => f.severity === 'warn').length,
      info: findings.filter(f => f.severity === 'info').length,
    },
  };
  fs.writeFileSync(path.join(outDir, 'icons-report.json'), JSON.stringify(report, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(report.summary);
  if (report.summary.errors > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
