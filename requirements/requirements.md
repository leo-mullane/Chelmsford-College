# Chelmsford College website — prototype requirements

Sources: Tender Specification (TS), Appendix 1 Website Demo Brief (DB), Appendix 2 Demo Course Data (CD), Appendix 4 Bidder Answer Sheet (AS), plus ClerksWell proposals (CW) from the website review.

## Global

| ID | Requirement | Source |
| --- | --- | --- |
| R01 | Mobile-first: every template is designed at 320–375px first, then scaled to tablet (768px) and desktop (1024px+) | TS, DB |
| R02 | WCAG 2.2 AA: semantic landmarks, ordered headings, visible focus, keyboard operable, 44px targets, no hover-only content, no auto-rotating content | TS, DB, AS |
| R03 | College logo and main navigation on every page | DB |
| R04 | Navigation serves priority audiences: 16–19 learners, parents and carers, adult learners, employers and apprenticeship partners; with routes for current students, staff and job seekers | TS |
| R05 | Primary purpose is learner recruitment: Apply is visible on every page; conversion from course page to application is the key metric | TS |
| R06 | Content managed by marketing through a CMS supplied by us (ASP.NET) | TS |
| R07 | Content and courses are pulled from the college's SQL tables | TS, CD |
| R08 | Prototype available to the panel on their own devices after the session | DB |
| R09 | Plain-English content; jargon explained (levels, T Levels, RARPA, funding) | CW |

## Page types

| ID | Requirement | Source |
| --- | --- | --- |
| R10 | Homepage: prominent area at the top for key messages and campaigns | DB |
| R11 | Homepage: prominent course search | DB |
| R12 | Homepage: areas for video and images | DB |
| R13 | Search results page, filterable by subject, level, study mode and campus (plus age group) | DB |
| R14 | Course page: one template for every course, generated from the SQL data | DB, CD |
| R15 | Course page: page header, space for a course image | DB |
| R16 | Course page: detailed information organised to scan on mobile | DB |
| R17 | Events listing with a way to filter or browse (date, event type) | DB |
| R18 | Single event: date, time, location, description and how to book | DB |
| R19 | Payment journey presenting course deposits (before enrolment), materials fees (after enrolment), trips and one-off payments | DB |
| R20 | Payments can be made by students or by parents and carers on their behalf | DB |
| R21 | At least one complete payment journey | DB |
| R22 | Secure payment: card details captured on the payment provider's hosted page (PCI DSS); provider not yet selected | DB, TS |
| R23 | Payment linked to student and course data (application or student reference) | AS |
| R24 | Parents and carers hub | CW |
| R25 | Shortlist and compare courses | CW |
| R26 | Apply hand-off from the course page | TS, CW |

## Modules

| ID | Requirement | Source |
| --- | --- | --- |
| R30 | Campaign hero: one CMS-scheduled campaign, no carousel | DB, CW |
| R31 | Course search with "who are you" quick routes | DB, CW |
| R32 | "I want to be a…" career search | CW |
| R33 | Filter drawer (mobile) / sidebar (desktop) with live result count | DB, CW |
| R34 | Course card | CW |
| R35 | Key facts panel | DB |
| R36 | Accordion for course detail | DB |
| R37 | Fee checker: "Can I study this for free?" | TS, CW |
| R38 | Sticky Apply bar on mobile course pages | TS, CW |
| R39 | Level explainer | CW |
| R40 | Event card and event filters | DB |
| R41 | Event booking form with confirmation and add to calendar | DB, CW |
| R42 | Payment type cards, progress stepper, reference lookup, review, confirmation | DB |
| R43 | Video module (poster and play, captions, no autoplay) | DB |
| R44 | Audience routes | TS |

## Technical

| ID | Requirement | Source |
| --- | --- | --- |
| R50 | ASP.NET build; proposed Umbraco on ASP.NET Core | TS |
| R51 | SQL integration: scheduled sync of `courses`, `course_sections`, `course_levels`, `course_level_link`, `course_funding`, `course_fund_link` | TS, CD |
| R52 | Data protection for personal data in application, booking and payment forms | TS |
| R53 | Data extraction and recovery for reporting | AS |
