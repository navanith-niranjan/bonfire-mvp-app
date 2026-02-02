"""
OAuth callback interstitial page for mobile app redirect.

Supabase redirects the browser to this URL with tokens in the hash fragment
(e.g. /oauth/callback#access_token=...&refresh_token=...). This page is
served to the user; the client-side script reads the hash and shows an
"Open app" link so Android (Chrome Custom Tabs) has a user gesture and
hands off to the app via the custom scheme.
"""

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["oauth"])

# Must match the app's custom scheme (e.g. app.json "scheme")
APP_SCHEME = "mock-app"

OAUTH_CALLBACK_HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in successful</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      box-sizing: border-box;
    }}
    h1 {{ font-size: 1.25rem; margin-bottom: 8px; }}
    p {{ color: #666; margin-bottom: 24px; text-align: center; }}
    a {{
      display: inline-block;
      padding: 12px 24px;
      background: #000;
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
    }}
    a:hover {{ opacity: 0.9; }}
    .error {{ color: #c00; }}
  </style>
</head>
<body>
  <h1>Sign in successful</h1>
  <p id="message">Tap the button below to return to the app.</p>
  <a id="openApp" href="#">Open app</a>

  <script>
    (function () {{
      var scheme = '{APP_SCHEME}';
      var hash = window.location.hash;
      var openBtn = document.getElementById('openApp');
      var message = document.getElementById('message');

      if (!hash || hash.length < 2) {{
        message.textContent = 'No auth data received. You can close this page and try again in the app.';
        message.className = 'error';
        openBtn.style.display = 'none';
        return;
      }}

      var appUrl = scheme + '://#' + hash.slice(1);
      openBtn.href = appUrl;

      var tryAuto = setTimeout(function () {{
        window.location.href = appUrl;
      }}, 1500);
      openBtn.onclick = function () {{
        clearTimeout(tryAuto);
      }};
    }})();
  </script>
</body>
</html>
"""


@router.get("/oauth/callback", response_class=HTMLResponse)
async def oauth_callback_page():
    """
    Serves the OAuth callback interstitial page.

    Supabase redirects the browser here with tokens in the URL hash.
    This page shows "Sign in successful" and an "Open app" link so the
    user can return to the app (required for Android Chrome Custom Tabs).
    """
    return OAUTH_CALLBACK_HTML
