/**
 * Full storefront + admin E2E (Playwright; use E2E_BROWSER=msedge for Edge).
 * Run: node scripts/e2e-full.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173';
const API = process.env.E2E_API_URL || 'http://127.0.0.1:8000';
const E2E_DEV_PHONE = process.env.E2E_DEV_PHONE || '+918888888888';
const findings = [];
const outDir = path.resolve('scripts/e2e-artifacts');
fs.mkdirSync(outDir, { recursive: true });

function note(severity, area, message) {
  findings.push({ severity, area, message });
  console.log(`[${severity.toUpperCase()}] ${area}: ${message}`);
}

async function launchBrowser() {
  const channel = process.env.E2E_BROWSER || 'chromium';
  const options = { headless: true };
  if (channel === 'msedge' || channel === 'chrome') options.channel = channel;
  return chromium.launch(options);
}

async function visit(page, route, area) {
  const res = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 45000 });
  if ((res?.status() || 0) >= 400) note('error', area, `HTTP ${res?.status()} for ${route}`);
  const body = await page.locator('body').innerText();
  if (/page not found|something went wrong|application error/i.test(body)) {
    note('error', area, `Error UI on ${route}`);
    return false;
  }
  note('info', area, `OK ${route}`);
  return true;
}

async function fetchDevOtp(phone) {
  const res = await fetch(`${API}/api/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body.dev_otp || null;
}

async function otpLogin(page) {
  await page.evaluate(() => {
    localStorage.removeItem('csm_access_token');
    localStorage.removeItem('csm_refresh_token');
  });
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder(/98765|mobile|phone/i).fill(E2E_DEV_PHONE);
  await page.getByRole('button', { name: /send otp/i }).click();
  await page.waitForTimeout(1500);
  let otp = null;
  const devOtp = page.locator('.auth-dev-otp');
  if (await devOtp.count()) otp = ((await devOtp.innerText()).match(/\d{6}/) || [])[0];
  if (!otp) otp = await fetchDevOtp(E2E_DEV_PHONE);
  if (!otp) {
    note('error', 'auth', 'Dev OTP not available');
    return false;
  }
  const inputs = page.locator('[data-otp-index]');
  for (let i = 0; i < 6; i += 1) await inputs.nth(i).fill(otp[i]);
  await page.locator('button.auth-primary').click();
  await page.waitForTimeout(2000);
  if (page.url().includes('/login')) {
    note('error', 'auth', 'OTP verify failed');
    return false;
  }
  note('info', 'auth', `Logged in -> ${page.url()}`);
  return true;
}

async function adminLogin(page) {
  await page.evaluate(() => {
    localStorage.removeItem('csm_access_token');
    localStorage.removeItem('csm_refresh_token');
  });
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder(/email or username/i).fill('admin@csmsilks.com');
  await page.locator('input[type="password"]').fill('admin123');
  await page.getByRole('button', { name: /^login$/i }).click();
  await page.waitForSelector('.admin-shell .admin-nav', { timeout: 15000 }).catch(() => null);
  await page.waitForTimeout(1500);
  const nav = page.locator('.admin-shell .admin-nav');
  if (!(await nav.count())) {
    note('error', 'admin', 'Admin nav not visible after login');
    return false;
  }
  note('info', 'admin', 'Admin login OK');
  return true;
}

const ADMIN_SECTIONS = [
  'Dashboard',
  'Orders',
  'Catalog',
  'Inventory',
  'Shipments',
  'Coupons',
  'Returns',
  'Customers',
  'Reviews',
  'Reports',
  'Audit Logs',
  'Stock Alerts',
];

const CUSTOMER_ROUTES = [
  '/',
  '/womens',
  '/mens',
  '/search?q=silk',
  '/wishlist',
  '/tracking',
  '/tryon',
  '/login',
  '/signup',
];

async function main() {
  const browser = await launchBrowser();
  const page = await browser.newContext({ viewport: { width: 1366, height: 900 } }).then(c => c.newPage());

  page.on('pageerror', err => note('error', 'runtime', err.message));

  // --- Storefront public pages ---
  for (const route of CUSTOMER_ROUTES) {
    await visit(page, route, `store${route.replace(/\W+/g, '_')}`);
  }

  // Product detail
  await page.goto(`${BASE}/mens`, { waitUntil: 'networkidle' });
  const productLink = page.locator('a[href*="/product/"]').first();
  if (await productLink.count()) {
    await productLink.click();
    await page.waitForLoadState('networkidle');
    note('info', 'product', `Detail ${page.url()}`);
    const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
    if (await addBtn.count()) await addBtn.click();
    await page.waitForTimeout(1000);
  } else note('error', 'product', 'No product link');

  // Guest protected routes
  await visit(page, '/cart', 'cart-guest');
  if (!page.url().includes('/login')) note('warn', 'cart', 'Guest cart did not redirect to login');

  // --- Admin full navigation ---
  if (await adminLogin(page)) {
    for (const label of ADMIN_SECTIONS) {
      const btn = page.getByRole('button', { name: label }).first();
      if (!(await btn.count())) {
        note('error', 'admin', `Missing nav: ${label}`);
        continue;
      }
      await btn.click();
      await page.waitForTimeout(1200);
      const body = await page.locator('body').innerText();
      if (/unable to load|something went wrong|failed to fetch/i.test(body)) {
        note('error', 'admin', `${label} section shows load error`);
      } else {
        note('info', 'admin', `${label} section loaded`);
      }
      await page.screenshot({ path: path.join(outDir, `admin-${label.replace(/\s+/g, '-').toLowerCase()}.png`), fullPage: true });
    }

    const catalogBtn = page.getByRole('button', { name: 'Catalog' }).first();
    if (await catalogBtn.count()) {
      await catalogBtn.click();
      await page.waitForTimeout(1200);
      const editBtn = page.getByRole('button', { name: /^edit$/i }).first();
      if (await editBtn.count()) {
        await editBtn.click();
        await page.waitForTimeout(1200);
        const nameInput = page.locator('.admin-edit-modal input, .admin-edit-panel input').first();
        const nameVal = await nameInput.inputValue().catch(() => '');
        if (!nameVal || nameVal === '0') note('error', 'admin', `Catalog edit empty: "${nameVal}"`);
        else note('info', 'admin', `Catalog edit prefilled: ${nameVal}`);
      } else note('warn', 'admin', 'No Edit button in catalog');
    }

    const ordersBtn = page.getByRole('button', { name: 'Orders' }).first();
    if (await ordersBtn.count()) {
      await ordersBtn.click();
      await page.waitForTimeout(1200);
      const workflowBtn = page.getByRole('button', { name: /workflow|update status|lifecycle/i }).first();
      if (await workflowBtn.count()) note('info', 'admin', 'Orders workflow controls present');
      else note('warn', 'admin', 'Orders workflow button not found (may be empty orders list)');
    }
  }

  // Customer auth flows
  const loggedIn = await otpLogin(page);
  if (loggedIn) {
    for (const route of ['/account', '/orders', '/notifications', '/cart', '/checkout']) {
      await visit(page, route, `authed${route}`);
    }
    // Add item and checkout form smoke
    await page.goto(`${BASE}/mens`, { waitUntil: 'networkidle' });
    await page.locator('.product-card').first().click();
    await page.waitForLoadState('networkidle');
    const add = page.getByRole('button', { name: /add to cart/i }).first();
    if (await add.count()) {
      await add.click();
      await page.waitForTimeout(800);
    }
    await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });
    const checkoutForm = page.locator('input, select, textarea');
    if (await checkoutForm.count()) note('info', 'checkout', 'Checkout form fields present');
    else note('error', 'checkout', 'Checkout form missing');
  }

  // Mobile smoke
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    localStorage.removeItem('csm_access_token');
    localStorage.removeItem('csm_refresh_token');
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const mobNav = page.locator('.mob-bottom-nav');
  if (await mobNav.isVisible().catch(() => false)) note('info', 'mobile', 'Bottom nav visible');
  else note('error', 'mobile', 'Bottom nav missing on mobile');

  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    browser: process.env.E2E_BROWSER || 'chromium',
    base: BASE,
    findings,
    summary: {
      errors: findings.filter(f => f.severity === 'error').length,
      warnings: findings.filter(f => f.severity === 'warn').length,
      info: findings.filter(f => f.severity === 'info').length,
    },
  };
  const reportPath = path.join(outDir, 'full-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('\n=== FULL E2E SUMMARY ===');
  console.log(report.summary);
  console.log(`Report: ${reportPath}`);
  if (report.summary.errors > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
