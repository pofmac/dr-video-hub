"""Builds the specialty guide pages (Hip & Knee, Foot & Ankle) for DoctorsVideos.video.

Each guide explains the common problems in plain words; guide.js then adds doctor videos for each
section (matched by video title) and the doctors in that specialty. Edit the text below, then run:
    python3 tools/build_guides.py
"""
from build_questions import APP, UPDATED, esc, page_head, site_header, site_footer
import json

GUIDES = [
    {
        "slug": "hip-and-knee",
        "title": "Hip & Knee",
        "icon": "🦵",
        "lede": "Arthritis, joint replacement, sports injuries and everyday hip and knee pain, explained in plain "
                "words with videos from many different doctors.",
        "doctor_terms": ["orthoped", "sports med", "joint", "physical therap", "physiotherap"],
        # A video must mention one of these (or come from a doctor above) to appear on this page.
        "scope_terms": ["knee", "hip", "acl", "meniscus", "joint replacement"],
        "doctor_label": "Orthopedic, sports medicine and physical therapy doctors",
        "sections": [
            {"id": "knee-arthritis", "title": "Knee arthritis",
             "terms": ["knee arthritis", "knee osteoarthritis", "arthritis in the knee", "arthritic knee", "bone on bone"],
             "text": "Osteoarthritis is wear of the smooth cartilage that lines the knee. It causes pain, stiffness "
                     "and sometimes swelling, often worse after activity. Treatment usually starts with exercise "
                     "and physical therapy, losing extra weight, pain relievers and sometimes injections. Knee "
                     "replacement is considered when pain still limits daily life despite these."},
            {"id": "knee-replacement", "title": "Knee replacement",
             "terms": ["knee replacement", "total knee", "partial knee", "tka", "knee surgery"],
             "text": "In a knee replacement, the worn joint surfaces are replaced with metal and plastic parts. It's "
                     "one of the most common operations, and most people have much less pain afterwards. Recovery "
                     "takes months, and physical therapy exercises make a big difference to the result."},
            {"id": "acl-meniscus", "title": "ACL and meniscus tears",
             "terms": ["acl", "meniscus", "torn cartilage", "ligament tear", "mcl"],
             "text": "ACL tears often happen when pivoting or landing in sports. Not everyone needs surgery; it "
                     "depends on how stable the knee feels and how active you want to be. In middle-aged and older "
                     "adults, many meniscus tears are part of normal wear, and studies show physical therapy often "
                     "works as well as keyhole surgery."},
            {"id": "knee-pain", "title": "Everyday knee pain",
             "terms": ["knee pain", "runner's knee", "patellofemoral", "kneecap", "knee cap", "jumper's knee", "it band"],
             "text": "Pain around or behind the kneecap is very common, especially in runners and people who climb "
                     "stairs or squat a lot. Strengthening the thigh and hip muscles and easing back on the painful "
                     "activity for a while often helps."},
            {"id": "hip-arthritis", "title": "Hip arthritis",
             "terms": ["hip arthritis", "hip osteoarthritis", "arthritis in the hip", "arthritic hip"],
             "text": "Hip arthritis usually causes pain in the groin or front of the hip, stiffness, and trouble "
                     "with shoes and socks. Like knee arthritis, treatment starts with exercise, physical therapy, "
                     "weight loss if needed and pain relief, with replacement for pain that stays severe."},
            {"id": "hip-replacement", "title": "Hip replacement",
             "terms": ["hip replacement", "total hip", "anterior approach", "posterior approach", "hip surgery"],
             "text": "Hip replacement is one of the most successful operations in medicine for relieving pain. "
                     "Surgeons use different approaches (front or back of the hip); each has pros and cons, and "
                     "long-term results are broadly similar. Ask your surgeon which they use and why."},
            {"id": "hip-pain", "title": "Hip pain and bursitis",
             "terms": ["hip pain", "hip bursitis", "trochanteric", "labral", "labrum", "hip flexor", "piriformis"],
             "text": "Pain on the outside of the hip is often from irritated tendons and the bursa there, not "
                     "arthritis, and usually improves with targeted exercises. Groin pain is more likely to come "
                     "from the joint itself, such as arthritis or a labral tear."},
        ],
        "urgent": "Get help the same day if a joint is hot, red and swollen with a fever, if you can't put weight "
                  "on your leg after an injury, or if the leg looks deformed. After joint surgery, call your surgeon "
                  "about fever, wound drainage, or new calf pain or swelling. Chest pain or sudden shortness of "
                  "breath after surgery: call 911.",
    },
    {
        "slug": "foot-and-ankle",
        "title": "Foot & Ankle",
        "icon": "🦶",
        "lede": "Heel pain, bunions, ankle sprains, flat feet and the right shoes, explained in plain words with "
                "videos from foot and ankle doctors.",
        "doctor_terms": ["podiat", "foot", "ankle"],
        "scope_terms": ["foot", "feet", "heel", "toe", "ankle", "plantar", "bunion", "achilles", "shoe", "sneaker", "arches"],
        "doctor_label": "Foot and ankle doctors (podiatrists)",
        "sections": [
            {"id": "heel-pain", "title": "Plantar fasciitis and heel pain",
             "terms": ["plantar fasciitis", "plantar fascia", "heel pain", "heel spur", "plantar"],
             "text": "Plantar fasciitis is the most common cause of heel pain: sharp pain under the heel, often worst "
                     "with the first steps in the morning. Most people get better without surgery using stretching, "
                     "supportive shoes or inserts, and time. It can take several months."},
            {"id": "bunions", "title": "Bunions and big toe pain",
             "terms": ["bunion", "hallux", "big toe", "turf toe"],
             "text": "A bunion is a bony bump at the base of the big toe as the toe drifts toward the others. Wider "
                     "shoes and padding often ease the pain. Surgery is for bunions that stay painful despite "
                     "shoe changes; it isn't done just for looks."},
            {"id": "ankle", "title": "Ankle sprains and weak ankles",
             "terms": ["ankle sprain", "sprained ankle", "rolled ankle", "ankle instability", "ankle pain", "ankle"],
             "text": "Most ankle sprains heal with a short rest, compression and then balance and strengthening "
                     "exercises, which also help prevent the next sprain. See a doctor if you can't walk four steps, "
                     "or if there's pain right on the ankle bones."},
            {"id": "achilles", "title": "Achilles tendon problems",
             "terms": ["achilles"],
             "text": "Achilles tendinopathy causes pain and stiffness in the tendon above the heel, especially in "
                     "runners. Slow, gradually harder calf exercises are the main treatment. A sudden snap or feeling "
                     "of being kicked in the back of the leg can mean a rupture and needs prompt care."},
            {"id": "flat-feet", "title": "Flat feet and arch pain",
             "terms": ["flat feet", "flat foot", "fallen arch", "arch pain", "arch support", "orthotic", "insole"],
             "text": "Many people with flat feet have no problems at all. When flat feet or high arches do cause "
                     "pain, supportive shoes, inserts and foot and ankle strengthening often help."},
            {"id": "toenails", "title": "Toenail problems",
             "terms": ["ingrown", "toenail", "nail fungus", "toe nail"],
             "text": "Ingrown toenails and nail fungus are among the most common foot problems. People with diabetes "
                     "or poor circulation should have a foot doctor treat nail problems rather than cutting at home."},
            {"id": "neuropathy", "title": "Numbness, neuropathy and diabetic feet",
             "terms": ["neuropathy", "numb", "tingling", "burning feet", "diabetic foot", "diabetic feet"],
             "text": "Neuropathy is nerve damage that causes numbness, tingling or burning, often from diabetes. "
                     "Because you may not feel an injury, check your feet every day and see a doctor quickly about "
                     "any sore, blister or color change."},
            {"id": "shoes", "title": "Choosing shoes",
             "terms": ["shoe", "shoes", "sneaker", "running shoe", "boots", "sandals"],
             "text": "The right shoe depends on your foot and activity. Foot doctors often review shoes in their "
                     "videos; these are their personal opinions, and we don't endorse any brand."},
        ],
        "urgent": "Get help the same day for a foot that is red, hot and swollen, especially with diabetes; a wound "
                  "that isn't healing; sudden severe pain after an injury; or a foot that turns pale, blue or cold.",
    },
]


