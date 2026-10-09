"""Builds the "Health Questions" pages for DoctorsVideos.video.

One page per condition answers "Does <diet> reverse <condition>?" for five diets, plus a hub page
(questions.html) and a page on gaining weight on a calorie deficit.

Edit the text below, then run from the repo root:
    python3 tools/build_questions.py
The pages are written into DoctorsVideos_App/. Doctor videos are added in the browser by question.js.
"""
import html
import json
import re
from pathlib import Path

from sources import CALORIE_SOURCES, CONDITION_SOURCES, DIET_STUDIES, sources_section

APP = Path(__file__).resolve().parent.parent / "DoctorsVideos_App"
UPDATED = "October 2026"

DIETS = [
    {
        "id": "intermittent-fasting", "name": "intermittent fasting", "title": "Intermittent Fasting",
        "terms": ["intermittent fasting", "fasting", "5:2"],
        "about": "Intermittent fasting means going without food for set periods, for example the 5:2 plan "
                 "(two low-calorie days a week) or eating every other day. It mostly works by cutting calories "
                 "overall, and in most trials it leads to about the same weight loss as ordinary calorie cutting.",
        "safety": "Fasting isn't safe for everyone. Talk to your doctor first if you take insulin or other diabetes "
                  "medicines (they can cause dangerous low blood sugar when you fast), are pregnant or "
                  "breastfeeding, have had an eating disorder, or are under 18.",
    },
    {
        "id": "keto", "name": "the ketogenic (keto) diet", "title": "the Keto Diet",
        "terms": ["keto", "ketogenic", "ketosis"],
        "about": "A ketogenic diet is very low in carbohydrate, usually under 20 to 50 grams a day, so the body "
                 "burns more fat and makes ketones. It lowers blood sugar quickly. It can raise LDL cholesterol in "
                 "some people, and many find it hard to keep up for a long time.",
        "safety": "Talk to your doctor first if you take diabetes medicines (insulin and some pills can cause low "
                  "blood sugar, and SGLT2 medicines such as Jardiance or Farxiga can cause a rare but serious "
                  "problem called ketoacidosis on keto), take blood pressure medicine, have kidney or liver "
                  "disease, or are pregnant.",
    },
    {
        "id": "low-carb", "name": "a low-carb diet", "title": "a Low-Carb Diet",
        "terms": ["low carb", "low-carb", "carbs", "carbohydrate"],
        "about": "A low-carb diet cuts back on sugar, bread, rice, pasta and other starches, usually to under about "
                 "130 grams of carbohydrate a day, without going as low as keto. The American Diabetes Association "
                 "lists it as one of several healthy eating patterns for people with diabetes.",
        "safety": "If you take insulin or other medicines that lower blood sugar, cutting carbs can cause low blood "
                  "sugar. Ask your doctor whether your doses need to change before you start.",
    },
    {
        "id": "time-restricted-eating", "name": "time-restricted eating", "title": "Time-Restricted Eating",
        "terms": ["time restricted", "time-restricted", "eating window", "16:8", "omad", "one meal a day"],
        "about": "Time-restricted eating means eating all your food within a set window each day, such as 8 or 10 "
                 "hours (16:8 is a common version). It's a type of intermittent fasting. Some people eat less "
                 "without counting calories, but in larger trials it gave about the same results as simply eating "
                 "fewer calories.",
        "safety": "Talk to your doctor first if you take insulin or other diabetes medicines, are pregnant or "
                  "breastfeeding, or have had an eating disorder.",
    },
    {
        "id": "carnivore", "name": "the carnivore diet", "title": "the Carnivore Diet",
        "terms": ["carnivore", "all meat", "meat only", "meat-only"],
        "about": "A carnivore diet means eating only animal foods: meat, fish, eggs and sometimes dairy, with no "
                 "plants. Because it has almost no carbohydrate, it lowers blood sugar. But there are almost no "
                 "clinical trials on it; most of what we know comes from personal stories and surveys. Doctors "
                 "raise concerns about LDL cholesterol, the lack of fiber, and long-term effects nobody has studied.",
        "safety": "Talk to your doctor first, especially if you have high cholesterol, heart disease, kidney disease "
                  "or gout, or take diabetes medicines. Ask about checking your cholesterol after a few months.",
    },
]

