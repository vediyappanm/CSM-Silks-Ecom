/**
 * End-to-end browser audit for CSM Silks storefront + admin.
 * Run: node scripts/e2e-audit.mjs
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

function note(severity, area, message, extra = {}) {
  findings.push({ severity, area, message, ...extra });
  const tag = severity.toUpperCase();
  console.log(`[${tag}] ${area}: ${message}`);
}

async function apiJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
}

async function screenshot(page, name) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function collectConsole(page, area) {
  page.on('pageerror', err => note('error', area, `pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (text.includes('[GSI_LOGGER]') || text.includes('accounts.google.com')) return;
    note('warn', area, `console.error: ${text}`);
  });
}

async function launchBrowser() {
  const channel = process.env.E2E_BROWSER || 'chromium';
  const options = { headless: true };
  if (channel === 'msedge' || channel === 'chrome') {
    options.channel = channel;
  }
  return chromium.launch(options);
}

async function main() {
  console.log(`E2E audit against ${BASE}`);

  // --- API smoke ---
  const config = await apiJson(`${API}/api/auth/config`);
  if (config.status !== 200) note('error', 'api', `auth/config status ${config.status}`);
  else {
    note('info', 'api', `google_oauth_enabled=${config.body.google_oauth_enabled}, otp_dev_fallback=${config.body.otp_dev_fallback_enabled}`);
    if (!config.body.otp_dev_fallback_enabled && !config.body.otp_delivery_configured) {
      note('error', 'api', 'Neither OTP delivery nor dev fallback is enabled — customer login will fail');
    }
  }

  const products = await apiJson(`${API}/api/products?per_page=5`);
  if (products.status !== 200 || !products.body?.items?.length) {
    note('error', 'api', 'No products returned from /api/products');
  }

  const adminLogin = await apiJson(`${API}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@csmsilks.com', password: 'admin123' }),
  });
  if (adminLogin.status !== 200) {
    const alt = await apiJson(`${API}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin', password: 'admin123' }),
    });
    if (alt.status !== 200) note('error', 'api', `Admin login failed: ${JSON.stringify(adminLogin.body)}`);
    else adminLogin.body = alt.body;
  }
  const adminToken = adminLogin.body?.access_token;

  let adminProduct = null;
  if (adminToken) {
    const adminProducts = await apiJson(`${API}/api/admin/products?per_page=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (adminProducts.status !== 200) note('error', 'api', `Admin products list failed: ${adminProducts.status}`);
    else {
      adminProduct = adminProducts.body.items?.[0];
      if (adminProduct) {
        const detail = await apiJson(`${API}/api/admin/products/${adminProduct.id}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (detail.status !== 200) note('error', 'api', `Admin product detail failed for id=${adminProduct.id}`);
        else if (!detail.body?.name) note('error', 'api', 'Admin product detail missing name');
        else note('info', 'api', `Admin product detail OK: ${detail.body.name}`);
      }
    }
  }

  // OTP send/verify via API
  const phone = E2E_DEV_PHONE;
  const otpSend = await apiJson(`${API}/api/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (otpSend.status !== 200) note('error', 'api', `OTP send failed: ${JSON.stringify(otpSend.body)}`);
  else if (!otpSend.body?.dev_otp) note('error', 'api', 'OTP send OK but no dev_otp returned');
  else {
    const verify = await apiJson(`${API}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp: otpSend.body.dev_otp }),
    });
    if (verify.status !== 200) note('error', 'api', `OTP verify failed: ${JSON.stringify(verify.body)}`);
    else note('info', 'api', 'OTP send/verify round-trip OK');
  }

  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  await collectConsole(page, 'browser');

  // --- Home ---
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await screenshot(page, '01-home');
  const homeTitle = await page.title();
  if (!homeTitle.toLowerCase().includes('csm')) note('warn', 'home', `Unexpected title: ${homeTitle}`);
  const productCards = page.locator('.product-card, a[href*="/product/"]');
  const cardCount = await productCards.count();
  if (cardCount === 0) note('error', 'home', 'No product cards/links on home');
  else note('info', 'home', `Found ${cardCount} product cards/links`);

  // --- Womens catalog ---
  await page.goto(`${BASE}/womens`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await screenshot(page, '02-womens');
  const womenCards = await page.locator('.product-card').count();
  const womenEmpty = await page.locator('.catalog-empty').count();
  if (womenCards === 0) note(womenEmpty ? 'warn' : 'error', 'womens', womenEmpty ? 'Empty catalog state on /womens' : 'No product cards on /womens');
  else note('info', 'womens', `${womenCards} product cards on /womens`);

  // --- Mens catalog ---
  await page.goto(`${BASE}/mens`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await screenshot(page, '03-mens');
  const menCards = page.locator('.product-card');
  const menCount = await menCards.count();
  if (menCount === 0) note('error', 'mens', 'No product cards on /mens');
  else {
    note('info', 'mens', `${menCount} product cards on /mens`);
    const productLink = page.locator('a.product-card-link, a.product-card-media-link, a[href*="/product/"]').first();
    if (!(await productLink.count())) note('error', 'product', 'Product cards missing detail links');
    else {
      await productLink.click();
      await page.waitForLoadState('networkidle');
      await screenshot(page, '04-product-detail');
      if (!page.url().includes('/product/')) note('error', 'product', `Product card click did not navigate: ${page.url()}`);
      else note('info', 'product', `Opened product detail: ${page.url()}`);
      const addBtn = page.locator('button.pd-btn-cart, button[aria-label="Add to cart"]').first();
      const buyBtn = page.getByRole('button', { name: /buy now/i }).first();
      if (!(await addBtn.count()) && !(await buyBtn.count())) note('error', 'product', 'No Add to cart / Buy now button');
      else if (await addBtn.count()) {
        await addBtn.click();
        await page.waitForTimeout(1200);
        await screenshot(page, '05-after-add-cart');
        if (page.url().includes('/login')) note('info', 'product', 'Guest add-to-cart correctly redirected to login');
        else note('info', 'product', 'Clicked Add to cart');
      }
    }
  }

  // --- Cart is auth-protected for guests ---
  await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle' });
  await screenshot(page, '06-cart');
  if (page.url().includes('/login')) note('info', 'cart', 'Guest cart correctly requires login');
  else {
    const cartEmpty = await page.locator('.cart-empty').count();
    const cartItems = await page.locator('.cart-item').count();
    if (cartItems > 0) note('info', 'cart', `${cartItems} cart items present`);
    else if (cartEmpty) note('info', 'cart', 'Cart empty state shown');
    else note('warn', 'cart', 'Cart page rendered without empty state or items');
  }

  // --- Login / Google / OTP UI ---
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await screenshot(page, '07-login');
  const googleBtn = page.getByRole('button', { name: /continue with google|sign in with google|sign up with google/i });
  const googleIframe = page.locator('iframe[src*="accounts.google.com"]');
  const googleBtnVisible = await googleBtn.count();
  const googleIframeVisible = await googleIframe.count();
  if (googleBtnVisible || googleIframeVisible) note('info', 'login', 'Google sign-in control is visible');
  else if (config.body?.google_oauth_enabled) {
    note('error', 'login', 'Google OAuth is enabled but button is not visible');
  } else {
    note('warn', 'login', 'Google OAuth is not configured');
  }

  // Duplicate error messages check
  const bodyText = await page.locator('body').innerText();
  if ((bodyText.match(/Google sign-in could not load/gi) || []).length > 1) {
    note('error', 'login', 'Duplicate Google failure messages on login page');
  }
  if (bodyText.includes('Authorized JavaScript origins') && bodyText.includes('Google button could not load')) {
    note('error', 'login', 'Duplicate Google origin error messages still present');
  }

  // OTP flow in browser (unique phone avoids rate limit from prior runs)
  const phoneInput = page.getByPlaceholder(/98765|mobile|phone/i).first();
  const e2ePhone = E2E_DEV_PHONE;
  if (await phoneInput.count()) {
    await phoneInput.fill(e2ePhone);
    await page.getByRole('button', { name: /send otp/i }).click();
    await page.waitForTimeout(1500);
    await screenshot(page, '08-otp-step');
    const otpError = page.locator('.auth-error');
    const devOtpEl = page.locator('.auth-dev-otp');
    if (await otpError.count()) {
      const errText = await otpError.first().innerText();
      note('error', 'login', `OTP send UI error: ${errText}`);
    } else if (await devOtpEl.count()) {
      const otpText = await devOtpEl.innerText();
      const otpMatch = otpText.match(/\d{6}/);
      if (!otpMatch) note('error', 'login', 'Dev OTP block present but no 6-digit code');
      else {
        const otp = otpMatch[0];
        const otpInputs = page.locator('[data-otp-index]');
        const otpCount = await otpInputs.count();
        if (otpCount >= 6) {
          for (let i = 0; i < 6; i += 1) {
            await otpInputs.nth(i).fill(otp[i]);
          }
        } else {
          const single = page.locator('input[inputmode="numeric"]').first();
          await single.fill(otp);
        }
        await page.locator('button.auth-primary').click();
        await page.waitForTimeout(2000);
        await screenshot(page, '09-after-otp-verify');
        const url = page.url();
        const verifyError = page.locator('.auth-error');
        if (await verifyError.count()) note('error', 'login', `OTP verify UI error: ${await verifyError.first().innerText()}`);
        else if (url.includes('/login')) note('error', 'login', `Still on login after OTP verify: ${url}`);
        else {
          note('info', 'login', `OTP login succeeded, landed on ${url}`);
          // Logged-in add-to-cart
          await page.goto(`${BASE}/mens`, { waitUntil: 'networkidle' });
          await page.locator('.product-card').first().click();
          await page.waitForLoadState('networkidle');
          const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
          if (await addBtn.count()) {
            await addBtn.click();
            await page.waitForTimeout(1200);
            await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle' });
            await screenshot(page, '09b-cart-after-login');
            const items = await page.locator('.cart-item').count();
            if (items === 0) note('error', 'cart', 'Logged-in add-to-cart did not populate cart');
            else note('info', 'cart', `Logged-in cart has ${items} item(s)`);
          }
        }
      }
    } else {
      note('error', 'login', 'OTP step did not show error or dev OTP');
    }
  } else {
    note('error', 'login', 'Phone input not found on login page');
  }

  // Logged-in checkout + orders smoke (after OTP login above)
  if (!page.url().includes('/login')) {
    await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });
    await screenshot(page, '09c-checkout');
    const checkoutBody = await page.locator('body').innerText();
    if (/page not found|something went wrong/i.test(checkoutBody)) {
      note('error', 'checkout', 'Checkout page error UI');
    } else if (checkoutBody.includes('Your cart is empty')) {
      note('warn', 'checkout', 'Checkout reachable but cart empty');
    } else {
      note('info', 'checkout', 'Checkout page loaded with cart items');
    }
    await page.goto(`${BASE}/orders`, { waitUntil: 'networkidle' });
    await screenshot(page, '09d-orders');
    if (page.url().includes('/login')) note('error', 'orders', 'Orders redirected to login after OTP session');
    else note('info', 'orders', 'Orders page reachable when logged in');
    await page.goto(`${BASE}/search?q=silk`, { waitUntil: 'networkidle' });
    await screenshot(page, '09e-search');
    const searchCards = await page.locator('.product-card, a[href*="/product/"]').count();
    if (searchCards === 0) note('warn', 'search', 'Search returned no product cards for q=silk');
    else note('info', 'search', `Search found ${searchCards} product links`);
  }

  // --- Admin (clear customer session tokens first) ---
  await page.evaluate(() => {
    localStorage.removeItem('csm_access_token');
    localStorage.removeItem('csm_refresh_token');
  });
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder(/email or username/i).waitFor({ timeout: 10000 }).catch(() => null);
  await screenshot(page, '10-admin-login');
  const adminEmail = page.getByPlaceholder(/email or username/i);
  const adminPass = page.locator('input[type="password"]');
  if (await adminEmail.count() && await adminPass.count()) {
    await adminEmail.fill('admin@csmsilks.com');
    await adminPass.fill('admin123');
    await page.getByRole('button', { name: /^login$/i }).click();
    await page.waitForTimeout(2500);
    await screenshot(page, '11-admin-dashboard');
    const adminBody = await page.locator('body').innerText();
    if (/invalid admin credentials|unable to sign in/i.test(adminBody)) {
      note('error', 'admin', 'Admin login appears to have failed');
    } else {
      note('info', 'admin', 'Admin login form submitted');
      const catalogNav = page.locator('.admin-nav button, .admin-sidebar button, nav button').filter({ hasText: /^catalog$/i });
      if (await catalogNav.count()) {
        await catalogNav.first().click();
        await page.waitForTimeout(1500);
      } else {
        await page.goto(`${BASE}/admin#catalog`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);
      }
      await screenshot(page, '12-admin-catalog');
      const editBtn = page.getByRole('button', { name: /edit/i }).first();
      if (await editBtn.count()) {
        await editBtn.click();
        await page.waitForTimeout(1500);
        await screenshot(page, '13-admin-edit');
        const nameInput = page.locator('.admin-edit-modal input, .admin-edit-panel input').first();
        const nameVal = await nameInput.inputValue().catch(() => '');
        if (!nameVal || nameVal === '0') {
          note('error', 'admin', `Edit form product name empty/default: "${nameVal}"`);
        } else {
          note('info', 'admin', `Edit form prefilled with name: ${nameVal}`);
        }
        const priceInputs = page.locator('.admin-edit-modal input[type="number"], .admin-edit-panel input[type="number"]');
        const priceCount = await priceInputs.count();
        let allZero = priceCount > 0;
        for (let i = 0; i < priceCount; i += 1) {
          const v = await priceInputs.nth(i).inputValue();
          if (v && v !== '0') allZero = false;
        }
        if (allZero && priceCount > 0) note('error', 'admin', 'Edit form numeric fields are all zero');
      } else {
        note('warn', 'admin', 'No Edit button found in admin catalog');
      }
    }
  } else {
    note('error', 'admin', `Admin login inputs not found. Body: ${(await page.locator('body').innerText()).slice(0, 200)}`);
  }

  // Mobile viewport smoke (clear admin session so storefront renders)
  await page.evaluate(() => {
    localStorage.removeItem('csm_access_token');
    localStorage.removeItem('csm_refresh_token');
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await screenshot(page, '14-mobile-home');
  const bottomNav = page.locator('.mob-bottom-nav, nav[aria-label="App navigation"]');
  if (!(await bottomNav.count())) note('warn', 'mobile', 'Mobile bottom nav not found');
  else note('info', 'mobile', 'Mobile bottom nav present');

  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    findings,
    summary: {
      errors: findings.filter(f => f.severity === 'error').length,
      warnings: findings.filter(f => f.severity === 'warn').length,
      info: findings.filter(f => f.severity === 'info').length,
    },
  };
  const reportPath = path.join(outDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(report.summary);
  console.log(`Report: ${reportPath}`);
  if (report.summary.errors > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
