#!/usr/bin/env python3
"""Render the /regimes dashboard to a standalone local file and open it.

Jekyll is NOT required. The dashboard page (regimes/index.html) is a Jekyll
page whose CSS/JS come from the layout, so opening it raw shows nothing. This
script composes the page body with a light masthead stub + the real
regimes.css / app.js, inlines feed.json so it works over file://, and opens it
in the default browser.

For a fully faithful render of the whole site (real compiled style.css, all
includes) use `make serve`, which runs Jekyll.
"""
import os
import re
import pathlib
import webbrowser

ROOT = pathlib.Path(__file__).resolve().parent.parent

page = (ROOT / "regimes" / "index.html").read_text(encoding="utf-8")
body = re.sub(r"^---.*?---\s*", "", page, count=1, flags=re.S)   # strip front matter
feed = (ROOT / "regimes" / "feed.json").read_text(encoding="utf-8")
css = (ROOT / "regimes" / "regimes.css").resolve()
js = (ROOT / "regimes" / "app.js").resolve()

# Minimal stand-in for the blog's compiled chrome (style.scss). The dashboard
# itself is styled by the real regimes.css; this just frames it like the site.
CHROME = """
  body{margin:0;background:#faf9f7;color:#2d2d2d;font:18px/1.6 "Figtree",-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
  .top-accent{height:4px;background:linear-gradient(90deg,#1a2332 0%,#c45e3e 50%,#1a2332 100%);}
  .container-wide{max-width:1100px;margin:0 auto;padding:0 32px;width:100%;}
  .wrapper-masthead{background:#fff;border-bottom:1px solid #e2ded8;}
  .masthead{padding:16px 0;display:flex;align-items:center;justify-content:space-between;}
  .site-name{color:#1a2332;font-family:"Young Serif",Georgia,serif;font-size:1.35rem;letter-spacing:.5px;}
  .site-name a{color:inherit;text-decoration:none;}
  nav{display:flex;align-items:center;gap:4px;flex-wrap:wrap;}
  nav a{color:#2d2d2d;font-size:.85rem;font-weight:500;padding:5px 12px;border-radius:6px;text-decoration:none;letter-spacing:.02em;}
  nav a:hover{background:#f0ebe5;color:#1a2332;}
  .preview-flag{font-family:"JetBrains Mono",monospace;font-size:.7rem;color:#a84a2f;text-align:center;padding:4px;background:#faf2ee;border-bottom:1px solid #e2ded8;letter-spacing:.04em;}
  .wrapper-footer{border-top:1px solid #e2ded8;background:#1a2332;margin-top:40px;}
  footer{padding:24px 0;text-align:center;}
  .footer-copy{font-size:.78rem;color:rgba(255,255,255,.3);}
"""

html = f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BTC Market Regimes — local preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Young+Serif&display=swap" rel="stylesheet">
<style>{CHROME}</style>
<link rel="stylesheet" href="file://{css}">
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js" charset="utf-8"></script>
</head><body>
<div class="top-accent"></div>
<div class="preview-flag">LOCAL PREVIEW · chrome is an approximation — run `make serve` for the real site</div>
<div class="wrapper-masthead"><div class="container-wide"><header class="masthead">
<div class="site-name"><a href="#">NoDrama</a></div>
<nav><a href="#">Blog</a><a href="#">Projects</a><a href="#">Regimes</a><a href="#">Publications</a><a href="#">About</a><a href="#">CV</a></nav>
</header></div></div>
<div class="container-wide" style="padding-top:32px;padding-bottom:40px;"><main id="main" role="main">
{body}
</main></div>
<div class="wrapper-footer"><div class="container-wide"><footer class="footer"><div class="footer-copy">&copy; NoDrama</div></footer></div></div>
<script type="application/json" id="feed">{feed}</script>
<script src="file://{js}"></script>
</body></html>"""

out_dir = ROOT / "_preview"
out_dir.mkdir(exist_ok=True)
out = out_dir / "regimes.html"
out.write_text(html, encoding="utf-8")
print(f"wrote {out}")
print(f"opening {out.as_uri()}")
webbrowser.open(out.as_uri())