CONDITIONS = [
    {
        "slug": "can-diet-reverse-insulin-resistance", "name": "insulin resistance", "title": "Insulin Resistance",
        "terms": ["insulin resistance", "insulin resistant", "insulin"],
        "icon": "🩸", "tint": "tint-rose",
        "lede": "Insulin resistance often has no symptoms, and it can lead to prediabetes and type 2 diabetes. "
                "Here's what the research says about five popular diets.",
        "about": "Insulin resistance means your body's cells don't respond well to insulin, the hormone that moves "
                 "sugar from your blood into your cells, so the pancreas has to make more of it. Doctors usually "
                 "spot it through blood sugar tests, waist size, triglycerides and blood pressure. Losing extra "
                 "weight, being more active and sleeping well all improve it in studies, so for many people it can "
                 "get much better.",
        "answers": {
            "intermittent-fasting": "It can help. Studies show intermittent fasting improves insulin sensitivity, "
                "mostly by helping people lose weight, and about as much as ordinary calorie cutting.",
            "keto": "It can help. Keto lowers insulin levels quickly, and studies show better insulin sensitivity, "
                "especially when people lose weight. Long-term results are less clear.",
            "low-carb": "Often, yes. Eating fewer carbs lowers blood sugar and insulin after meals, and studies show "
                "insulin resistance improves, mostly alongside weight loss.",
            "time-restricted-eating": "Possibly. A small study found that eating within an early 6-hour window "
                "improved insulin sensitivity even without weight loss, but larger trials show mixed results.",
            "carnivore": "Nobody knows yet. Cutting carbs to nearly zero lowers insulin, but there are no proper "
                "clinical trials of the carnivore diet for insulin resistance.",
        },
    },
    {
        "slug": "can-diet-reverse-type-2-diabetes", "name": "type 2 diabetes", "title": "Type 2 Diabetes",
        "terms": ["type 2 diabetes", "diabetes", "diabetic", "blood sugar", "a1c"],
        "icon": "🩸", "tint": "tint-rose",
        "lede": "Some people can put type 2 diabetes into remission. Here's what the research says about five "
                "popular diets, and why you should never change diabetes medicine on your own.",
        "about": "Type 2 diabetes means blood sugar stays too high because the body doesn't use insulin well and, "
                 "over time, may not make enough. Doctors now talk about \"remission\": an A1c below the diabetes "
                 "range for at least 3 months without diabetes medicine. Remission is more likely soon after "
                 "diagnosis and with real weight loss. In a large UK study (DiRECT), about half of the people on a "
                 "structured weight-loss program were in remission after a year.",
        "answers": {
            "intermittent-fasting": "It may help some people reach remission. Small trials of intermittent fasting "
                "have reported remission in some people, usually along with weight loss. Fasting while on "
                "diabetes medicine can cause dangerous low blood sugar, so it must be supervised.",
            "keto": "It can lower blood sugar and A1c a lot, and some people reach remission, mostly in programs "
                "with close medical supervision. Medicines usually need to be adjusted before starting.",
            "low-carb": "It can lower A1c and reduce the need for medicine, and the American Diabetes Association "
                "accepts it as one option. Remission is more likely with weight loss and a recent diagnosis.",
            "time-restricted-eating": "The evidence is limited. Small studies show modest improvements in blood "
                "sugar and weight; it hasn't been shown to cause remission on its own.",
            "carnivore": "Nobody knows yet. Some people report lower blood sugar, but there are no clinical trials. "
                "Eating almost no carbs while on insulin or sulfonylureas can cause dangerous lows.",
        },
    },
    {
        "slug": "can-diet-reverse-prediabetes", "name": "prediabetes", "title": "Prediabetes",
        "terms": ["prediabetes", "pre-diabetes", "prediabetic", "blood sugar", "insulin resistance"],
        "icon": "🩸", "tint": "tint-amber",
        "lede": "Prediabetes is a warning sign, and many people bring their blood sugar back to normal. Here's what "
                "the research says about five popular diets.",
        "about": "Prediabetes means blood sugar is higher than normal but not yet in the diabetes range. It usually "
                 "has no symptoms. In the US Diabetes Prevention Program, people who lost about 7% of their weight "
                 "and exercised about 150 minutes a week cut their chance of getting type 2 diabetes by 58%. "
                 "Many people return to normal blood sugar.",
        "answers": {
            "intermittent-fasting": "It can help. Any approach that leads to weight loss lowers the risk of "
                "diabetes, and intermittent fasting works about as well as ordinary calorie cutting in trials.",
            "keto": "It can lower blood sugar, but it's usually more than people need. Prediabetes often improves "
                "with more moderate changes and losing around 7% of body weight.",
            "low-carb": "It can help. Eating fewer refined carbs lowers blood sugar after meals, and weight loss "
                "from any diet lowers the chance of getting diabetes.",
            "time-restricted-eating": "Possibly. A small study of men with prediabetes found that eating within an "
                "early 6-hour window improved insulin sensitivity and blood pressure. Larger studies are needed.",
            "carnivore": "Nobody knows yet. There are no trials of the carnivore diet for prediabetes. The proven "
                "approach, weight loss plus regular activity, is a safer first step.",
        },
    },
    {
        "slug": "can-diet-reverse-fatty-liver-disease", "name": "fatty liver disease", "title": "Fatty Liver Disease",
        "terms": ["fatty liver", "liver", "nafld", "masld"],
        "icon": "🫃", "tint": "tint-green",
        "lede": "Fatty liver is common, often silent, and can improve a lot with weight loss. Here's what the research "
                "says about five popular diets, and which diet is best.",
        "about": "Fatty liver disease (now often called MASLD) means extra fat builds up in the liver, not caused by "
                 "alcohol. It's very common and usually has no symptoms. In studies, losing about 5% of body weight "
                 "lowers liver fat, and losing 7 to 10% can reduce inflammation and scarring. No single diet has "
                 "been proven best: the amount of weight lost matters most, and cutting sugary drinks and alcohol "
                 "helps.",
        "answers": {
            "intermittent-fasting": "It can lower liver fat. Trials show intermittent fasting reduces liver fat, "
                "mostly by helping weight loss, about as much as ordinary calorie cutting.",
            "keto": "It can lower liver fat quickly. Short studies show large drops in liver fat within weeks on "
                "very low-carb diets. Long-term studies are lacking.",
            "low-carb": "It can help. Cutting sugar (especially sugary drinks) and refined carbs lowers liver fat, "
                "and weight loss is what matters most.",
            "time-restricted-eating": "Possibly. Some trials show less liver fat with time-restricted eating, but "
                "results are similar to ordinary calorie cutting.",
            "carnivore": "Nobody knows yet. No studies have tested the carnivore diet for fatty liver disease.",
        },
    },
    {
        "slug": "can-diet-reverse-metabolic-syndrome", "name": "metabolic syndrome", "title": "Metabolic Syndrome",
        "terms": ["metabolic syndrome", "metabolic health", "metabolic"],
        "icon": "⚖️", "tint": "tint-blue",
        "lede": "Metabolic syndrome is a group of health problems that often improve together. Here's what the "
                "research says about five popular diets, and how to improve it naturally.",
        "about": "Metabolic syndrome means having at least three of these: a large waist, high blood pressure, high "
                 "blood sugar, high triglycerides and low HDL (\"good\") cholesterol. About one in three US adults "
                 "has it. Because it's several problems together, improving it usually comes from weight loss, "
                 "regular activity and diet changes, and many people can move out of the metabolic syndrome range.",
        "answers": {
            "intermittent-fasting": "It can improve several parts of it, such as weight, waist size, blood pressure "
                "and triglycerides, mostly through weight loss.",
            "keto": "It can improve triglycerides, HDL, blood sugar and waist size, but it may raise LDL cholesterol "
                "in some people, which your doctor should check.",
            "low-carb": "It often improves triglycerides, HDL and blood sugar, which are key parts of metabolic "
                "syndrome.",
            "time-restricted-eating": "Possibly. A small study of people with metabolic syndrome who ate within a "
                "10-hour window found lower weight, waist size, blood pressure and cholesterol.",
            "carnivore": "Nobody knows yet. There are no trials. It may lower triglycerides and blood sugar, but its "
                "long-term effects on LDL cholesterol and the heart aren't known.",
        },
    },
    {
        "slug": "can-diet-reverse-visceral-fat", "name": "visceral fat", "title": "Visceral (Belly) Fat",
        "terms": ["visceral", "belly fat", "abdominal fat", "stomach fat"],
        "icon": "⚖️", "tint": "tint-amber",
        "lede": "Visceral fat is the deep belly fat most linked to heart disease and diabetes. Here's what the "
                "research says about five popular diets.",
        "about": "Visceral fat is stored deep in the belly, around the organs. It's more strongly linked to heart "
                 "disease and type 2 diabetes than fat under the skin. You can't choose where you lose fat, but "
                 "visceral fat often drops early when people lose weight, and exercise reduces it even without much "
                 "weight loss. A tape measure around the waist is a simple way to track it.",
        "answers": {
            "intermittent-fasting": "It can reduce visceral fat as part of overall fat loss; studies don't show it "
                "targets belly fat more than other diets.",
            "keto": "It can reduce visceral fat along with weight loss. Some studies suggest very low-carb diets may "
                "reduce belly fat slightly more, but the difference is small.",
            "low-carb": "It can help. Weight loss from low-carb eating reduces visceral fat, and some studies find a "
                "slightly bigger drop than with low-fat diets.",
            "time-restricted-eating": "Possibly, as part of weight loss. Studies show small reductions, similar to "
                "ordinary calorie cutting.",
            "carnivore": "Nobody knows yet. No studies have measured visceral fat on a carnivore diet.",
        },
    },
    {
        "slug": "can-diet-reverse-high-blood-pressure", "name": "high blood pressure", "title": "High Blood Pressure",
        "terms": ["blood pressure", "hypertension"],
        "icon": "❤️", "tint": "tint-rose",
        "lede": "High blood pressure often has no symptoms, and lifestyle changes can lower it. Here's what the "
                "research says about five popular diets.",
        "about": "High blood pressure (hypertension) usually has no symptoms but raises the risk of stroke and heart "
                 "disease. Changes with good evidence include losing extra weight (roughly 1 point lower for each "
                 "kilogram lost), eating less salt, the DASH eating pattern, more potassium-rich foods, less alcohol "
                 "and regular exercise. Some people can lower or stop medicine with their doctor's help, but never "
                 "stop blood pressure medicine on your own.",
        "answers": {
            "intermittent-fasting": "It may lower blood pressure a little, mainly through weight loss. If you take "
                "blood pressure medicine, your doctor may need to adjust it.",
            "keto": "It can lower blood pressure in the short term, partly from weight and water loss. Long-term "
                "evidence is limited, and salt still matters.",
            "low-carb": "It can lower it modestly, mainly with weight loss. The DASH eating pattern has the strongest "
                "evidence for blood pressure.",
            "time-restricted-eating": "Possibly, a little. Some small studies show lower blood pressure, but results "
                "are mixed.",
            "carnivore": "Nobody knows yet. There are no clinical trials, and processed meats like bacon and deli "
                "meat are high in salt, which raises blood pressure.",
        },
    },
    {
        "slug": "can-diet-reverse-pcos", "name": "PCOS", "title": "PCOS",
        "terms": ["pcos", "polycystic"],
        "icon": "🤰", "tint": "tint-violet",
        "lede": "PCOS is a common hormone condition, and diet and weight can affect symptoms. Here's what the "
                "research says about five popular diets.",
        "about": "Polycystic ovary syndrome (PCOS) is a common hormone condition that can cause irregular periods, "
                 "acne, extra hair growth and trouble getting pregnant. Insulin resistance is common with PCOS. "
                 "There's no cure, but for people carrying extra weight, losing 5 to 10% can make periods more "
                 "regular and improve hormone levels. International guidelines don't name one best diet.",
        "answers": {
            "intermittent-fasting": "It may help if you're carrying extra weight, since losing 5 to 10% can improve "
                "periods and hormones. Studies of fasting in PCOS are small.",
            "keto": "Small, short studies show weight loss, lower insulin and more regular periods, but it isn't "
                "proven better than other diets. Talk to your doctor if you're trying to get pregnant.",
            "low-carb": "It can help. Lower-carb eating can improve insulin resistance, which is common with PCOS, "
                "and weight loss improves symptoms. Guidelines don't name one best diet.",
            "time-restricted-eating": "Possibly. A few small studies show better weight, insulin and hormone levels; "
                "more research is needed.",
            "carnivore": "Nobody knows yet. There are no studies of the carnivore diet for PCOS.",
        },
    },
    {
        "slug": "can-diet-reverse-obesity", "name": "obesity", "title": "Obesity",
        "terms": ["obesity", "obese", "weight loss", "lose weight", "losing weight"],
        "icon": "⚖️", "tint": "tint-green",
        "lede": "Many diets work for weight loss at first; keeping it off is the hard part. Here's what the research "
                "says about five popular diets.",
        "about": "Obesity is a long-term condition in which extra body fat affects health. Many diets lead to weight "
                 "loss in the first months, and in head-to-head studies most give similar results after a year, so "
                 "the diet you can stick with matters most. Weight often comes back, which is why doctors treat "
                 "obesity as a long-term condition, sometimes with medicine or surgery.",
        "answers": {
            "intermittent-fasting": "It can lead to real weight loss, similar to ordinary calorie cutting. It suits "
                "some people who find daily dieting hard.",
            "keto": "It often leads to faster weight loss at first, but after a year the results are similar to "
                "other diets in most studies.",
            "low-carb": "It works for many people. In large trials, low-carb and low-fat diets gave similar weight "
                "loss after a year; the best diet is the one you can keep up.",
            "time-restricted-eating": "It helps some people eat less. In larger trials, weight loss was modest and "
                "similar to calorie cutting.",
            "carnivore": "Nobody knows long term. People report weight loss, but there are no clinical trials, and "
                "the diet is very restrictive.",
        },
    },
]

