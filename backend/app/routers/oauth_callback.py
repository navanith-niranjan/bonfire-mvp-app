"""
OAuth callback interstitial page for mobile app redirect.

Supabase redirects the browser to this URL with tokens in the hash fragment
(e.g. /oauth/callback#access_token=...). Optional query param: scheme=exp
for Expo Go (so "Open app" uses exp://); omit for dev/prod (mock-app://).
"""
import json

from fastapi import APIRouter, Query
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["oauth"])

# Default scheme for dev/prod builds (app.json "scheme")
DEFAULT_SCHEME = "mock-app"

# Placeholder replaced at runtime; no { } in template to avoid .format() / parsing issues
_SCHEME_PLACEHOLDER = "__SCHEME_JSON__"
_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      box-sizing: border-box;
    }
    h1 { font-size: 1.25rem; margin-bottom: 8px; }
    p { color: #666; margin-bottom: 24px; text-align: center; }
    a {
      display: inline-block;
      padding: 12px 24px;
      background: #000;
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
    }
    a:hover { opacity: 0.9; }
    .error { color: #c00; }
  </style>
</head>
<body>
  <h1>Sign in successful</h1>
  <p id="message">Tap the button below to return to the app.</p>
  <a id="openApp" href="#">Open app</a>

  <script>
    (function () {
      var scheme = __SCHEME_JSON__;
      var hash = window.location.hash;
      var openBtn = document.getElementById('openApp');
      var message = document.getElementById('message');

      if (!hash || hash.length < 2) {
        message.textContent = 'No auth data received. You can close this page and try again in the app.';
        message.className = 'error';
        openBtn.style.display = 'none';
        return;
      }

      var appUrl = scheme + '://#' + hash.slice(1);
      openBtn.href = appUrl;

      var tryAuto = setTimeout(function () {
        window.location.href = appUrl;
      }, 1500);
      openBtn.onclick = function () {
        clearTimeout(tryAuto);
      };
    })();
  </script>
</body>
</html>
"""


@router.get("/oauth/callback", response_class=HTMLResponse)
async def oauth_callback_page(
    scheme: str | None = Query(None, description="Deep link scheme: exp for Expo Go, mock-app for dev/prod"),
):
    """
    Serves the OAuth callback interstitial page.

    Supabase redirects the browser here with tokens in the URL hash.
    This page shows "Sign in successful" and an "Open app" link so the
    user can return to the app (required for Android Chrome Custom Tabs).

    Use ?scheme=exp when redirecting from Expo Go so the link opens Expo Go.
    """
    scheme_value = (scheme or DEFAULT_SCHEME).strip().lower()
    if not scheme_value or not scheme_value.replace("-", "").replace("_", "").isalnum():
        scheme_value = DEFAULT_SCHEME
    scheme_json = json.dumps(scheme_value)
    html = _HTML_TEMPLATE.replace(_SCHEME_PLACEHOLDER, scheme_json)
    return html
