#!/usr/bin/env python3
"""Turns Appendix 2 (Demo Course Data) into src/js/data.js.

This stands in for the production sync service: it reads the college's tables
(courses, course_sections, course_levels, course_level_link, course_funding,
course_fund_link), cleans the HTML fields, and emits one JSON object the
prototype's course template renders from. Run: python3 build-data.py <xlsx>
"""
import datetime
import html
import json
import re
import sys
from html.parser import HTMLParser

import openpyxl

SRC = sys.argv[1]
OUT = 'src/js/data.js'

ALLOWED = {'p', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'br'}


class Clean(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []

    def handle_starttag(self, tag, attrs):
        if tag in ALLOWED:
            self.out.append('<%s>' % ('strong' if tag == 'b' else 'em' if tag == 'i' else tag))

    def handle_endtag(self, tag):
        if tag in ALLOWED and tag != 'br':
            self.out.append('</%s>' % ('strong' if tag == 'b' else 'em' if tag == 'i' else tag))

    def handle_data(self, data):
        self.out.append(html.escape(data, quote=False))


def clean_html(v):
    if v in (None, 'NULL') or not str(v).strip():
        return None
    s = str(v).replace('_x000D_', '').replace('\r', '')
    p = Clean()
    p.feed(s)
    out = ''.join(p.out)
    out = out.replace('\xa0', ' ')
    out = re.sub(r'\s+', ' ', out)
    out = re.sub(r'<p>\s*</p>', '', out)
    out = re.sub(r'<strong>\s*</strong>', ' ', out)
    # Trim whitespace around block tags only; spaces next to inline tags (<strong>) are meaningful
    out = re.sub(r'\s*(</?(?:p|ul|ol|li|br)>)\s*', r'\1', out)
    return out.strip() or None


def text_only(v):
    h = clean_html(v)
    if not h:
        return None
    return html.unescape(re.sub(r'<[^>]+>', ' ', h)).strip()


def clean_text(v):
    if v in (None, 'NULL'):
        return None
    return re.sub(r'\s+', ' ', str(v).replace('\xa0', ' ')).strip() or None


wb = openpyxl.load_workbook(SRC)


def rows(name):
    ws = wb[name]
    rs = [r for r in ws.iter_rows(values_only=True) if any(c is not None for c in r)]
    hdr = rs[0]
    out = [dict(zip(hdr, r)) for r in rs[1:]]
    key = hdr[0]
    return [o for o in out if str(o[key]).strip().isdigit()]


sections = {int(r['S_ID']): clean_text(r['S_TITLE']) for r in rows('course_sections')}
section_desc = {int(r['S_ID']): text_only(r['S_DESCRIPTION']) for r in rows('course_sections')}
levels = {int(r['L_ID']): clean_text(r['L_TITLE']) for r in rows('course_levels')}
funding = {int(r['F_ID']): clean_text(r['F_TITLE']) for r in rows('course_funding')}
level_link = {}
for r in rows('course_level_link'):
    level_link.setdefault(int(r['CL_COURSEID']), []).append(int(r['CL_LEVELID']))
fund_link = {}
for r in rows('course_fund_link'):
    fund_link.setdefault(int(r['CF_COURSEID']), []).append(int(r['CF_FUNDID']))

# Level ids → short label + plain-English equivalent (shown by the level explainer)
LEVEL_SHORT = {
    9: ('Entry 1', 0), 10: ('Entry 2', 0), 11: ('Entry 3', 0), 12: ('Supported (RARPA)', 0),
    13: ('Level 1', 1), 14: ('Level 2', 2), 15: ('Level 3', 3), 16: ('Level 4+', 4), 17: ('Various', 0),
}

# NOT IN THE SUPPLIED DATA: campus. Illustrative assignment by subject so the
# campus filter can be demonstrated. Flagged in the prototype notes.
CAMPUS_BY_SECTION = {
    6: 'Princes Road', 8: 'Princes Road', 9: 'Princes Road', 17: 'Princes Road', 19: 'Princes Road',
    2: 'Online', 12: 'Moulsham Street', 14: 'Moulsham Street',
}

# Career keywords per subject, for "I want to be a…" search. In production these
# would be a CMS-managed taxonomy, seeded from C_EMPLOYABILITY.
CAREERS_BY_SECTION = {
    2: ['nurse', 'midwife', 'paramedic', 'radiographer', 'physiotherapist', 'occupational therapist', 'university'],
    3: ['forensic scientist', 'crime scene investigator', 'police officer', 'lab technician', 'scientist'],
    5: ['manager', 'business owner', 'entrepreneur', 'office administrator', 'team leader'],
    6: ['carpenter', 'joiner', 'plumber', 'painter', 'decorator', 'builder', 'site manager'],
    7: ['nursery nurse', 'teaching assistant', 'early years practitioner', 'childminder', 'teacher'],
    8: ['electrician', 'electrical installer'],
    9: ['engineer', 'mechanic', 'technician', 'fabricator'],
    12: ['hairdresser', 'barber', 'beauty therapist', 'nail technician', 'make-up artist', 'salon owner'],
    13: ['care worker', 'social worker', 'support worker', 'nurse', 'care manager'],
    14: ['chef', 'cook', 'pastry chef', 'restaurant manager', 'hospitality'],
    15: ['software developer', 'programmer', 'it technician', 'cyber security', 'games developer', 'web developer'],
    17: ['police officer', 'firefighter', 'soldier', 'army', 'navy', 'raf', 'prison officer', 'paramedic'],
    19: ['sports coach', 'personal trainer', 'pe teacher', 'fitness instructor', 'footballer'],
    21: ['cabin crew', 'travel agent', 'tour guide', 'holiday rep', 'airport'],
    48: ['fashion designer', 'graphic designer', 'illustrator', 'photographer', 'film maker', 'editor', 'actor', 'costume designer', 'animator', 'youtuber'],
    50: [], 51: [],
    55: ['actor', 'dancer', 'performer', 'stage manager', 'lighting technician'],
}
COURSE_CAREERS = {
    721: ['solicitor', 'lawyer', 'paralegal', 'legal secretary'],
    699: ['marketing executive', 'social media manager', 'digital marketer'],
    557: ['director', 'camera operator', 'sound designer', 'film maker', 'youtuber'],
    374: ['fashion designer', 'costume designer', 'stylist', 'pattern cutter'],
    482: ['graphic designer', 'illustrator', 'brand designer'],
    520: ['beauty therapist', 'spa therapist', 'make-up artist'],
    513: ['hairdresser', 'barber'],
}

IMAGE_BY_SECTION = {
    14: 'Catering', 6: 'Carpentry', 12: 'Hairdressing', 48: 'Creative', 55: 'Performing arts',
    2: 'Students learning', 5: 'Students learning', 15: 'Students learning',
}


def fmt_start(v):
    if isinstance(v, datetime.datetime):
        return v.strftime('%B %Y'), v.strftime('%Y-%m-%d')
    t = clean_text(v)
    return t, None


courses = []
for r in rows('courses'):
    if str(r['C_PUBLISHED']) != '1':
        continue
    cid = int(r['C_ID'])
    sec = int(r['C_SECTION'])
    lv_ids = level_link.get(cid, [])
    lv = LEVEL_SHORT.get(lv_ids[0], ('Various', 0)) if lv_ids else ('Various', 0)
    start_label, start_iso = fmt_start(r['C_STARTDATE'])
    age = ['adult'] if sec == 2 else (['supported'] if sec in (49, 50, 51, 52) else ['16-18'])
    if sec in (50, 51):
        age = ['supported']
    careers = sorted(set(CAREERS_BY_SECTION.get(sec, []) + COURSE_CAREERS.get(cid, [])))
    courses.append({
        'id': cid,
        'title': clean_text(r['C_TITLE']),
        'h1': clean_text(r['C_SEOH1']),
        'subjectId': sec,
        'subject': sections.get(sec),
        'mode': {'FT': 'Full time', 'PT': 'Part time'}.get(clean_text(r['C_MODE']), clean_text(r['C_MODE'])),
        'duration': clean_text(r['C_DURATION']),
        'levelIds': lv_ids,
        'level': lv[0],
        'levelNum': lv[1],
        'levelTitle': levels.get(lv_ids[0]) if lv_ids else None,
        'start': start_label,
        'startIso': start_iso,
        'qualification': text_only(r['C_QUALIFICATION']),
        'courseForMe': clean_html(r['C_COURSEFORME']),
        'overview': clean_html(r['C_STUDYOVERVIEW']),
        'employability': clean_html(r['C_EMPLOYABILITY']),
        'eligibility': clean_html(r['C_ELIGIBILITY']),
        'assessment': clean_html(r['C_ASSESSMENT']),
        'fees': clean_html(r['C_FEES']),
        'additionalFees': clean_html(r['C_ADDITIONALFEES']),
        'contact': text_only(r['C_CONTACT']),
        'funding': [funding.get(f) for f in fund_link.get(cid, [])],
        'campus': CAMPUS_BY_SECTION.get(sec, 'Moulsham Street'),
        'ageGroups': age,
        'careers': careers,
        'image': IMAGE_BY_SECTION.get(sec, sections.get(sec)),
        'seoTitle': clean_text(r['C_SEOTITLE']),
    })

used = sorted({c['subjectId'] for c in courses})
subjects = [{'id': s, 'title': sections[s], 'description': section_desc.get(s)} for s in used]

data = {
    'source': 'Appendix 2 - Demo Course Data.xlsx (generated by build-data.py)',
    'courses': courses,
    'subjects': subjects,
}

with open(OUT, 'w') as f:
    f.write('/* Generated by build-data.py from the college demo data. Do not edit by hand. */\n')
    f.write('window.CC_DATA = ')
    f.write(json.dumps(data, ensure_ascii=False, indent=1))
    f.write(';\n')
print('wrote', OUT, len(courses), 'courses,', len(subjects), 'subjects')
