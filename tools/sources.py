"""Sources shown at the bottom of the Health Questions and specialty guide pages.

Use major medical organizations and well-known studies only. Studies link to a PubMed search so the link keeps
working even if a publisher changes its web address.
"""
import html


def _pubmed(terms):
    return "https://pubmed.ncbi.nlm.nih.gov/?term=" + terms.replace(" ", "+")


def _study(label, search):
    return (label, _pubmed(search))


AAOS = "American Academy of Orthopaedic Surgeons (OrthoInfo): "

DIET_STUDIES = [
    _study("de Cabo & Mattson. Effects of intermittent fasting on health, aging, and disease. "
           "New England Journal of Medicine, 2019", "de Cabo Mattson effects of intermittent fasting health aging disease"),
    _study("Liu et al. Calorie restriction with or without time-restricted eating in weight loss. "
           "New England Journal of Medicine, 2022", "Liu calorie restriction with or without time-restricted eating 2022"),
    _study("Goldenberg et al. Low and very low carbohydrate diets for type 2 diabetes remission: systematic review "
           "and meta-analysis. BMJ, 2021", "Goldenberg low very low carbohydrate diets type 2 diabetes remission BMJ 2021"),
    _study("Lennerz et al. Behavioral characteristics and self-reported health status among 2029 adults consuming a "
           "\"carnivore diet\". Current Developments in Nutrition, 2021", "Lennerz carnivore diet 2029 adults"),
]
EVERT = _study("Evert et al. Nutrition therapy for adults with diabetes or prediabetes: a consensus report. "
               "Diabetes Care, 2019", "Evert nutrition therapy adults diabetes prediabetes consensus report 2019")
DPP = _study("Diabetes Prevention Program Research Group (Knowler et al.). Reduction in the incidence of type 2 "
             "diabetes with lifestyle intervention or metformin. New England Journal of Medicine, 2002",
             "Knowler reduction incidence type 2 diabetes lifestyle intervention metformin 2002")

CONDITION_SOURCES = {
    "can-diet-reverse-insulin-resistance": [EVERT, DPP],
    "can-diet-reverse-type-2-diabetes": [
        _study("Lean et al. Primary care-led weight management for remission of type 2 diabetes (DiRECT). "
               "The Lancet, 2018", "Lean primary care-led weight management remission type 2 diabetes DiRECT"),
        _study("Riddle et al. Consensus report: definition and interpretation of remission in type 2 diabetes. "
               "Diabetes Care, 2021", "Riddle consensus report definition interpretation remission type 2 diabetes"),
        EVERT],
    "can-diet-reverse-prediabetes": [DPP, EVERT],
    "can-diet-reverse-fatty-liver-disease": [
        _study("Rinella et al. AASLD practice guidance on the clinical assessment and management of nonalcoholic "
               "fatty liver disease. Hepatology, 2023", "Rinella AASLD practice guidance nonalcoholic fatty liver 2023"),
        _study("Vilar-Gomez et al. Weight loss through lifestyle modification significantly reduces features of "
               "nonalcoholic steatohepatitis. Gastroenterology, 2015", "Vilar-Gomez weight loss lifestyle steatohepatitis 2015")],
    "can-diet-reverse-metabolic-syndrome": [
        _study("Grundy et al. Diagnosis and management of the metabolic syndrome: an American Heart Association / "
               "National Heart, Lung, and Blood Institute scientific statement. Circulation, 2005",
               "Grundy diagnosis management metabolic syndrome scientific statement 2005")],
    "can-diet-reverse-visceral-fat": [
        _study("Neeland et al. Visceral and ectopic fat, atherosclerosis, and cardiometabolic disease: a position "
               "statement. The Lancet Diabetes & Endocrinology, 2019", "Neeland visceral ectopic fat position statement 2019")],
    "can-diet-reverse-high-blood-pressure": [
        _study("Whelton et al. 2017 ACC/AHA guideline for the prevention, detection, evaluation, and management of "
               "high blood pressure in adults", "Whelton 2017 guideline high blood pressure adults"),
        _study("Sacks et al. Effects on blood pressure of reduced dietary sodium and the DASH diet. New England "
               "Journal of Medicine, 2001", "Sacks effects blood pressure reduced dietary sodium DASH 2001"),
        _study("Neter et al. Influence of weight reduction on blood pressure: a meta-analysis. Hypertension, 2003",
               "Neter influence of weight reduction on blood pressure meta-analysis")],
    "can-diet-reverse-pcos": [
        _study("Teede et al. Recommendations from the 2023 international evidence-based guideline for the "
               "assessment and management of polycystic ovary syndrome", "Teede 2023 international evidence-based guideline polycystic ovary syndrome")],
    "can-diet-reverse-obesity": [
        _study("Gardner et al. Effect of low-fat vs low-carbohydrate diet on 12-month weight loss (DIETFITS). "
               "JAMA, 2018", "Gardner DIETFITS low-fat low-carbohydrate 12-month weight loss"),
        _study("Johnston et al. Comparison of weight loss among named diet programs in overweight and obese adults: "
               "a meta-analysis. JAMA, 2014", "Johnston comparison weight loss named diet programs meta-analysis 2014")],
}