CALORIE_PAGE = {
    "slug": "why-am-i-gaining-weight-on-a-calorie-deficit",
    "question": "Why am I gaining weight on a calorie deficit?",
    "terms": ["calorie", "calories", "weight gain", "gaining weight", "not losing weight", "weight loss plateau"],
    "lede": "It's frustrating, and it's common. Here are the usual reasons, and when to see a doctor.",
    "reasons": [
        ("You may be eating more than you think",
         "Studies that measure food intake precisely find most people underestimate what they eat, often by a lot. "
         "Cooking oils, drinks, snacks and weekend meals are easy to miss. Weighing food for a week or two can help."),
        ("The scale is showing water, not fat",
         "Body weight can swing by a few pounds from day to day because of salt, carbohydrates, hormones (such as "
         "the menstrual cycle), constipation or starting a new exercise routine. Look at the trend over several weeks."),
        ("Your body is adjusting",
         "As you lose weight, your body burns a little less energy, and a calorie amount that worked at first may "
         "stop working. This is normal, not a broken metabolism."),
        ("Medicines can play a part",
         "Some medicines can cause weight gain, including steroids, insulin, some diabetes pills, some "
         "antidepressants and some mental health medicines. Don't stop any medicine, but ask your doctor."),
        ("Sleep and stress matter",
         "Short sleep and ongoing stress are linked to more hunger and eating more, which can quietly undo a deficit."),
        ("Sometimes it's a medical condition",
         "An underactive thyroid, fluid build-up from heart, kidney or liver problems, or (rarely) hormone disorders "
         "can cause weight gain. See a doctor if you gain weight quickly, have swelling in your legs or belly, feel "
         "short of breath, or gain weight you can't explain."),
    ],
}

