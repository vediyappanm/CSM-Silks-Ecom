/**
 * Captures the exact Google OAuth URL the app sends on "Continue with Google".
 */
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let oauthUrl = '';
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('accounts.google.com/o/oauth2')) {
      oauthUrl = url;
    }
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });

  const btn = page.getByRole('button', { name: /continue with google/i });
  if (!(await btn.count())) {
    console.error('Google button not found on /login');
    const config = await page.evaluate(async () => {
      const res = await fetch('/api/auth/config');
      return res.json();
    });
    console.log('Auth config:', JSON.stringify(config, null, 2));
    await browser.close();
    process.exit(1);
  }

  await Promise.all([
    page.waitForURL(/accounts\.google\.com/, { timeout: 15000 }).catch(() => null),
    btn.click(),
  ]);

  const finalUrl = oauthUrl || page.url();
  const parsed = new URL(finalUrl);
  console.log('OAuth authorize URL:', finalUrl.split('?')[0]);
  console.log('client_id:', parsed.searchParams.get('client_id'));
  console.log('redirect_uri:', parsed.searchParams.get('redirect_uri'));
  console.log('response_type:', parsed.searchParams.get('response_type'));
  console.log('scope:', parsed.searchParams.get('scope'));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
