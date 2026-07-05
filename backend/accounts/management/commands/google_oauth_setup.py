from django.conf import settings
from django.core.management.base import BaseCommand

from accounts.google_auth import allowed_google_redirect_uris, google_oauth_configured


class Command(BaseCommand):
    help = "Print Google OAuth setup steps and required redirect URIs for this environment."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("CSM Silks - Google OAuth setup"))
        self.stdout.write("")
        self.stdout.write(f"GOOGLE_OAUTH_ENABLED: {settings.GOOGLE_OAUTH_ENABLED}")
        self.stdout.write(f"GOOGLE_CLIENT_ID set: {bool(settings.GOOGLE_CLIENT_ID)}")
        self.stdout.write(f"Configured for sign-in: {google_oauth_configured()}")
        self.stdout.write("")
        self.stdout.write("1. Open Google Cloud Console > APIs & Services > Credentials")
        self.stdout.write("2. Edit your OAuth 2.0 Web client")
        self.stdout.write("3. Add these Authorized JavaScript origins (for Google Sign-In button):")
        for origin in settings.CORS_ALLOWED_ORIGINS:
            if origin.startswith("http://localhost") or origin.startswith("http://127.0.0.1"):
                self.stdout.write(f"   - {origin.rstrip('/')}")
        self.stdout.write("")
        self.stdout.write("4. Optional Authorized redirect URIs (legacy redirect flow only):")
        for uri in allowed_google_redirect_uris():
            self.stdout.write(f"   - {uri}")
        self.stdout.write("")
        self.stdout.write("5. Backend .env must include:")
        self.stdout.write("   GOOGLE_CLIENT_ID=<your-web-client-id>.apps.googleusercontent.com")
        self.stdout.write("   GOOGLE_OAUTH_ENABLED=True")
        self.stdout.write("")
        self.stdout.write("6. Optional frontend/.env.local:")
        self.stdout.write("   VITE_GOOGLE_CLIENT_ID=<same client id>")
        self.stdout.write("")
        self.stdout.write("7. Restart the API, open /login, click Continue with Google.")
        if not google_oauth_configured():
            self.stdout.write(self.style.WARNING("Google sign-in is not fully configured yet."))
        else:
            self.stdout.write(self.style.SUCCESS("Backend Google client id is configured."))
