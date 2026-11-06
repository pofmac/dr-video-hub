"""Writes DoctorsVideos_App/site-stats.json: the home page's numbers (doctors, videos, specialties, doctors per
state or country, videos per doctor), counted exactly the way app.js used to count them in the visitor's browser.
The home page reads this small file first, so the stats and state list show at once instead of waiting for every
doctor and video to download.

Rebuilt daily and after doctors are added (GitHub > Actions > "Update home page counts"), or locally:
    SUPABASE_SECRET_KEY=... python3 tools/build_stats.py
Only reads from the database. Only the Python standard library is used.
"""
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from find_states import STATE_NAMES, STATES  # noqa: E402
from import_channel import db, fail  # noqa: E402

OUT = Path(__file__).resolve().parent.parent / "DoctorsVideos_App" / "site-stats.json"

# Same rules as common.js: VISIBLE_DOCTOR_FILTER, isEnglishFriendlyVideo, normalizeState and doctorLocation.
VISIBLE_DOCTORS = "or=(status.is.null,status.not.in.(pending,hidden))"
INDIC_SCRIPT = re.compile("[ऀ-෿]")
US_COUNTRY = re.compile(r"^(us|usa|u\.s\.a?\.?|united states( of america)?)$", re.I)
LOCATION_UNLISTED = "Location not listed"


def all_rows(path):
    """Supabase returns at most 1,000 rows per request, so page through the table."""
    rows, start = [], 0
    while True:
        page = db(f"{path}&order=id&offset={start}&limit=1000") or []
        rows += page
        if len(page) < 1000:
            return rows
        start += 1000


def normalize_state(raw):
    value = str(raw or "").strip()
    if not value:
        return LOCATION_UNLISTED
    for name in STATE_NAMES:
        if name.lower() == value.lower():
            return name
    return STATES.get(value.upper(), LOCATION_UNLISTED)


def location(doc):
    """('state', 'Texas'), ('country', 'CA') or ('unlisted', None). The page turns country codes into names."""
    raw_state = doc.get("State") if doc.get("State") is not None else doc.get("state")
    state = normalize_state(raw_state)
    if state != LOCATION_UNLISTED:
        return "state", state
    country = str(doc.get("country") or "").strip()
    if country and not US_COUNTRY.match(country):
        return "country", country
    return "unlisted", None


def main():
    if not os.environ.get("SUPABASE_SECRET_KEY"):
        fail("SUPABASE_SECRET_KEY is missing. Add it under GitHub > Settings > Secrets and variables > Actions.")

    doctors = all_rows(f"doctors_final?select=*&{VISIBLE_DOCTORS}")
    videos = all_rows("videos?select=doctor_id,title")

    visible_ids = {d["id"] for d in doctors}
    videos_by_doctor = {doc_id: 0 for doc_id in visible_ids}
    for v in videos:
        if v.get("doctor_id") in visible_ids and not INDIC_SCRIPT.search(v.get("title") or ""):
            videos_by_doctor[v["doctor_id"]] += 1

    states, countries, unlisted = {}, {}, 0
    for doc in doctors:
        kind, place = location(doc)
        if kind == "state":
            states[place] = states.get(place, 0) + 1
        elif kind == "country":
            countries[place] = countries.get(place, 0) + 1
        else:
            unlisted += 1

    specialties = {doc.get("Specialty") or doc.get("specialty") or "Medical Expert" for doc in doctors}
    now = datetime.now(timezone.utc)
    stats = {
        "as_of": now.strftime("%Y-%m-%d"),
        "generated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "doctors": len(doctors),
        "videos": sum(videos_by_doctor.values()),
        "specialties": len(specialties),
        "states": dict(sorted(states.items())),
        "countries": dict(sorted(countries.items())),
        "unlisted": unlisted,
        "videos_by_doctor": {str(k): n for k, n in sorted(videos_by_doctor.items())},
    }
    OUT.write_text(json.dumps(stats, separators=(",", ":")) + "\n")
    print(f"Wrote {OUT.name}: {stats['doctors']} doctors, {stats['videos']} videos, {stats['specialties']} specialties, "
          f"{len(states)} states, {len(countries)} other countries, {unlisted} without a location "
          f"({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