HUB_SLUG = "questions.html"


def esc(text):
    return html.escape(text, quote=True)


def cap(text):
    return text[:1].upper() + text[1:]


def page_head(title, description, canonical, schema):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{esc(title)}</title>
    <meta name="description" content="{esc(description)}">
    <link rel="canonical" href="https://www.doctorsvideos.video/{canonical}">
    <meta property="og:title" content="{esc(title)}">
    <meta property="og:description" content="{esc(description)}">
    <meta property="og:url" content="https://www.doctorsvideos.video/{canonical}">
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <script type="application/ld+json">
{json.dumps(schema, indent=2)}
    </script>
</head>
"""


def site_header():
    # Same menu as every other page, taken from blog.html so they never drift apart.
    blog = (APP / "blog.html").read_text()
    header = blog[blog.index("<body>"):blog.index("</nav>") + len("</nav>")]
    return header.replace(' active"', '"') + "\n"


def site_footer(scripts):
    blog = (APP / "blog.html").read_text()
    footer = re.search(r"    <footer class=\"site-footer\">.*?</footer>", blog, re.S).group(0)
    tags = "\n".join(f'    <script src="{s}"></script>' for s in scripts)
    return f"\n{footer}\n\n{tags}\n</body>\n</html>\n"


def video_block(terms, empty_text):
    return (f'<div class="qa-videos" data-terms="{esc(json.dumps(terms))}" data-empty="{esc(empty_text)}">'
            f'<div class="video-grid"></div></div>')


def question_title(diet, cond):
    return f"Does {diet['title']} Reverse {cond['title']}?"


def build_condition(cond):
    questions = [(d, question_title(d, cond), cond["answers"][d["id"]]) for d in DIETS]
    schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
            for _, q, a in questions
        ],
    }
    title = f"Can Diet Reverse {cond['title']}? 5 Diets Compared | DoctorsVideos.video"
    desc = (f"Does intermittent fasting, keto, low-carb, time-restricted eating or carnivore reverse "
            f"{cond['name']}? Plain answers, safety notes and videos from many doctors.")
    out = [page_head(title, desc, cond["slug"] + ".html", schema), site_header()]
    jump = "".join(f'<a class="topic-chip" href="#{d["id"]}">{esc(cap(d["name"].replace("the ", "", 1)))}</a>'
                   for d in DIETS)
    out.append(f"""
    <header class="page-hero">
        <div class="page-hero-inner">
            <p class="breadcrumb"><a href="{HUB_SLUG}">← All health questions</a></p>
            <p class="section-kicker">Health questions</p>
            <h1 class="page-title">Can diet reverse {esc(cond['name'])}?</h1>
            <p class="page-lede">{esc(cond['lede'])}</p>
            <nav class="category-jump" aria-label="Jump to a diet">{jump}</nav>
        </div>
    </header>

    <main class="page-main">
        <div class="topic-layout">
            <div class="topic-content qa-page" data-condition-terms="{esc(json.dumps(cond['terms']))}">
                <section>
                    <h2>What is {esc(cond['name'])}?</h2>
                    <p class="qa-text">{esc(cond['about'])}</p>
                    <p class="qa-note"><strong>What "reverse" means here:</strong> improving the condition so your
                    tests and symptoms get better (for type 2 diabetes, remission). Results vary from person to
                    person, and your own doctor can tell you what's realistic for you.</p>
                </section>