def build_guide(g):
    schema = {"@context": "https://schema.org", "@type": "MedicalWebPage", "name": f"{g['title']}: What Doctors Say",
              "url": f"https://doctorsvideos.video/{g['slug']}.html", "about": [s["title"] for s in g["sections"]]}
    title = f"{g['title']} Pain and Surgery: Videos From Many Doctors | DoctorsVideos.video"
    desc = g["lede"][:160]
    out = [page_head(title, desc, g["slug"] + ".html", schema), site_header()]
    jump = "".join(f'<a class="topic-chip" href="#{s["id"]}">{esc(s["title"])}</a>' for s in g["sections"])
    jump += '<a class="topic-chip" href="#doctors">Doctors</a>'
    out.append(f"""
    <header class="page-hero">
        <div class="page-hero-inner">
            <p class="breadcrumb"><a href="topics.html">← All health topics</a></p>
            <p class="section-kicker">Specialty guide</p>
            <h1 class="page-title">{g['icon']} {esc(g['title'])}</h1>
            <p class="page-lede">{esc(g['lede'])}</p>
            <nav class="category-jump" aria-label="Jump to a section">{jump}</nav>
        </div>
    </header>

    <main class="page-main">
        <div class="topic-layout">
            <div class="topic-content guide-page" data-scope="{esc(json.dumps(g['scope_terms']))}">
""")
    for s in g["sections"]:
        out.append(f"""
                <section class="qa-section" id="{s['id']}">
                    <h2>{esc(s['title'])}</h2>
                    <p class="qa-text">{esc(s['text'])}</p>
                    <div class="guide-videos" data-terms="{esc(json.dumps(s['terms']))}"><div class="video-grid"></div></div>
                </section>
""")
    out.append(f"""
                <section class="qa-section" id="when-to-get-help">
                    <h2>When to get help quickly</h2>
                    <p class="qa-safety">{esc(g['urgent'])}</p>
                </section>

                <section class="qa-section" id="doctors">
                    <h2>{esc(g['doctor_label'])}</h2>
                    <p class="section-note">Listed A to Z because they publish educational videos, not because we rank
                    or recommend them.</p>
                    <div class="doctor-grid" id="guide-doctors" data-terms="{esc(json.dumps(g['doctor_terms']))}"><p class="page-status">Loading doctors...</p></div>
                </section>

                <p class="qa-updated">Written by DoctorsVideos.video as a general guide, not by the doctors in the videos.
                For education only; it isn't medical advice. Last updated {UPDATED}.</p>
            </div>
            <aside class="topic-aside">
                <div class="ad-slot ad-box" data-ad-slot="topic-sponsor"></div>
            </aside>
        </div>
    </main>
""")
    out.append(site_footer(["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", "common.js", "ads.js", "guide.js"]))
    (APP / (g["slug"] + ".html")).write_text("".join(out))


if __name__ == "__main__":
    for g in GUIDES:
        build_guide(g)
    print("Built", ", ".join(g["slug"] + ".html" for g in GUIDES))
