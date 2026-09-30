"""Adds a doctor's YouTube channel and its videos to the DoctorsVideos.video database.

Runs from GitHub (Actions tab > "Add a doctor from YouTube" > Run workflow), or locally:
    YOUTUBE_API_KEY=... SUPABASE_SECRET_KEY=... python3 tools/import_channel.py @FootDoctorZach --specialty Podiatrist --state Ohio

Safe to run more than once: a doctor already in the database (same YouTube channel) is reused, and
videos that are already there are skipped. New doctors are added with status 'approved'.
Only the Python standard library is used.
"""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://apodzqtcrlvhrgeluomi.supabase.co").rstrip("/")
YOUTUBE_API = "https://www.googleapis.com/youtube/v3"


def fail(message):
    print(f"\nERROR: {message}", file=sys.stderr)
    sys.exit(1)


def http_json(url, method="GET", headers=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            text = resp.read().decode()
            return json.loads(text) if text else None
    except urllib.error.HTTPError as err:
        raise RuntimeError(f"{method} {url.split('?')[0]} failed ({err.code}): {err.read().decode()[:500]}") from None


# ---------- YouTube ----------

def youtube(path, **params):
    params["key"] = os.environ["YOUTUBE_API_KEY"]
    return http_json(f"{YOUTUBE_API}/{path}?{urllib.parse.urlencode(params)}")


def find_channel(channel):
    """Accepts @handle, a channel URL, or a UC... channel ID."""
    channel = channel.strip()
    match = re.search(r"(UC[\w-]{22})", channel)
    parts = "snippet,statistics,contentDetails"
    if match:
        found = youtube("channels", part=parts, id=match.group(1))
    else:
        handle = re.search(r"@([\w.\-]+)", channel)
        name = handle.group(1) if handle else channel.rstrip("/").split("/")[-1]
        found = youtube("channels", part=parts, forHandle="@" + name)
    items = (found or {}).get("items") or []
    if not items:
        fail(f"Couldn't find a YouTube channel for '{channel}'. Try the channel's @handle, e.g. @FootDoctorZach.")
    return items[0]


def channel_videos(uploads_playlist, limit):
    ids, token = [], None
    while True:
        page = youtube("playlistItems", part="contentDetails", playlistId=uploads_playlist, maxResults=50,
                       **({"pageToken": token} if token else {}))
        ids += [item["contentDetails"]["videoId"] for item in page.get("items", [])]
        token = page.get("nextPageToken")
        if not token or (limit and len(ids) >= limit):
            break
    ids = ids[:limit] if limit else ids
    videos = []
    for i in range(0, len(ids), 50):
        page = youtube("videos", part="snippet,statistics", id=",".join(ids[i:i + 50]))
        videos += page.get("items", [])
    return videos


def best_thumbnail(snippet):
    thumbs = snippet.get("thumbnails") or {}
    for size in ("high", "medium", "standard", "default"):
        if size in thumbs:
            return thumbs[size]["url"]
    return None


# ---------- Supabase ----------

def db(path, method="GET", body=None, prefer=None):
    key = os.environ["SUPABASE_SECRET_KEY"]
    headers = {"apikey": key, "Content-Type": "application/json"}
    if key.startswith("eyJ"):  # older JWT-style keys also need this header
        headers["Authorization"] = f"Bearer {key}"
    if prefer:
        headers["Prefer"] = prefer
    return http_json(f"{SUPABASE_URL}/rest/v1/{path}", method=method, headers=headers, body=body)


def q(value):
    return urllib.parse.quote(str(value), safe="")


def next_id(table):
    rows = db(f"{table}?select=id&order=id.desc&limit=1")
    return (rows[0]["id"] if rows else 0) + 1


def insert_rows(table, rows, first_id=None):
    """Inserts rows; if the table has no automatic id, numbers them from first_id."""
    try:
        return db(table, method="POST", body=rows, prefer="return=representation")
    except RuntimeError as err:
        if "null value in column \"id\"" not in str(err):
            raise
        start = first_id or next_id(table)
        numbered = [{**row, "id": start + i} for i, row in enumerate(rows)]
        return db(table, method="POST", body=numbered, prefer="return=representation")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("channel", help="YouTube @handle, channel URL or channel ID")
    parser.add_argument("--specialty", required=True, help="e.g. Podiatrist")
    parser.add_argument("--state", default="", help="US state where the doctor practices, e.g. Ohio")
    parser.add_argument("--name", default="", help="Name to show on the site (defaults to the channel name)")
    parser.add_argument("--limit", type=int, default=0, help="Only the newest N videos (0 = all)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be added without saving")
    args = parser.parse_args()

    for var in ("YOUTUBE_API_KEY", "SUPABASE_SECRET_KEY"):
        if not os.environ.get(var):
            fail(f"{var} is missing. Add it under GitHub > Settings > Secrets and variables > Actions.")

    channel = find_channel(args.channel)
    channel_id = channel["id"]
    snippet, stats = channel["snippet"], channel.get("statistics", {})
    name = args.name.strip() or snippet["title"]
    print(f"Channel: {snippet['title']} ({channel_id}), {stats.get('videoCount', '?')} videos, "
          f"{stats.get('subscriberCount', 'hidden')} subscribers")

    videos = channel_videos(channel["contentDetails"]["relatedPlaylists"]["uploads"], args.limit)
    print(f"Found {len(videos)} videos on YouTube")

    existing = db(f"doctors_final?select=id,%22Channel%20Name%22,status&%22Channel%20ID%22=eq.{q(channel_id)}")
    if args.dry_run:
        print(f"[dry run] Doctor {'already in database' if existing else 'would be added'}: {name}, "
              f"{args.specialty}, {args.state or 'no state'}")
        for v in videos[:10]:
            print("  -", v["snippet"]["title"])
        return

    if existing:
        doctor_id = existing[0]["id"]
        print(f"Doctor already in database (id {doctor_id}, status {existing[0].get('status')}); adding new videos only")
    else:
        doctor = {
            "Channel Name": name,
            "Channel ID": channel_id,
            "Channel URL": f"https://www.youtube.com/channel/{channel_id}",
            "Subscribers": stats.get("subscriberCount"),
            "Video Count": int(stats["videoCount"]) if stats.get("videoCount") else None,
            "Specialty": args.specialty,
            "Description": (snippet.get("description") or "")[:2000],
            "Date Added": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "State": args.state,
            "country": "US" if args.state else None,
            "profile_image_url": best_thumbnail(snippet),
            "status": "approved",
        }
        doctor_id = insert_rows("doctors_final", [{**doctor, "id": next_id("doctors_final")}])[0]["id"]
        print(f"Added doctor: {name} (id {doctor_id})")

    have = set()
    ids = [v["id"] for v in videos]
    for i in range(0, len(ids), 100):
        chunk = ",".join(q(x) for x in ids[i:i + 100])
        have |= {r["youtube_video_id"] for r in db(f"videos?select=youtube_video_id&youtube_video_id=in.({chunk})")}

    now = datetime.now(timezone.utc).isoformat()
    rows = [{
        "doctor_id": doctor_id,
        "youtube_video_id": v["id"],
        "title": v["snippet"]["title"],
        "description": (v["snippet"].get("description") or "")[:5000],
        "published_at": v["snippet"].get("publishedAt"),
        "thumbnail_url": best_thumbnail(v["snippet"]),
        "view_count": int(v.get("statistics", {}).get("viewCount", 0) or 0),
        "created_at": now,
    } for v in videos if v["id"] not in have]

    added = 0
    first_id = None
    for i in range(0, len(rows), 200):
        batch = rows[i:i + 200]
        saved = insert_rows("videos", batch, first_id)
        added += len(saved or [])
        if saved and "id" in saved[-1]:
            first_id = saved[-1]["id"] + 1
    print(f"Added {added} new videos ({len(have)} were already there). Done.")


if __name__ == "__main__":
    main()