""")
    for d, q, a in questions:
        out.append(f"""
                <section class="qa-section" id="{d['id']}">
                    <h2>{esc(q)}</h2>
                    <div class="qa-answer"><span class="qa-answer-label">Short answer</span><p>{esc(a)}</p></div>
                    <p class="qa-text"><strong>About {esc(d['name'])}:</strong> {esc(d['about'])}</p>
                    <p class="qa-safety"><strong>Before you try it:</strong> {esc(d['safety'])}</p>
                    <h3 class="qa-videos-title">What doctors say in their videos</h3>
                    {video_block(d['terms'], "No doctor videos on this exact question yet. See more videos further down the page.")}
                </section>
""")
    others = "".join(f'<a class="topic-chip" href="{c["slug"]}.html">Can diet reverse {esc(c["name"])}?</a>'
                     for c in CONDITIONS if c is not cond)
    out.append(f"""
                <section id="more-videos">
                    <h2>More doctor videos on {esc(cond['name'])}</h2>
                    <p class="section-note">Videos from different doctors, newest first. They share their own views,
                    which don't always agree, and we don't rank or endorse any of them.</p>
                    {video_block([], "Doctor videos on this topic are coming soon.")}
                </section>

                <section>
                    <h2>Other health questions</h2>
                    <div class="topic-chips topic-chips-left">{others}</div>
                </section>
{sources_section(CONDITION_SOURCES.get(cond["slug"], []) + DIET_STUDIES)}
                <p class="qa-updated">Written by DoctorsVideos.video as a general summary of published research, not by
                the doctors in the videos. For education only; it isn't medical advice. Talk to your own doctor
                before changing your diet or medicines. Last reviewed {UPDATED}.</p>
            </div>
            <aside class="topic-aside">
                <div class="ad-slot ad-box" data-ad-slot="article-inline"></div>
            </aside>
        </div>
    </main>
