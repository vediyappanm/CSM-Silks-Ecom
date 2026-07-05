/**
 * Opens Google Cloud OAuth client settings and attempts to add localhost redirect URIs.
 * Requires an already-signed-in Google session in the launched browser.
 */
import { chromium } from 'playwright';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
  || '401836844493-e97v9qd456fjujqtg16gjff27govcplr.apps.googleusercontent.com';
const REDIRECT_URIS = [
  'http://localhost:5173/auth/google/callback',
  'http://127.0.0.1:5173/auth/google/callback',
];
const ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const credentialsUrl = `https://console.cloud.google.com/apis/credentials/oauthclient/${CLIENT_ID}`;

async function main() {
  console.log('Opening Google Cloud OAuth client editor...');
  console.log(`Client: ${CLIENT_ID}`);
  console.log(`URL: ${credentialsUrl}`);

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--start-maximized'],
  });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  await page.goto(credentialsUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(4000);

  const url = page.url();
  console.log(`Landed on: ${url}`);

  if (url.includes('accounts.google.com') || url.includes('ServiceLogin') || url.includes('signin')) {
    console.log('Google sign-in is required in the opened browser window.');
    console.log('Sign in to the Google account that owns this OAuth client, then re-run:');
    console.log('  node frontend/scripts/setup-google-oauth.mjs');
    console.log('Leaving the browser open for 3 minutes so you can sign in...');
    await page.waitForTimeout(180000);
  }

  // After possible login, go to the client editor again.
  await page.goto(credentialsUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(5000);

  if (page.url().includes('accounts.google.com')) {
    console.error('Still on Google sign-in. Cannot update OAuth client without your Google account.');
    await browser.close();
    process.exit(1);
  }

  // Try to fill redirect URIs. Google Cloud Console DOM changes often; use best-effort selectors.
  const addRedirect = async (uri) => {
    // Look for an existing input already containing this URI.
    const existing = page.locator(`input[value="${uri}"]`);
    if (await existing.count()) {
      console.log(`Already present: ${uri}`);
      return true;
    }

    // Common patterns: "Add URI" buttons near Authorized redirect URIs.
    const addButtons = page.getByRole('button', { name: /add uri|add uri\b|add$/i });
    const count = await addButtons.count();
    for (let i = 0; i < count; i += 1) {
      const btn = addButtons.nth(i);
      const box = await btn.boundingBox().catch(() => null);
      if (!box) continue;
      // Prefer buttons in the lower half of the form (redirect URIs section).
      await btn.click({ timeout: 2000 }).catch(() => null);
      await page.waitForTimeout(500);
    }

    const emptyInputs = page.locator('input[type="url"], input[aria-label*="URI" i], input[placeholder*="https://" i]');
    const inputCount = await emptyInputs.count();
    for (let i = inputCount - 1; i >= 0; i -= 1) {
      const input = emptyInputs.nth(i);
      const value = await input.inputValue().catch(() => 'x');
      if (!value) {
        await input.fill(uri);
        console.log(`Filled: ${uri}`);
        return true;
      }
    }

    // Fallback: type into focused field after clicking Add URI.
    await page.keyboard.type(uri);
    console.log(`Typed into focused field: ${uri}`);
    return true;
  };

  for (const uri of REDIRECT_URIS) {
    await addRedirect(uri);
    await page.waitForTimeout(800);
  }

  // Also try Authorized JavaScript origins (helps GIS if used later).
  for (const origin of ORIGINS) {
    const existing = page.locator(`input[value="${origin}"]`);
    if (await existing.count()) {
      console.log(`Origin already present: ${origin}`);
      continue;
    }
  }

  const save = page.getByRole('button', { name: /save/i }).first();
  if (await save.count()) {
    await save.click();
    console.log('Clicked Save. Waiting for confirmation...');
    await page.waitForTimeout(4000);
  } else {
    console.log('Save button not found automatically. Complete Save in the open browser window.');
    await page.waitForTimeout(120000);
  }

  console.log('Done. Browser will stay open 30s for you to confirm.');
  await page.waitForTimeout(30000);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
