# Chelmsford College website prototype

Clickable, mobile-first prototype for the Chelmsford College website tender (ClerksWell). Version 2 applies the Chelmsford College design system on top of the greyscale wireframe.

## View it

- GitHub Pages: publish from `main` → `/docs`. Open `index.html` (the contents page), which links to every template and lists the demo journeys.
- Locally: open `dist/index.html` after building, or run `python3 -m http.server` in `dist/`.

## Build

```
python3 build-data.py requirements/Appendix_2_-_Demo_Course_Data.xlsx   # course data → src/js/data.js (only when the data changes)
node build-includes.js && node validate.js                              # src/ → dist/, then structural checks
rm -rf docs && cp -r dist docs && touch docs/.nojekyll                  # refresh the GitHub Pages copy
```

## Structure

- `src/pages/` holds one file per template. `src/includes/` holds the header (with mega menus) and the footer.
- `src/css/base.css` and `components.css` hold structure only. `theme.css` is the whole design layer: switch it off with the button on the contents page to see the greyscale wireframe.
- `src/js/app.js` holds the templates and behaviour (search, course page from data, events, booking, payments, shortlist, mega menus). `wireframe.js` holds the shared wireframe behaviour and the annotation toggle. Annotations are off by default.
- `requirements/requirements.md` lists the numbered requirements R01–R53 traced in page comments.

## Change log

- V2-01: mega menus with second-tier items, a live course search in the Courses menu, and promoted image cards. The menus drill down on mobile.
- V2-02: the on-screen journey guide is removed from the pages. Journeys are listed on the contents page only.
- V2-03: the demo script is provided separately.
- V2-04: the design layer is applied from the Chelmsford College design system, using the college's photography and logo.
- V3-01: beyond-the-brief features: course matcher, subject pathways, employer hub, application tracker, display settings and the course question helper.
- V3-02: the design system is provided as a PDF.
- V3.1: hero contrast over the swoosh fixed; annotations no longer obscured; no sideways-scrolling rows on mobile; forms cleared between visits; leftover placeholders replaced.
