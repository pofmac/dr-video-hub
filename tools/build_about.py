"""Builds about.html ("About us & how we write our pages") for DoctorsVideos.video. Run:
    python3 tools/build_about.py
"""
from build_questions import APP, UPDATED, page_head, site_header, site_footer


def build_about():
    schema = {"@context": "https://schema.org", "@type": "AboutPage", "name": "About DoctorsVideos.video",
              "url": "https://www.doctorsvideos.video/about.html"}
    out = [page_head("About Us & How We Write Our Pages | DoctorsVideos.video",
                     "Who runs DoctorsVideos.video, how doctors and videos are chosen, how our written pages are "
                     "made and checked, and how the site is paid for.", "about.html", schema), site_header()]
    out.append("""
    <main class="page-main about-page" style="max-width:760px">
        <h1 class="page-title">About us &amp; how we write our pages</h1>
        <p class="qa-text">DoctorsVideos.video brings together free educational videos that doctors publish on
        YouTube, so you can hear different doctors' views on a health question and then talk it over with your own
        doctor. It's an independent website. We are not doctors, and nothing here is medical advice.</p>

        <h2>How doctors and videos are chosen</h2>
        <ul class="qa-list-plain about-list">
            <li><strong>Real doctors, their own words.</strong> We list doctors and other qualified health experts who
            run public YouTube channels. The videos and the views in them are the doctors' own, and doctors often
            disagree with each other.</li>
            <li><strong>Never ranked.</strong> Doctors are listed A to Z or by date. We don't rate, rank, recommend or
            endorse any doctor, diet or product.</li>
            <li><strong>Both sides.</strong> Where doctors disagree, we try to show more than one view so you can
            compare them.</li>
            <li><strong>Removals.</strong> Doctors can ask to be removed, and we hide channels that aren't in English or
            don't fit the site.</li>
        </ul>

        <h2 id="how-we-write">How we write our pages</h2>
        <p class="qa-text">Our Health Questions pages and specialty guides are written by DoctorsVideos.video, not by
        the doctors in the videos.</p>
        <ul class="qa-list-plain about-list">
            <li><strong>Trusted sources.</strong> They're based on medical guidelines, major medical organizations and
            published studies, and each one lists its main sources at the bottom.</li>
            <li><strong>Honest about the evidence.</strong> We say when studies are small, short or missing, and we
            include safety warnings, such as when fasting is risky with diabetes medicines.</li>
            <li><strong>How pages are made.</strong> Pages are researched and drafted with the help of AI writing tools,
            then checked against the sources listed on each page before they are published.</li>
            <li><strong>Medical review.</strong> Our pages have not yet been reviewed by a doctor. We plan to add a
            medical reviewer, and when we do, their name and qualifications will appear on the pages they check.</li>
            <li><strong>Kept up to date.</strong> Each page shows when it was last reviewed, and we update pages when
            guidance changes or someone points out a mistake.</li>
        </ul>

        <h2>How the site is paid for</h2>
        <p class="qa-text">The site shows advertising and offers sponsored listings. Anything paid for is clearly
        labeled as an ad or sponsored. Payment never changes what our pages say or the order doctors are listed in.
        If we ever earn a commission from a link, such as to a book, we'll say so on that page.</p>

        <h2>Corrections</h2>
        <p class="qa-text">If you spot a mistake, or you're a doctor who would like your details changed or removed,
        please let us know and we'll fix it promptly.</p>

        <p class="qa-safety" style="margin-top:20px"><strong>In an emergency call 911.</strong> For a mental health
        crisis, call or text 988.</p>
        <p class="qa-updated">Last reviewed """ + UPDATED + """.</p>
    </main>
""")
    out.append(site_footer([]))
    (APP / "about.html").write_text("".join(out))


if __name__ == "__main__":
    build_about()
    print("Built about.html")
