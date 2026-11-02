"""Suggests a US state for doctors whose state is missing, using what their YouTube channel says about itself.

Runs from GitHub (Actions tab > "Find missing doctor states" > Run workflow), or locally:
    YOUTUBE_API_KEY=... SUPABASE_SECRET_KEY=... python3 tools/find_states.py            # list suggestions only
    YOUTUBE_API_KEY=... SUPABASE_SECRET_KEY=... python3 tools/find_states.py --apply sure
    YOUTUBE_API_KEY=... SUPABASE_SECRET_KEY=... python3 tools/find_states.py --apply 12,45,80

It reads the channel description, the channel's country setting and the descriptions of its newest videos,
and looks for a state name ("Texas") or a "City, ST" address ("Columbus, OH 43215"). It never guesses:
a doctor with no clear clue, clues pointing to different states, or a channel set to another country
is listed but left blank. Nothing is saved unless --apply is given.
Only the Python standard library is used.
"""
import argparse
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from import_channel import db, fail, q, youtube  # noqa: E402

STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California", "CO": "Colorado",
    "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana",
    "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York", "NC": "North Carolina",
    "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania",
    "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
    "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming",
}
STATE_NAMES = set(STATES.values())

# Longest names first so "West Virginia" wins over "Virginia". Names must be capitalised as written.
NAME_RE = re.compile(r"\b(" + "|".join(sorted(map(re.escape, STATE_NAMES), key=len, reverse=True)) + r")\b")
# Phrases that contain a state name but don't mean the state.
NOT_A_STATE_RE = re.compile(r"Washington,? D\.?C\.?|George Washington|Washington Post|Kansas City|"
                            r"Indiana Jones|Georgia,? (?:the )?country|Tbilisi|New York Times|New Mexico State")
# "Columbus, OH" or "Columbus, OH 43215". Some also look like letters after a name ("Jane Smith, MD",
# "John Doe, PA-C", "Lachlan Crawford, ND", "Amy Lee, MS"), so those only count when a ZIP code follows.
ABBR_RE = re.compile(r"\b[A-Z][a-zA-Z.]+(?: [A-Z][a-zA-Z.]+)*, ([A-Z]{2})(?:\s+(\d{5}))?\b(?!-)")
NEEDS_ZIP = {"MD", "PA", "DE", "IN", "ME", "OR", "OK", "HI", "CO", "MA", "MS", "ND", "MT"}

VIDEOS_TO_READ = 15


def clues(text):
    """Returns [(state, snippet)] for each place in the text that names a US state."""
    text = text or ""
    blanked = NOT_A_STATE_RE.sub(lambda m: " " * len(m.group(0)), text)
    found = []
    for m in NAME_RE.finditer(blanked):
        found.append((m.group(1), snippet(text, m.start(), m.end())))
    for m in ABBR_RE.finditer(blanked):
        abbr, zip_code = m.group(1), m.group(2)
        if abbr in STATES and (zip_code or abbr not in NEEDS_ZIP):
            found.append((STATES[abbr], snippet(text, m.start(), m.end())))
    return found


def snippet(text, start, end, pad=40):
    s = text[max(0, start - pad):end + pad]
    return re.sub(r"\s+", " ", s).strip()


def decide(country, channel_text, video_texts):
    """Returns (state or None, 'sure' | 'check' | reason it was left blank, evidence)."""
    channel_hits = clues(channel_text)
    video_hits = [hit for text in video_texts for hit in {s: (s, e) for s, e in clues(text)}.values()]
    score = Counter()
    for state, _ in channel_hits:
        score[state] += 3
    for state, _ in video_hits:
        score[state] += 1
    evidence = {state: ev for state, ev in video_hits + channel_hits}  # channel wording wins

    if not score:
        if country and country != "US":
            return None, f"outside the US (channel country: {country})", ""
        return None, "no clue found", ""
    ranked = score.most_common()
    top, top_score = ranked[0]
    if len(ranked) > 1 and ranked[1][1] * 2 > top_score:
        others = ", ".join(s for s, _ in ranked[:3])
        return None, f"unclear: mentions {others}", evidence[top]
    if country and country != "US":
        return None, f"unclear: mentions {top} but channel country is {country}", evidence[top]

    from_channel = any(s == top for s, _ in channel_hits)
    video_count = sum(1 for s, _ in video_hits if s == top)
    sure = from_channel or video_count >= 3
    return top, "sure" if sure else "check", evidence[top]


# ---------- Data ----------