""")
    out.append(site_footer(["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", "common.js", "ads.js", "question.js"]))
    (APP / (cond["slug"] + ".html")).write_text("".join(out))


def build_calorie_page():
    p = CALORIE_PAGE
    schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": p["question"], "acceptedAnswer": {"@type": "Answer",
                        "text": " ".join(f"{h}. {t}" for h, t in p["reasons"])}}],
    }
    out = [page_head("Why Am I Gaining Weight on a Calorie Deficit? | DoctorsVideos.video",
                     "Common reasons the scale goes up when you're eating less, and when to see a doctor. With videos "
                     "from many doctors.", p["slug"] + ".html", schema), site_header()]
    reasons = "".join(f'<li><strong>{esc(h)}.</strong> {esc(t)}</li>' for h, t in p["reasons"])
    out.append(f"""
    <header class="page-hero">
        <div class="page-hero-inner">
            <p class="breadcrumb"><a href="{HUB_SLUG}">← All health questions</a></p>
            <p class="section-kicker">Health questions</p>
            <h1 class="page-title">{esc(p['question'])}</h1>
            <p class="page-lede">{esc(p['lede'])}</p>
        </div>
    </header>

    <main class="page-main">
        <div class="topic-layout">
            <div class="topic-content qa-page" data-condition-terms="{esc(json.dumps(p['terms']))}">
                <section>
                    <div class="qa-answer"><span class="qa-answer-label">Short answer</span><p>Usually it's one of
                    a few things: eating more than it seems, normal water swings on the scale, or the body adjusting
                    as you lose weight. Less often, a medicine or a medical condition is involved.</p></div>
                    <h2>Common reasons</h2>
                    <ol class="qa-list">{reasons}</ol>
                </section>
                <section id="more-videos">
                    <h2>What doctors say in their videos</h2>
                    <p class="section-note">Videos from different doctors, newest first. They share their own views,
                    which don't always agree, and we don't rank or endorse any of them.</p>
                    {video_block([], "Doctor videos on this question are coming soon.")}
                </section>
{sources_section(CALORIE_SOURCES)}
                <p class="qa-updated">Written by DoctorsVideos.video as a general summary, not by the doctors in the
                videos. For education only; it isn't medical advice. Last reviewed {UPDATED}.</p>
            </div>
            <aside class="topic-aside">
                <div class="ad-slot ad-box" data-ad-slot="article-inline"></div>
            </aside>
        </div>
    </main>