CALORIE_SOURCES = [
    _study("Lichtman et al. Discrepancy between self-reported and actual caloric intake and exercise in obese "
           "subjects. New England Journal of Medicine, 1992", "Lichtman discrepancy self-reported actual caloric intake 1992"),
    _study("Rosenbaum & Leibel. Adaptive thermogenesis in humans. International Journal of Obesity, 2010",
           "Rosenbaum Leibel adaptive thermogenesis in humans 2010"),
    _study("Hall & Guo. Obesity energy balance and control of body weight. Gastroenterology, 2017",
           "Hall Guo obesity energy balance control body weight 2017"),
]

GUIDE_SOURCES = {
    "hip-and-knee": [
        (AAOS + "Arthritis of the Knee", "https://orthoinfo.aaos.org/en/diseases--conditions/arthritis-of-the-knee"),
        (AAOS + "Hip Osteoarthritis", "https://orthoinfo.aaos.org/en/diseases--conditions/osteoarthritis-of-the-hip"),
        (AAOS + "Total Knee Replacement", "https://orthoinfo.aaos.org/en/treatment/total-knee-replacement"),
        (AAOS + "Total Hip Replacement", "https://orthoinfo.aaos.org/en/treatment/total-hip-replacement/"),
        (AAOS + "ACL Injury: Does It Require Surgery?",
         "https://orthoinfo.aaos.org/en/treatment/acl-injury-does-it-require-surgery"),
        (AAOS + "Knee Arthroscopy", "https://orthoinfo.aaos.org/en/treatment/knee-arthroscopy"),
        _study("Siemieniuk et al. Arthroscopic surgery for degenerative knee arthritis and meniscal tears: a clinical "
               "practice guideline. BMJ, 2017", "Siemieniuk arthroscopic surgery degenerative knee clinical practice guideline BMJ 2017"),
        ("NICE guideline NG226: Osteoarthritis in over 16s (2022)", "https://www.nice.org.uk/guidance/ng226")],
    "foot-and-ankle": [
        (AAOS + "Heel Pain", "https://orthoinfo.aaos.org/en/diseases--conditions/heel-pain"),
        (AAOS + "Sprains, Strains and Other Soft-Tissue Injuries",
         "https://orthoinfo.aaos.org/en/diseases--conditions/sprains-strains-and-other-soft-tissue-injuries"),
        (AAOS + "Orthotics", "https://orthoinfo.aaos.org/en/treatment/orthotics"),
        (AAOS + "Care of the Diabetic Foot", "https://orthoinfo.aaos.org/en/treatment/care-of-the-diabetic-foot/")],
}


def sources_section(items, indent="                "):
    """HTML for a 'Sources' list."""
    if not items:
        return ""
    lis = "".join(f'<li><a href="{html.escape(url)}" target="_blank" rel="noopener">{html.escape(label)}</a></li>'
                  for label, url in items)
    return f"""
{indent}<section class="qa-section sources" id="sources">
{indent}    <h2>Sources</h2>
{indent}    <p class="section-note">The main guidelines and studies behind this page.
{indent}    <a href="about.html#how-we-write">How we write our pages</a>.</p>
{indent}    <ol class="sources-list">{lis}</ol>
{indent}</section>
"""