def missing_state_doctors():
    rows, start = [], 0
    while True:
        page = db(f"doctors_final?select=id,%22Channel%20Name%22,%22Channel%20ID%22,%22Channel%20URL%22,"
                  f"%22Description%22,%22State%22,status&order=id&offset={start}&limit=1000")
        rows += page or []
        if not page or len(page) < 1000:
            break
        start += 1000

    def has_state(raw):
        value = (raw or "").strip()
        return value.title() in STATE_NAMES or value.upper() in STATES

    return [r for r in rows if r.get("status") != "hidden" and not has_state(r.get("State"))]


def channel_for(doc):
    for field in ("Channel ID", "Channel URL"):
        m = re.search(r"(UC[\w-]{22})", doc.get(field) or "")
        if m:
            items = youtube("channels", part="snippet,brandingSettings,contentDetails", id=m.group(1)).get("items")
            if items:
                return items[0]
    m = re.search(r"@+([\w.\-]+)", doc.get("Channel URL") or "")
    if m:
        items = youtube("channels", part="snippet,brandingSettings,contentDetails", forHandle="@" + m.group(1)).get("items")
        if items:
            return items[0]
    return None


def recent_video_descriptions(channel):
    uploads = channel.get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads")
    if not uploads:
        return []
    try:
        page = youtube("playlistItems", part="snippet", playlistId=uploads, maxResults=VIDEOS_TO_READ)
    except RuntimeError:
        return []
    return [item["snippet"].get("description", "") for item in page.get("items", [])]


def analyse(doc):
    try:
        channel = channel_for(doc)
    except RuntimeError as err:
        return None, f"YouTube error: {str(err)[:80]}", ""
    stored = doc.get("Description") or ""
    if not channel:
        return decide(None, stored, [])
    snip = channel.get("snippet", {})
    country = snip.get("country") or channel.get("brandingSettings", {}).get("channel", {}).get("country")
    channel_text = (snip.get("description") or "") + "\n" + stored
    return decide(country, channel_text, recent_video_descriptions(channel))


# ---------- Report ----------

def cell(text):
    return str(text or "").replace("|", "/").replace("\n", " ")


def write_summary(lines):
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        with open(path, "a", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", default="", help="'sure' to save every sure suggestion, or doctor IDs like 12,45,80")
    args = parser.parse_args()
    for var in ("YOUTUBE_API_KEY", "SUPABASE_SECRET_KEY"):
        if not os.environ.get(var):
            fail(f"{var} is missing. Add it under GitHub > Settings > Secrets and variables > Actions.")

    apply = args.apply.strip().lower()
    chosen_ids = {int(x) for x in re.findall(r"\d+", apply)} if apply and apply != "sure" else set()

    doctors = missing_state_doctors()
    print(f"{len(doctors)} doctors have no state. Reading their YouTube channels...\n")
    results = []
    for doc in doctors:
        state, verdict, evidence = analyse(doc)
        results.append((doc, state, verdict, evidence))
        name = doc.get("Channel Name") or "?"
        print(f"{doc['id']:>5}  {name[:40]:<40}  {state or '-':<15} {verdict}" + (f'  "{evidence}"' if evidence else ""))

    to_save = [(d, s) for d, s, v, _ in results if s and ((apply == "sure" and v == "sure") or d["id"] in chosen_ids)]
    for doc, state in to_save:
        db(f"doctors_final?id=eq.{q(doc['id'])}", method="PATCH", body={"State": state, "country": "US"},
           prefer="return=minimal")

    sure = sum(1 for _, s, v, _ in results if v == "sure")
    check = sum(1 for _, s, v, _ in results if v == "check")
    blank = len(results) - sure - check
    lines = [
        "## Missing doctor states",
        f"**{len(results)}** doctors have no state: **{sure}** sure suggestions, **{check}** to check, "
        f"**{blank}** left blank.",
        "",
        f"**Saved {len(to_save)} states.**" if apply else
        "_Nothing was saved. To save, run again and type `sure` (all sure ones) or doctor IDs like `12,45,80`._",
        "",
        "| ID | Doctor | Suggested state | Sure? | What the channel says |",
        "|---|---|---|---|---|",
    ]
    order = {"sure": 0, "check": 1}
    for doc, state, verdict, evidence in sorted(results, key=lambda r: (order.get(r[2], 2), r[0]["id"])):
        lines.append(f"| {doc['id']} | {cell(doc.get('Channel Name'))} | {state or '-'} | "
                     f"{'yes' if verdict == 'sure' else 'check' if verdict == 'check' else cell(verdict)} | "
                     f"{cell(evidence)} |")
    write_summary(lines)
    print(f"\nSure: {sure}  To check: {check}  Left blank: {blank}  Saved: {len(to_save)}")


if __name__ == "__main__":
    main()