""")
    out.append(site_footer(["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", "common.js", "ads.js", "question.js"]))
    (APP / (p["slug"] + ".html")).write_text("".join(out))


def build_hub():
    schema = {"@context": "https://schema.org", "@type": "CollectionPage", "name": "Health Questions",
              "url": "https://www.doctorsvideos.video/" + HUB_SLUG}
    out = [page_head("Health Questions: Can Diet Reverse It? | DoctorsVideos.video",
                     "Plain answers to common questions about diets and conditions like type 2 diabetes, fatty liver "
                     "and high blood pressure, with videos from many doctors.", HUB_SLUG, schema), site_header()]
    cards = []
    for c in CONDITIONS:
        links = "".join(f'<li><a href="{c["slug"]}.html#{d["id"]}">{esc(question_title(d, c))}</a></li>' for d in DIETS)
        cards.append(f"""
            <article class="qa-hub-card">
                <a class="qa-hub-head" href="{c['slug']}.html">
                    <span class="browse-icon {c['tint']}" aria-hidden="true">{c['icon']}</span>
                    <h2>Can diet reverse {esc(c['name'])}?</h2>
                </a>
                <ul>{links}</ul>
            </article>""")
    cards.append(f"""
            <article class="qa-hub-card">
                <a class="qa-hub-head" href="{CALORIE_PAGE['slug']}.html">
                    <span class="browse-icon tint-blue" aria-hidden="true">🤔</span>
                    <h2>{esc(CALORIE_PAGE['question'])}</h2>
                </a>
                <ul><li><a href="{CALORIE_PAGE['slug']}.html">Six common reasons, and when to see a doctor</a></li></ul>
            </article>""")
    out.append(f"""
    <header class="page-hero">
        <div class="page-hero-inner">
            <p class="section-kicker">Health questions</p>
            <h1 class="page-title">Can diet reverse it?</h1>
            <p class="page-lede">Plain answers to the questions people search for most about diets and common
            conditions, with safety notes and videos from many different doctors. For education only; always talk
            to your own doctor.</p>
        </div>
    </header>

    <main class="page-main">
        <div class="qa-hub-grid">{"".join(cards)}
        </div>
    </main>
""")
    out.append(site_footer(["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", "common.js", "ads.js"]))
    (APP / HUB_SLUG).write_text("".join(out))


if __name__ == "__main__":
    for cond in CONDITIONS:
        build_condition(cond)
    build_calorie_page()
    build_hub()
    print(f"Built {len(CONDITIONS)} condition pages, 1 calorie page and {HUB_SLUG}")
