"""Writes sitemap.xml and robots.txt for DoctorsVideos.video so Google can find every page. Run:
    python3 tools/build_sitemap.py
Run it again after adding or removing pages.
"""
from datetime import date
from pathlib import Path

APP = Path(__file__).resolve().parent.parent / "DoctorsVideos_App"
SITE = "https://www.doctorsvideos.video"
# doctor.html and topic.html show different content depending on the link (?id= / ?slug=), so they aren't listed
# as single pages.
SKIP = {"doctor.html", "topic.html"}


def main():
    pages = sorted(p.name for p in APP.glob("*.html") if p.name not in SKIP)
    pages.remove("index.html")
    today = date.today().isoformat()
    urls = [f"{SITE}/"] + [f"{SITE}/{p}" for p in pages]
    body = "".join(f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{today}</lastmod>\n  </url>\n" for u in urls)
    (APP / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n'
                                     '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + "</urlset>\n")
    (APP / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
    print(f"Wrote sitemap.xml ({len(urls)} pages) and robots.txt")


if __name__ == "__main__":
    main()
