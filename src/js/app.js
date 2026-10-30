/* ==========================================================================
   app.js — Chelmsford College prototype behaviour.

   Renders the data-driven templates (search results, course page, events,
   payments, shortlist) from window.CC_DATA, which build-data.py generates from
   the college's Appendix 2 tables. In production the same field mapping runs
   server-side in the ASP.NET/Umbraco build; here it runs in the browser so the
   panel can click through every course.

   Loaded BEFORE wireframe.js so rendered accordions, flyouts and modals are
   in the DOM when wireframe.js binds its behaviour.
   ========================================================================== */

(function () {
  'use strict';

  var DATA = window.CC_DATA || { courses: [], subjects: [] };
  /* Links rendered by JS point at pages/; work out the prefix from where we are. */
  var BASE = (function () {
    var path = window.location.pathname;
    if (/\/pages\/[^\/]*$/.test(path)) return '';
    if (/\/modules\/[^\/]*$/.test(path)) return '../pages/';
    return 'pages/';
  })();
  var COURSES = DATA.courses;

  /* --- Imagery: placeholders carry a data-img key; theme.css maps it to the
     college's photo, and the greyscale wireframe keeps the labelled block. */
  var IMG = {
    catering: 'Two catering students in chef’s whites in the college training kitchen',
    carpentry: 'A tutor shows a student how to use a hand tool at a workbench',
    hairdressing: 'A hairdressing tutor works with a student in the college salon',
    performing: 'A student dances on stage under purple stage lights',
    learners: 'Four learners laughing together outdoors on campus',
    students: 'Three students working together around a laptop',
    news: 'A student receives a certificate at the college awards'
  };
  var IMG_BY_SUBJECT = { 14: 'catering', 6: 'carpentry', 8: 'carpentry', 9: 'carpentry', 12: 'hairdressing', 48: 'performing', 55: 'performing', 2: 'students', 3: 'students', 5: 'students', 15: 'students', 21: 'students' };
  var IMG_BY_EVENT = { ev1: 'learners', ev2: 'students', ev3: 'students', ev4: 'performing', ev5: 'carpentry', ev6: 'learners', ev7: 'carpentry', ev8: 'learners' };
  function imgFor(c) { return IMG_BY_SUBJECT[c.subjectId] || 'learners'; }
  function imgPh(key, label, cls, extra) {
    return '<div class="wf-placeholder' + (cls ? ' ' + cls : '') + '" data-img="' + key + '" role="img" aria-label="' + esc(IMG[key]) + '"' + (extra || '') + '>' + label + '</div>';
  }

  /* --- Utilities -------------------------------------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function params() { return new URLSearchParams(window.location.search); }
  function store(kind) {
    var mem = {};
    function api() { try { return window[kind]; } catch (e) { return null; } }
    return {
      get: function (k, d) {
        try { var s = api(); var v = s ? s.getItem(k) : mem[k]; return v == null ? d : JSON.parse(v); } catch (e) { return d; }
      },
      set: function (k, v) {
        var str = JSON.stringify(v);
        try { var s = api(); if (s) s.setItem(k, str); else mem[k] = str; } catch (e) { mem[k] = str; }
      },
      del: function (k) { try { var s = api(); if (s) s.removeItem(k); delete mem[k]; } catch (e) { delete mem[k]; } }
    };
  }
  var local = store('localStorage');
  var session = store('sessionStorage');
  function courseById(id) { return COURSES.filter(function (c) { return String(c.id) === String(id); })[0]; }
  function plain(html) { var d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent || '').trim(); }
  function firstPara(html) { var m = /<p>([\s\S]*?)<\/p>/.exec(html || ''); return m ? plain(m[1]) : plain(html); }
  function announce(msg) {
    var r = $('#live-region');
    if (!r) { r = document.createElement('div'); r.id = 'live-region'; r.className = 'visually-hidden'; r.setAttribute('aria-live', 'polite'); document.body.appendChild(r); }
    r.textContent = '';
    window.setTimeout(function () { r.textContent = msg; }, 60);
  }
  function levelSort(c) { return c.levelNum || 0; }
  var AGE_LABEL = { '16-18': '16–18', adult: 'Adults 19+', supported: 'Supported learning' };
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function fmtDate(iso) { var d = new Date(iso + 'T12:00:00'); return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function money(n) { return '£' + Number(n).toFixed(2); }

  /* --- Events. ev1 is the college's own sample event (Showcase Open Evening); the others are illustrative, to show filtering */
  var EVENTS = [
    { id: 'ev1', title: 'Showcase Open Evening', type: 'Open event', date: '2027-03-10', start: '6pm', end: '8.30pm', startH: '180000', endH: '203000', campus: 'Both campuses', location: 'Moulsham Street and Princes Road campuses, Chelmsford', audience: ['16-18', 'parents', 'adult', 'supported'], subjects: [], status: 'few', sample: true,
      summary: 'The Showcase event is an excellent opportunity to see what Chelmsford College is like. Visit the various departments, check out the campus and talk to the tutors who could be working with you next year.',
      agenda: ['Visit as many departments as you’re interested in and talk to the tutors', 'Tour our recently refurbished leisure centre', 'Talk to staff about careers, SEND support and student support, including travel and finance', 'Drop in to subject presentations at either campus (times below)'],
      arrival: 'Your booked time is the time you can arrive at the building. You can stay as long as you like and visit as many departments as you’re interested in.',
      slots: ['6pm', '6.30pm', '7pm', '7.30pm', '8pm'],
      presentations: [
        { t: 'Apprenticeships', ms: '6.30pm, 7pm and 7.30pm', pr: '6.30pm, 7pm and 7.30pm' },
        { t: 'Electrical', pr: '6.15pm, 6.45pm, 7.15pm and 7.45pm' },
        { t: 'Football Academy', ms: '6.30pm (Boys Academy), 7pm (Girls Academy)' },
        { t: 'Higher Qualifications', ms: '7pm', pr: '7pm' },
        { t: 'Performing Arts', ms: '6.45pm, 7.15pm and 7.45pm' },
        { t: 'SEND Support', d: 'Transition to college, and stakeholders and inclusion partners', ms: '6.15pm, 6.45pm, 7.15pm and 7.45pm', pr: '6.15pm, 6.45pm, 7.15pm and 7.45pm' },
        { t: 'T Levels', ms: 'All other T Levels: 6.30pm, 6.45pm, 7pm and 7.15pm', pr: 'Construction and Engineering T Levels: 6.30pm and 7.30pm' },
        { t: 'Uniformed Services', pr: '6.15pm, 6.45pm, 7.15pm and 7.45pm' }
      ] },
    { id: 'ev2', title: 'Parents’ and carers’ information evening', type: 'Information session', date: '2026-11-26', start: '6pm', end: '7pm', startH: '180000', endH: '190000', campus: 'Online', location: 'Online (Microsoft Teams link sent when you book)', audience: ['parents'], subjects: [], status: 'available',
      summary: 'How college differs from school, how we keep learners safe, bursaries and travel, and how you can support your young person’s application.',
      agenda: ['College life and the student timetable', 'Safeguarding and wellbeing', 'Bursaries, free meals and travel support', 'Live Q&A'] },
    { id: 'ev3', title: 'Adult learning information session', type: 'Information session', date: '2026-12-02', start: '6pm', end: '7pm', startH: '180000', endH: '190000', campus: 'Online', location: 'Online (Microsoft Teams link sent when you book)', audience: ['adult'], subjects: [2, 13], status: 'available',
      summary: 'Thinking about a career change or returning to learning? Find out about Access to HE, part-time courses and funding for adults, including Advanced Learner Loans.',
      agenda: ['Courses for adults, including Access to HE', 'Funding: what is free and what a loan covers', 'Fitting study around work and family', 'One-to-one advice slots'] },
    { id: 'ev4', title: 'Creative Industries taster morning', type: 'Taster day', date: '2026-12-05', start: '10am', end: '1pm', startH: '100000', endH: '130000', campus: 'Moulsham Street', location: 'Moulsham Street campus, Chelmsford', audience: ['16-18'], subjects: [48, 55], status: 'available',
      summary: 'Try fashion, graphic design, media and performing arts workshops with our tutors and current students. For Year 10 and 11 students.',
      agenda: ['Pick two hands-on workshops', 'Tour of studios, sewing rooms and the theatre space', 'Portfolio advice drop-in'] },
    { id: 'ev5', title: 'Employer breakfast: apprenticeships and T Level placements', type: 'Employer event', date: '2026-12-10', start: '8am', end: '9.30am', startH: '080000', endH: '093000', campus: 'Princes Road', location: 'Princes Road campus, Chelmsford', audience: ['employer'], subjects: [], status: 'available',
      summary: 'How to take on an apprentice or host a T Level industry placement, with funding explained by our employer team.',
      agenda: ['Apprenticeship funding and levy transfer', 'Hosting a 45-day T Level placement', 'Networking breakfast'] },
    { id: 'ev6', title: 'January Open Evening', type: 'Open event', date: '2027-01-20', start: '6pm', end: '8.30pm', startH: '180000', endH: '203000', campus: 'Both campuses', location: 'Moulsham Street and Princes Road, Chelmsford', audience: ['16-18', 'parents', 'adult'], subjects: [], status: 'available',
      summary: 'Another chance to visit the departments, see the campus and talk to the tutors who could be working with you next year.',
      agenda: ['Visit the departments and talk to the tutors', 'Tour the campus and facilities', 'Talk to staff about careers, SEND support and student support'] },
    { id: 'ev7', title: 'Construction and engineering taster day', type: 'Taster day', date: '2027-01-30', start: '10am', end: '1pm', startH: '100000', endH: '130000', campus: 'Princes Road', location: 'Princes Road campus, Chelmsford', audience: ['16-18'], subjects: [6, 8, 9], status: 'full',
      summary: 'Have a go at carpentry, plumbing, electrical installation and engineering in our workshops.',
      agenda: ['Two practical workshop sessions', 'Meet the Institute of Technology team', 'Talk to current apprentices'] },
    { id: 'ev8', title: 'Supported learning (INSPIRE) open morning', type: 'Open event', date: '2027-02-09', start: '10am', end: '12pm', startH: '100000', endH: '120000', campus: 'Moulsham Street', location: 'Moulsham Street campus, Chelmsford', audience: ['supported', 'parents'], subjects: [50, 51], status: 'available',
      summary: 'A quieter open event for learners with special educational needs and their families. Meet the INSPIRE team and see our learning spaces.',
      agenda: ['Quiet arrival and smaller group tours', 'Meet the SEND and transition team', 'EHCP and transition questions'] }
  ];
  var EVENT_TYPES = ['Open event', 'Taster day', 'Information session', 'Employer event'];
  var AUDIENCES = [{ v: '16-18', l: 'School leavers' }, { v: 'parents', l: 'Parents and carers' }, { v: 'adult', l: 'Adult learners' }, { v: 'employer', l: 'Employers' }, { v: 'supported', l: 'Supported learning' }];
  function eventById(id) { return EVENTS.filter(function (e) { return e.id === id; })[0]; }
  function statusTag(s) {
    if (s === 'full') return '<span class="tag">Fully booked: join the waiting list</span>';
    if (s === 'few') return '<span class="tag tag-solid">Few places left</span>';
    return '<span class="tag tag-soft">Places available</span>';
  }

  /* --- Shortlist (R25) -------------------------------------------------- */
  function shortlist() { return local.get('cc-shortlist', []); }
  function setShortlist(list) { local.set('cc-shortlist', list); updateShortlistCounts(); }
  function isSaved(id) { return shortlist().indexOf(Number(id)) > -1; }
  function toggleSaved(id) {
    id = Number(id);
    var list = shortlist();
    var i = list.indexOf(id);
    if (i > -1) list.splice(i, 1); else list.push(id);
    setShortlist(list);
    var c = courseById(id);
    announce((i > -1 ? 'Removed from' : 'Added to') + ' your shortlist: ' + (c ? c.title : 'course'));
    return i === -1;
  }
  function updateShortlistCounts() {
    var n = shortlist().length;
    $all('[data-shortlist-count]').forEach(function (el) { el.textContent = n; });
  }
  function saveButton(id) {
    var on = isSaved(id);
    return '<button type="button" class="save-btn" data-save="' + id + '" aria-pressed="' + on + '"><span class="glyph glyph-heart" aria-hidden="true"></span><span>' + (on ? 'Saved' : 'Save') + '</span></button>';
  }
  function bindSaveButtons(root) {
    $all('[data-save]', root).forEach(function (b) {
      if (b.dataset.bound) return;
      b.dataset.bound = '1';
      b.addEventListener('click', function (ev) {
        ev.preventDefault();
        var on = toggleSaved(b.getAttribute('data-save'));
        $all('[data-save="' + b.getAttribute('data-save') + '"]').forEach(function (x) {
          x.setAttribute('aria-pressed', on);
          var span = x.querySelector('span:last-child');
          if (span) span.textContent = x.hasAttribute('data-save-long') ? (on ? 'Saved to shortlist' : 'Save to shortlist') : (on ? 'Saved' : 'Save');
        });
      });
    });
  }

  /* --- Course card (R34) ------------------------------------------------ */
  function courseCard(c) {
    var tags = '<span class="tag tag-solid">' + esc(c.level) + '</span><span class="tag">' + esc(c.mode) + '</span>';
    if (c.funding && c.funding.indexOf('16-18') > -1) tags += '<span class="tag tag-soft">Free for 16–18</span>';
    return '<article class="course-card">' +
      imgPh(imgFor(c), 'Image 3:2 &middot; ' + esc(c.image)) +
      '<div class="course-card-body">' +
      '<div class="tags">' + tags + '</div>' +
      '<h3><a href="' + BASE + 'course.html?id=' + c.id + '">' + esc(c.title) + '</a></h3>' +
      '<dl><dt>Subject</dt><dd>' + esc(c.subject) + '</dd><dt>Starts</dt><dd>' + esc(c.start) + '</dd><dt>Duration</dt><dd>' + esc(c.duration) + '</dd><dt>Campus</dt><dd>' + esc(c.campus) + '</dd></dl>' +
      '<div class="card-actions">' + saveButton(c.id) + '</div>' +
      '</div></article>';
  }
  function eventCard(e) {
    var d = new Date(e.date + 'T12:00:00');
    return '<article class="event-card">' +
      '<div class="date-block" aria-hidden="true"><span>' + DAYS[d.getDay()].slice(0, 3) + '</span><b>' + d.getDate() + '</b><span>' + MONTHS[d.getMonth()].slice(0, 3) + '</span></div>' +
      '<div><span class="overline">' + esc(e.type) + '</span><h3><a href="' + BASE + 'event.html?id=' + e.id + '">' + esc(e.title) + '</a></h3>' +
      '<p class="meta"><time datetime="' + e.date + '">' + fmtDate(e.date) + ', ' + e.start + ' to ' + e.end + '</time> &middot; ' + esc(e.campus) + '</p>' +
      statusTag(e.status) + '</div></article>';
  }

  /* --- Header: mobile menu + current section ---------------------------- */
  function initHeader() {
    var btn = $('.menu-btn');
    var nav = $('#site-nav');
    var backdrop = $('.flyout-backdrop');
    var desktop = window.matchMedia('(min-width: 1024px)');
    var items = $all('.mega-item');
    var hoverTimer = null;
    var closeTimer = null;

    function setMenu(open) {
      if (!nav || !btn) return;
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open);
      $('.menu-label', btn).textContent = open ? 'Close' : 'Menu';
      if (!open) closeAll(false);
    }
    function closeAll(restoreFocusTo) {
      items.forEach(function (it) {
        it.classList.remove('open');
        var t = $('.mega-trigger', it);
        t.setAttribute('aria-expanded', 'false');
        $('.mega-panel', it).hidden = true;
      });
      if (nav) nav.classList.remove('drilled');
      if (backdrop) backdrop.classList.remove('active');
      if (restoreFocusTo) restoreFocusTo.focus();
    }
    function openItem(it, focusFirst) {
      if (it.classList.contains('open')) return;
      closeAll(false);
      it.classList.add('open');
      $('.mega-trigger', it).setAttribute('aria-expanded', 'true');
      $('.mega-panel', it).hidden = false;
      if (desktop.matches) { if (backdrop) backdrop.classList.add('active'); }
      else nav.classList.add('drilled');
      if (focusFirst) {
        // Mobile: focus "Main menu" (no surprise keyboard); desktop keyboard users land in the panel
        var f = desktop.matches ? $('.mega-panel input, .mega-panel a', it) : $('[data-mega-back]');
        if (f) f.focus();
      }
    }

    if (btn && nav) {
      btn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
    }
    items.forEach(function (it) {
      var trigger = $('.mega-trigger', it);
      trigger.addEventListener('click', function () {
        if (it.classList.contains('open') && desktop.matches) { closeAll(false); return; }
        openItem(it, !desktop.matches);
      });
      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); openItem(it, true); }
      });
      // Hover intent on desktop: open after a short pause, so moving the mouse across the bar doesn't flash panels
      it.addEventListener('mouseenter', function () {
        if (!desktop.matches) return;
        window.clearTimeout(closeTimer);
        window.clearTimeout(hoverTimer);
        hoverTimer = window.setTimeout(function () { openItem(it, false); }, $('.mega-item.open') ? 60 : 180);
      });
      it.addEventListener('mouseleave', function () {
        if (!desktop.matches) return;
        window.clearTimeout(hoverTimer);
        closeTimer = window.setTimeout(function () {
          var focusedInside = it.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
          if (!focusedInside) closeAll(false);
        }, 300);
      });
      // Desktop: leaving the panel with Tab closes it
      it.addEventListener('focusout', function () {
        if (!desktop.matches) return;
        window.setTimeout(function () { if (!it.contains(document.activeElement)) { it.classList.remove('open'); $('.mega-trigger', it).setAttribute('aria-expanded', 'false'); $('.mega-panel', it).hidden = true; if (!$('.mega-item.open') && backdrop) backdrop.classList.remove('active'); } }, 10);
      });
    });
    var back = $('[data-mega-back]');
    if (back) back.addEventListener('click', function () {
      var open = $('.mega-item.open');
      closeAll(open ? $('.mega-trigger', open) : null);
    });
    if (backdrop) backdrop.addEventListener('click', function () { closeAll(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = $('.mega-item.open');
      if (open) { closeAll($('.mega-trigger', open)); return; }
      if (nav && nav.classList.contains('open')) { setMenu(false); btn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (desktop.matches && $('.mega-item.open') && !e.target.closest('.site-header')) closeAll(false);
    });
    desktop.addEventListener ? desktop.addEventListener('change', function () { closeAll(false); setMenu(false); }) : null;

    // Courses tabs: click, hover or arrow keys switch the audience panel
    var tabs = $all('.mega-tabs [role="tab"]');
    function selectTab(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { selectTab(t, false); });
      t.addEventListener('mouseenter', function () { if (desktop.matches) selectTab(t, false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (n) { e.preventDefault(); selectTab(n, true); }
      });
    });
    $all('[data-count-age]').forEach(function (el) {
      var a = el.getAttribute('data-count-age');
      el.textContent = COURSES.filter(function (c) { return c.ageGroups.indexOf(a) > -1; }).length;
    });

    // Upcoming events in the Events menu
    var ne = $('[data-nav-events]');
    if (ne) ne.innerHTML = EVENTS.slice(0, 2).map(eventCard).join('');

    initNavSearch();

    var section = document.body.getAttribute('data-section');
    if (section) {
      var cur = $('.mega-item[data-section="' + section + '"] .mega-trigger');
      if (cur) cur.setAttribute('aria-current', 'page');
    }
    updateShortlistCounts();
  }

  /* --- Live course search inside the Courses menu (V2-01) --------------- */
  function highlight(text, q) {
    var i = text.toLowerCase().indexOf(q);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }
  function initNavSearch() {
    var form = $('[data-nav-search]');
    if (!form) return;
    var input = $('input', form);
    var results = $('[data-nav-results]');
    var tabsWrap = $('.mega-body-courses .mega-tabs');
    var panels = $('.mega-body-courses .mega-tabpanels');
    function render() {
      var q = input.value.trim().toLowerCase();
      if (q.length < 2) { results.hidden = true; tabsWrap.hidden = false; panels.hidden = false; form.parentNode.classList.remove('is-searching'); return; }
      var courses = COURSES.filter(function (c) {
        return (c.title + ' ' + c.subject + ' ' + (c.h1 || '') + ' ' + c.careers.join(' ')).toLowerCase().indexOf(q) > -1;
      });
      var subjects = DATA.subjects.filter(function (s) { return s.title.toLowerCase().indexOf(q) > -1; }).slice(0, 3);
      var careers = [];
      COURSES.forEach(function (c) { c.careers.forEach(function (k) { if (k.indexOf(q) > -1 && careers.indexOf(k) === -1) careers.push(k); }); });
      careers = careers.slice(0, 3);
      var html = '<p class="result-count" role="status">' + courses.length + (courses.length === 1 ? ' course' : ' courses') + ' for “' + esc(input.value.trim()) + '”</p>';
      html += '<div class="mega-results-cols"><div>';
      if (courses.length) html += '<h3>Courses</h3><ul>' + courses.slice(0, 5).map(function (c) {
        return '<li><a class="res" href="' + BASE + 'course.html?id=' + c.id + '"><span><span class="res-title" title="' + esc(c.title) + '">' + highlight(c.title, q) + '</span><small>' + esc(c.subject) + ' &middot; ' + esc(c.duration) + '</small></span><span class="tag tag-solid">' + esc(c.level) + '</span></a></li>';
      }).join('') + '</ul>';
      html += '</div><div>';
      if (careers.length) html += '<h3>Careers</h3><ul>' + careers.map(function (k) {
        return '<li><a class="res" href="' + BASE + 'courses.html?mode=career&q=' + encodeURIComponent(k) + '"><span>I want to be a ' + highlight(k, q) + '</span></a></li>';
      }).join('') + '</ul>';
      if (subjects.length) html += '<h3>Subjects</h3><ul>' + subjects.map(function (s) {
        return '<li><a class="res" href="' + BASE + 'courses.html?subject=' + s.id + '"><span>' + highlight(s.title, q) + '</span></a></li>';
      }).join('') + '</ul>';
      html += '</div></div>';
      if (!courses.length && !careers.length && !subjects.length) html += '<p>Nothing matches yet. Try a subject such as “construction”, or call our careers team on <a href="tel:01245293031">01245 293031</a>.</p>';
      else html += '<a class="mega-all" href="' + BASE + 'courses.html?q=' + encodeURIComponent(input.value.trim()) + '">See all results</a>';
      results.innerHTML = html;
      results.hidden = false; tabsWrap.hidden = true; panels.hidden = true; form.parentNode.classList.add('is-searching');
    }
    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' && !results.hidden) { var a = $('a', results); if (a) { e.preventDefault(); a.focus(); } }
    });
    results.addEventListener('keydown', function (e) {
      var links = $all('a', results); var i = links.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' && i < links.length - 1) { e.preventDefault(); links[i + 1].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); if (i > 0) links[i - 1].focus(); else input.focus(); }
    });
  }

  /* --- Site-wide search (V3-02): overlay from the header, plus a full results page */
  var SITE_PAGES = [
    { t: 'Make a payment', u: 'pay.html', s: 'Information', k: 'pay payment deposit materials fee fees trip card online pay parent carer receipt', d: 'Pay a course deposit, materials fee or trip online. Students and parents or carers can pay without an account.', bet: ['pay', 'payment', 'payments', 'deposit', 'trip', 'materials fee'] },
    { t: 'How to apply', u: 'apply.html', s: 'Information', k: 'apply application applying form enrol enrolment interview offer', d: 'Apply online for any course. We’ll invite you to an interview and help you choose the right level.', bet: ['apply', 'application', 'how to apply'] },
    { t: 'Track your application', u: 'application.html?id=374', s: 'Information', k: 'application status track interview book offer enrol', d: 'See where your application is up to and book your interview.' },
    { t: 'Parents and carers', u: 'parents.html', s: 'Information', k: 'parent parents carer carers mum dad guardian support safeguarding', d: 'Everything you need to help your young person choose a course, apply and settle in at college.', bet: ['parents', 'parent', 'carers'] },
    { t: 'Employers', u: 'employers.html', s: 'Information', k: 'employer employers business apprentice apprenticeship hire vacancy levy t level placement', d: 'Take on an apprentice, host a T Level placement or train your staff.', bet: ['employer', 'employers', 'hire an apprentice'] },
    { t: 'Advertise an apprenticeship vacancy', u: 'employers.html#vacancy-title', s: 'Information', k: 'vacancy advertise apprentice apprenticeship employer hire job', d: 'Tell us about the role in three short steps and our team will find you candidates.' },
    { t: 'Events and open days', u: 'events.html', s: 'Information', k: 'events open evening open day taster tour visit', d: 'Open evenings, taster days and information sessions, in person and online.', bet: ['open evening', 'open day', 'open days', 'events'] },
    { t: 'Not sure what to study?', u: 'match.html', s: 'Information', k: 'quiz choose help decide course matcher careers advice not sure', d: 'Answer four quick questions and we’ll suggest courses that suit you.' },
    { t: 'My shortlist', u: 'shortlist.html', s: 'Information', k: 'shortlist saved favourites compare', d: 'Courses you’ve saved, side by side, ready to share with a parent or carer.' },
    { t: 'Find a course', u: 'courses.html', s: 'Courses', k: 'courses course search find study subjects levels', d: 'Search all our courses and filter by who they’re for, subject, level, study mode and campus.', bet: ['courses', 'course'] },
    { t: 'Apprenticeships', u: 'courses.html?q=apprenticeship', s: 'Courses', k: 'apprenticeship apprenticeships apprentice earn learn work based', d: 'Earn while you learn, with a job and a qualification.' },
    { t: 'Term dates', u: '#', s: 'Information', k: 'term dates holidays half term calendar year christmas easter', d: 'Term and holiday dates for the current and next academic year.', bet: ['term dates', 'term', 'holidays', 'half term'] },
    { t: 'Fees and financial support', u: '#', s: 'Information', k: 'fees funding money cost free bursary bursaries loan advanced learner loan 24+ grant hardship free meals', d: 'What courses cost, who studies for free, Advanced Learner Loans and bursaries for travel, meals and kit.', bet: ['fees', 'funding', 'bursary', 'money', 'cost'] },
    { t: 'Travel to college', u: '#', s: 'Information', k: 'travel bus buses train transport parking bike cycle getting here directions', d: 'Buses, trains, parking and help with travel costs for both campuses.', bet: ['bus', 'buses', 'travel', 'parking'] },
    { t: 'SEND and learning support', u: '#', s: 'Information', k: 'send sen special educational needs ehcp learning support disability dyslexia inspire transition', d: 'Support for learners with special educational needs and disabilities, including EHCPs and the INSPIRE programmes.' },
    { t: 'Display settings', u: '#a11y', s: 'Information', k: 'accessibility text size contrast dyslexia reading display settings larger text', d: 'Make the site easier to read: larger text, high contrast, reading spacing and reduced motion.', a11y: true },
    { t: 'Safeguarding and wellbeing', u: '#', s: 'Information', k: 'safeguarding safe safety wellbeing mental health worried concern', d: 'How we keep students safe and who to talk to if you’re worried.' },
    { t: 'Current students', u: '#', s: 'Information', k: 'current students timetable moodle email login it wifi student id', d: 'Timetables, IT log-ins, student ID cards and support for current students.' },
    { t: 'Contact us', u: '#', s: 'Information', k: 'contact phone email address call switchboard', d: 'Main switchboard 01245 265611. Careers and course advice 01245 293031.' },
    { t: 'Jobs at the college', u: '#', s: 'Information', k: 'jobs vacancies careers work for us staff recruitment teaching', d: 'Teaching and support roles at Chelmsford College.' }
  ];
  var SITE_FAQS = [
    { t: 'Do I have to pay for my course?', s: 'Help', k: 'fees cost free pay money tuition', d: 'Most full-time courses are free if you’re 16 to 18. Adults may be able to study for free or with an Advanced Learner Loan. Each course page has a fee checker.' },
    { t: 'When can I apply?', s: 'Help', k: 'apply when deadline application closing date', d: 'You can apply at any time. We recommend applying early, as popular courses fill up.' },
    { t: 'What grades do I need?', s: 'Help', k: 'grades entry requirements gcse qualifications need', d: 'Each course lists its entry requirements. If you’re not sure which level suits you, our advice team can help.' },
    { t: 'Can I visit before I apply?', s: 'Help', k: 'visit tour open evening look around', d: 'Yes. Come to an Open Evening or book a taster day to see the campus and meet tutors.' },
    { t: 'How do I get to college?', s: 'Help', k: 'bus travel train transport get to college', d: 'Both campuses are close to Chelmsford city centre. Help with travel costs is available for eligible students.' }
  ];
  var SITE_NEWS = [
    { t: 'Students celebrate end-of-year awards', s: 'News', k: 'awards ceremony celebration achievement', d: 'Learners from every subject were recognised at this year’s ceremony.' }
  ];
  var SYNONYMS = { money: 'fees funding', cost: 'fees', costs: 'fees', price: 'fees', free: 'fees', bus: 'travel', buses: 'travel', train: 'travel', holiday: 'term', holidays: 'term', nursing: 'nurse', hair: 'hairdressing', chef: 'catering', cooking: 'catering', builder: 'construction', building: 'construction', computer: 'ict digital', computing: 'ict digital', it: 'ict digital', open: 'open evening', visit: 'open evening' };
  /* Everyday words that should only widen the search across information and help, not courses */
  var INFO_ONLY = { money: 1, cost: 1, costs: 1, price: 1, free: 1, bus: 1, buses: 1, train: 1, holiday: 1, holidays: 1, open: 1, visit: 1 };
  var INFO_TYPES = { page: 1, help: 1, news: 1, event: 1 };
  var TYPE_LABELS = { course: 'Courses', subject: 'Subjects', career: 'Careers', event: 'Events', page: 'Information', help: 'Help', news: 'News' };
  var TYPE_ONE = { course: 'Course', subject: 'Subject', career: 'Career', event: 'Event', page: 'Information', help: 'Help', news: 'News' };
  var TYPE_ORDER = ['course', 'subject', 'career', 'event', 'page', 'help', 'news'];

  function clip(t, n) { t = t.replace(/\s+/g, ' ').trim(); if (t.length <= n) return t; var c = t.slice(0, n); return c.slice(0, c.lastIndexOf(' ')).replace(/[,.;:]$/, '') + '…'; }
  var siteIndex = null;
  function buildSiteIndex() {
    if (siteIndex) return siteIndex;
    var idx = [];
    COURSES.forEach(function (c) {
      idx.push({ type: 'course', t: c.title, u: 'course.html?id=' + c.id, s: 'Courses › ' + c.subject, k: c.subject + ' ' + (c.h1 || '') + ' ' + c.level + ' ' + c.mode + ' ' + c.careers.join(' '), d: clip(firstPara(c.overview || c.courseForMe), 180), tag: c.level, img: imgFor(c) });
    });
    DATA.subjects.forEach(function (s) {
      var n = COURSES.filter(function (c) { return c.subjectId === s.id; }).length;
      if (!n) return;
      idx.push({ type: 'subject', t: s.title, u: 'subject.html?id=' + s.id, s: 'Subjects', k: 'subject ' + s.title, d: clip(s.description || '', 180), tag: n + (n === 1 ? ' course' : ' courses') });
    });
    var careers = [];
    COURSES.forEach(function (c) { c.careers.forEach(function (k) { if (careers.indexOf(k) === -1) careers.push(k); }); });
    careers.forEach(function (k) {
      var n = COURSES.filter(function (c) { return c.careers.indexOf(k) > -1; }).length;
      idx.push({ type: 'career', t: 'I want to be a ' + k, u: 'courses.html?mode=career&q=' + encodeURIComponent(k), s: 'Careers', k: k + ' career job', d: n + (n === 1 ? ' course leads' : ' courses lead') + ' towards becoming a ' + k + '.' });
    });
    EVENTS.forEach(function (e) {
      idx.push({ type: 'event', t: e.title, u: 'event.html?id=' + e.id, s: 'Events › ' + e.type, k: e.type + ' ' + e.campus + ' event', d: e.summary, tag: fmtDate(e.date) });
    });
    SITE_PAGES.forEach(function (p) { idx.push(Object.assign({ type: 'page' }, p)); });
    SITE_FAQS.forEach(function (p) { idx.push(Object.assign({ type: 'help', u: '#' }, p)); });
    SITE_NEWS.forEach(function (p) { idx.push(Object.assign({ type: 'news', u: '#' }, p)); });
    idx.forEach(function (it) {
      it._t = it.t.toLowerCase(); it._k = (it.k || '').toLowerCase(); it._d = (it.d || '').toLowerCase();
      var split = function (x) { return x.split(/[^a-z0-9+]+/).filter(Boolean); };
      it._tw = split(it._t); it._kw = split(it._k); it._dw = split(it._d);
      it._words = it._tw.concat(it._kw);
    });
    siteIndex = idx;
    return idx;
  }
  function tokens(q) { return q.toLowerCase().split(/[^a-z0-9+]+/).filter(function (w) { return w.length > 1 || /\d/.test(w); }); }
  /* Whole words for short terms ("bus" is not "business"), word starts for longer ones ("hair" finds "hairdressing") */
  function wordsHit(list, w) {
    for (var i = 0; i < list.length; i++) { if (w.length < 4 ? list[i] === w : list[i].indexOf(w) === 0) return true; }
    return false;
  }
  function wordHit(it, w) { return wordsHit(it._tw, w) || wordsHit(it._kw, w) || wordsHit(it._dw, w); }
  function siteSearch(raw) {
    var q = raw.trim().toLowerCase();
    var idx = buildSiteIndex();
    var words = tokens(q);
    if (!words.length) return { results: [], best: null };
    var results = [];
    idx.forEach(function (it) {
      var score = 0, all = true;
      words.forEach(function (w) {
        var alt = SYNONYMS[w];
        if (alt && INFO_ONLY[w] && !INFO_TYPES[it.type]) alt = null;
        var hit = wordHit(it, w) || (alt && alt.split(' ').some(function (a) { return wordHit(it, a); }));
        if (!hit) { all = false; return; }
        if (wordsHit(it._tw, w)) score += 4;
        else if (wordsHit(it._kw, w) || (alt && wordsHit(it._kw, alt.split(' ')[0]))) score += 2;
        else score += 1;
        if (it._words.indexOf(w) > -1) score += 1;
      });
      if (!all) return;
      if (it._t === q) score += 12; else if (it._t.indexOf(q) === 0) score += 6; else if (it._t.indexOf(q) > -1) score += 3;
      if (it.type === 'page') score += 1;
      results.push({ it: it, score: score });
    });
    results.sort(function (a, b) { return b.score - a.score || TYPE_ORDER.indexOf(a.it.type) - TYPE_ORDER.indexOf(b.it.type); });
    var best = null;
    idx.forEach(function (it) { if (!best && it.bet && it.bet.indexOf(q) > -1) best = it; });
    if (!best) DATA.subjects.forEach(function (s) { if (!best && s.title.toLowerCase() === q) best = idx.filter(function (x) { return x.type === 'subject' && x.t === s.title; })[0] || null; });
    return { results: results.map(function (r) { return r.it; }), best: best };
  }
  function lev(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) d[i] = [i];
    for (j = 0; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  function spellSuggest(raw) {
    var vocab = {};
    buildSiteIndex().forEach(function (it) { it._words.forEach(function (w) { if (w.length > 3) vocab[w] = 1; }); });
    var changed = false;
    var out = tokens(raw).map(function (w) {
      if (vocab[w] || SYNONYMS[w]) return w;
      var bestW = null, bestD = 3;
      Object.keys(vocab).forEach(function (v) { if (Math.abs(v.length - w.length) > 2) return; var dd = lev(w, v); if (dd < bestD) { bestD = dd; bestW = v; } });
      if (bestW && bestD <= (w.length > 6 ? 2 : 1)) { changed = true; return bestW; }
      return w;
    });
    return changed ? out.join(' ') : null;
  }
  function hlWords(text, raw) {
    var html = esc(text);
    tokens(raw).forEach(function (w) {
      if (w.length < 2) return;
      html = html.replace(new RegExp('(^|[^<\\w&])(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '$1<mark>$2</mark>');
    });
    return html;
  }
  function itemHref(it) {
    if (!it.u || it.u === '#') return '#';
    if (it.u === '#a11y') return '#';
    return BASE + it.u;
  }
  function itemAttrs(it) { return it.a11y ? ' data-modal-open="a11y-modal"' : ''; }

  function initSiteSearchOverlay() {
    var overlay = $('#site-search');
    var openers = $all('[data-site-search-open]');
    if (!overlay || !openers.length) return;
    var input = $('#ss-q'), results = $('[data-ss-results]'), idle = $('[data-ss-idle]');
    var lastFocus = null;
    function open(e) {
      if (document.body.hasAttribute('data-site-search-page')) { e.preventDefault(); var pq = $('#search-q'); if (pq) { pq.focus(); pq.select(); } return; }
      e.preventDefault();
      lastFocus = document.activeElement;
      overlay.hidden = false;
      document.documentElement.classList.add('ss-open');
      openers.forEach(function (o) { o.setAttribute('aria-expanded', 'true'); });
      window.setTimeout(function () { input.focus(); }, 20);
    }
    function close() {
      overlay.hidden = true;
      document.documentElement.classList.remove('ss-open');
      openers.forEach(function (o) { o.setAttribute('aria-expanded', 'false'); });
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    openers.forEach(function (o) { o.setAttribute('aria-expanded', 'false'); o.addEventListener('click', open); });
    $('[data-site-search-close]', overlay).addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {
        var f = $all('a[href], button:not([hidden]), input', overlay).filter(function (x) { return x.offsetParent !== null; });
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    $all('[data-modal-open]', overlay).forEach(function (b) { b.addEventListener('click', close); });
    function render() {
      var raw = input.value.trim();
      if (raw.length < 2) { results.hidden = true; idle.hidden = false; return; }
      var r = siteSearch(raw);
      var groups = {};
      r.results.forEach(function (it) { (groups[it.type] = groups[it.type] || []).push(it); });
      var html = '<p class="result-count" role="status">' + r.results.length + (r.results.length === 1 ? ' result' : ' results') + ' for “' + esc(raw) + '”</p>';
      if (r.best) html += '<a class="ss-best" href="' + itemHref(r.best) + '"' + itemAttrs(r.best) + '><span class="overline">Best match</span><strong>' + esc(r.best.t) + '</strong><span>' + esc(r.best.d) + '</span></a>';
      html += '<div class="ss-groups">';
      TYPE_ORDER.forEach(function (type) {
        var g = groups[type];
        if (!g) return;
        html += '<div class="ss-group"><h2 class="ss-heading">' + TYPE_LABELS[type] + ' <span class="ss-count">' + g.length + '</span></h2><ul>' + g.slice(0, type === 'course' ? 4 : 3).map(function (it) {
          return '<li><a class="res" href="' + itemHref(it) + '"' + itemAttrs(it) + '><span>' + hlWords(it.t, raw) + (it.tag ? '<small>' + esc(it.tag) + '</small>' : '') + '</span></a></li>';
        }).join('') + '</ul>' + (g.length > (type === 'course' ? 4 : 3) ? '<a class="ss-more" href="' + BASE + 'search.html?q=' + encodeURIComponent(raw) + '&type=' + type + '">All ' + g.length + ' ' + TYPE_LABELS[type].toLowerCase() + '</a>' : '') + '</div>';
      });
      html += '</div>';
      if (!r.results.length) {
        var sp = spellSuggest(raw);
        html += '<p>' + (sp ? 'Did you mean <a href="' + BASE + 'search.html?q=' + encodeURIComponent(sp) + '">' + esc(sp) + '</a>? ' : 'Nothing matches yet. ') + 'Try another word, or call our advice team on <a href="tel:01245293031">01245 293031</a>.</p>';
      } else {
        html += '<a class="mega-all" href="' + BASE + 'search.html?q=' + encodeURIComponent(raw) + '">See all ' + r.results.length + ' results</a>';
      }
      results.innerHTML = html;
      $all('[data-modal-open]', results).forEach(function (b) { b.addEventListener('click', close); });
      results.hidden = false; idle.hidden = true;
    }
    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' && !results.hidden) { var a = $('a', results); if (a) { e.preventDefault(); a.focus(); } }
    });
    results.addEventListener('keydown', function (e) {
      var links = $all('a', results); var i = links.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' && i < links.length - 1) { e.preventDefault(); links[i + 1].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); if (i > 0) links[i - 1].focus(); else input.focus(); }
    });
  }

  function initSiteSearchPage() {
    if (!document.body.hasAttribute('data-site-search-page')) return;
    var form = $('#search-form'), input = $('#search-q');
    var status = $('#search-status'), list = $('#search-results'), typesEl = $('#search-types');
    var bestEl = $('#search-best'), more = $('#search-more'), empty = $('#search-empty'), spell = $('#search-spell');
    var courseLink = $('#search-course-link');
    var p = params();
    var state = { q: p.get('q') || '', type: p.get('type') || 'all', shown: 10 };
    input.value = state.q;
    function sync() {
      var u = new URLSearchParams();
      if (state.q) u.set('q', state.q);
      if (state.type !== 'all') u.set('type', state.type);
      var qs = u.toString();
      try { history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* file:// */ }
      document.title = (state.q ? '“' + state.q + '”: search' : 'Search') + ' | Chelmsford College prototype';
    }
    function card(it) {
      var meta = it.s || TYPE_LABELS[it.type];
      return '<li class="search-result search-result-' + it.type + '">' +
        '<span class="overline">' + esc(TYPE_ONE[it.type]) + '</span>' +
        '<h2><a href="' + itemHref(it) + '"' + itemAttrs(it) + '>' + hlWords(it.t, state.q) + '</a></h2>' +
        (it.d ? '<p>' + hlWords(it.d, state.q) + '</p>' : '') +
        '<p class="search-meta">' + esc(meta) + (it.tag ? ' <span class="tag">' + esc(it.tag) + '</span>' : '') + '</p></li>';
    }
    function render() {
      sync();
      courseLink.setAttribute('href', BASE + 'courses.html' + (state.q ? '?q=' + encodeURIComponent(state.q) : ''));
      spell.hidden = true; bestEl.innerHTML = ''; empty.hidden = true;
      if (!state.q.trim()) {
        status.textContent = 'Type a word or two to search courses, events, information and help.';
        typesEl.innerHTML = ''; list.innerHTML = ''; more.hidden = true;
        empty.hidden = false;
        empty.innerHTML = popularHtml();
        return;
      }
      var r = siteSearch(state.q);
      var counts = {};
      r.results.forEach(function (it) { counts[it.type] = (counts[it.type] || 0) + 1; });
      if (state.type !== 'all' && !counts[state.type]) state.type = 'all';
      var btns = '<button type="button" class="chip" data-type="all" aria-pressed="' + (state.type === 'all') + '">All <span class="ss-count">' + r.results.length + '</span></button>';
      TYPE_ORDER.forEach(function (t) {
        if (!counts[t]) return;
        btns += '<button type="button" class="chip" data-type="' + t + '" aria-pressed="' + (state.type === t) + '">' + TYPE_LABELS[t] + ' <span class="ss-count">' + counts[t] + '</span></button>';
      });
      typesEl.innerHTML = r.results.length ? btns : '';
      var shownList = state.type === 'all' ? r.results : r.results.filter(function (it) { return it.type === state.type; });
      status.textContent = r.results.length
        ? (state.type === 'all' ? r.results.length + (r.results.length === 1 ? ' result' : ' results') : shownList.length + ' ' + TYPE_LABELS[state.type].toLowerCase()) + ' for “' + state.q + '”'
        : 'No results for “' + state.q + '”';
      if (r.best && state.type === 'all') {
        bestEl.innerHTML = '<a class="ss-best search-best" href="' + itemHref(r.best) + '"' + itemAttrs(r.best) + '><span class="overline">Best match</span><strong>' + esc(r.best.t) + '</strong><span>' + esc(r.best.d) + '</span></a>';
      }
      list.innerHTML = shownList.slice(0, state.shown).map(card).join('');
      more.hidden = shownList.length <= state.shown;
      more.textContent = 'Show more results (' + (shownList.length - state.shown) + ' more)';
      var sp = spellSuggest(state.q);
      if (sp && r.results.length < 3) { spell.hidden = false; spell.innerHTML = 'Did you mean <a href="?q=' + encodeURIComponent(sp) + '" data-spell="' + esc(sp) + '">' + esc(sp) + '</a>?'; }
      if (!r.results.length) {
        empty.hidden = false;
        empty.innerHTML = '<div class="search-none"><h2>We couldn’t find anything for “' + esc(state.q) + '”</h2><ul><li>Check the spelling, or try fewer words</li><li>Try a general word such as “construction” or “fees”</li><li>Call our advice team on <a href="tel:01245293031">01245 293031</a></li></ul></div>' + popularHtml();
      }
    }
    function popularHtml() {
      return '<h2 class="ss-heading">Popular searches</h2><ul class="chip-row ss-popular">' + [['open evening', 'Open evening'], ['fees', 'Fees and funding'], ['apprenticeships', 'Apprenticeships'], ['term dates', 'Term dates'], ['bus', 'Buses and travel'], ['payment', 'Make a payment']].map(function (w) {
        return '<li><a class="chip" href="?q=' + encodeURIComponent(w[0]) + '" data-spell="' + w[0] + '">' + esc(w[1]) + '</a></li>';
      }).join('') + '</ul>';
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); state.q = input.value.trim(); state.type = 'all'; state.shown = 10; render(); });
    var t = null;
    input.addEventListener('input', function () { window.clearTimeout(t); t = window.setTimeout(function () { state.q = input.value.trim(); state.shown = 10; render(); }, 250); });
    typesEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-type]'); if (!b) return;
      state.type = b.getAttribute('data-type'); state.shown = 10; render();
      var nb = $('[data-type="' + state.type + '"]', typesEl); if (nb) nb.focus();
    });
    more.addEventListener('click', function () {
      var before = state.shown; state.shown += 10; render();
      var items = $all('.search-result a', list); if (items[before]) items[before].focus();
    });
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-spell]'); if (!a) return;
      e.preventDefault(); state.q = a.getAttribute('data-spell'); input.value = state.q; state.type = 'all'; state.shown = 10; render(); input.focus();
    });
    render();
  }

  /* --- Level explainer highlight ---------------------------------------- */
  function initLevelLinks() {
    document.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-modal-open="level-modal"]');
      if (!t) return;
      var lv = t.getAttribute('data-level');
      $all('#level-modal tr[data-level]').forEach(function (tr) { tr.classList.toggle('current', tr.getAttribute('data-level') === lv); });
    });
  }

  /* --- Course search panel (R11 R31 R32) -------------------------------- */
  function initSearchPanels() {
    $all('[data-search-panel]').forEach(function (panel) {
      var form = $('form', panel);
      var input = $('input[type="search"]', panel);
      var modeInput = $('input[name="mode"]', panel);
      var label = $('label[for="' + input.id + '"]', panel);
      var list = $('.suggest', panel);
      function setMode(mode) {
        modeInput.value = mode;
        $all('.search-mode button', panel).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === mode); });
        label.textContent = mode === 'career' ? 'What job would you like to do?' : 'Search by subject or course';
        input.placeholder = mode === 'career' ? 'e.g. nurse, electrician, chef, solicitor' : 'e.g. fashion, plumbing, business';
      }
      $all('.search-mode button', panel).forEach(function (b) {
        b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); input.focus(); });
      });
      if (params().get('mode') === 'career' && !document.body.hasAttribute('data-results')) setMode('career');

      input.addEventListener('input', function () {
        var q = input.value.trim().toLowerCase();
        if (q.length < 2) { list.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
        var subjects = DATA.subjects.filter(function (s) { return s.title.toLowerCase().indexOf(q) > -1; }).slice(0, 3);
        var courses = COURSES.filter(function (c) { return c.title.toLowerCase().indexOf(q) > -1; }).slice(0, 4);
        var careers = [];
        COURSES.forEach(function (c) { c.careers.forEach(function (k) { if (k.indexOf(q) === 0 && careers.indexOf(k) === -1) careers.push(k); }); });
        careers = careers.slice(0, 4);
        var html = '';
        if (careers.length) html += '<li><h3>Careers</h3></li>' + careers.map(function (k) { return '<li><a href="' + BASE + 'courses.html?mode=career&q=' + encodeURIComponent(k) + '">I want to be a ' + esc(k) + '</a></li>'; }).join('');
        if (subjects.length) html += '<li><h3>Subjects</h3></li>' + subjects.map(function (s) { return '<li><a href="' + BASE + 'courses.html?subject=' + s.id + '">' + esc(s.title) + '</a></li>'; }).join('');
        if (courses.length) html += '<li><h3>Courses</h3></li>' + courses.map(function (c) { return '<li><a href="' + BASE + 'course.html?id=' + c.id + '">' + esc(c.title) + '</a></li>'; }).join('');
        list.innerHTML = html || '<li><a href="' + BASE + 'courses.html?q=' + encodeURIComponent(q) + '">Search all courses for “' + esc(q) + '”</a></li>';
        list.hidden = false;
        input.setAttribute('aria-expanded', 'true');
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { list.hidden = true; input.setAttribute('aria-expanded', 'false'); }
        if (e.key === 'ArrowDown' && !list.hidden) { var a = $('a', list); if (a) { e.preventDefault(); a.focus(); } }
      });
      list.addEventListener('keydown', function (e) {
        var links = $all('a', list); var i = links.indexOf(document.activeElement);
        if (e.key === 'ArrowDown' && i < links.length - 1) { e.preventDefault(); links[i + 1].focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); if (i > 0) links[i - 1].focus(); else input.focus(); }
        if (e.key === 'Escape') { list.hidden = true; input.focus(); }
      });
      document.addEventListener('click', function (e) { if (!panel.contains(e.target)) list.hidden = true; });
    });
  }

  /* --- Homepage --------------------------------------------------------- */
  function initHome() {
    var host = $('[data-home-events]');
    if (host) host.innerHTML = EVENTS.slice(0, 3).map(eventCard).join('');
    var feat = $('[data-home-courses]');
    if (feat) {
      feat.innerHTML = [374, 483, 595].map(courseById).filter(Boolean).map(courseCard).join('');
      bindSaveButtons(feat);
    }
  }

  /* --- Search results (R13 R33) ----------------------------------------- */
  function initResults() {
    var root = $('[data-results]');
    if (!root) return;
    var p = params();
    var state = {
      q: p.get('q') || '',
      mode: p.get('mode') === 'career' ? 'career' : 'course',
      age: p.getAll('age'),
      subject: p.getAll('subject'),
      level: p.getAll('level'),
      campus: p.getAll('campus'),
      sort: p.get('sort') || 'relevance',
      shown: 12
    };
    var input = $('#results-q');
    input.value = state.q;
    var panel = $('[data-search-panel]');
    if (panel) {
      $('input[name="mode"]', panel).value = state.mode;
      $all('.search-mode button', panel).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === state.mode); });
      $('label[for="results-q"]', panel).textContent = state.mode === 'career' ? 'What job would you like to do?' : 'Search by subject or course';
    }

    var GROUPS = [
      { key: 'age', legend: 'Who is it for?', opts: [{ v: '16-18', l: 'School leavers (16–18)' }, { v: 'adult', l: 'Adults (19+)' }, { v: 'supported', l: 'Supported learning' }, { v: 'apprentice', l: 'Apprenticeships', disabled: true }],
        test: function (c, v) { return c.ageGroups.indexOf(v) > -1; } },
      { key: 'subject', legend: 'Subject', opts: DATA.subjects.map(function (s) { return { v: String(s.id), l: s.title }; }),
        test: function (c, v) { return String(c.subjectId) === v; } },
      { key: 'level', legend: 'Level', opts: [{ v: '0', l: 'Entry and supported' }, { v: '1', l: 'Level 1' }, { v: '2', l: 'Level 2' }, { v: '3', l: 'Level 3' }, { v: '4', l: 'Level 4 and above' }],
        test: function (c, v) { return String(c.levelNum) === v; } },
      { key: 'mode', legend: 'Study mode', opts: [{ v: 'Full time', l: 'Full time' }, { v: 'Part time', l: 'Part time' }, { v: 'Evening', l: 'Evening' }, { v: 'Online', l: 'Online' }],
        test: function (c, v) { return c.mode === v || (v === 'Online' && c.campus === 'Online'); } },
      { key: 'campus', legend: 'Campus', opts: [{ v: 'Moulsham Street', l: 'Moulsham Street' }, { v: 'Princes Road', l: 'Princes Road' }, { v: 'Online', l: 'Online' }],
        test: function (c, v) { return c.campus === v; } }
    ];
    state.mode_ = p.getAll('studymode');

    function matchesQuery(c) {
      var q = state.q.trim().toLowerCase();
      if (!q) return true;
      if (state.mode === 'career') return c.careers.some(function (k) { return k.indexOf(q) > -1 || q.indexOf(k) > -1; });
      var hay = (c.title + ' ' + c.subject + ' ' + (c.h1 || '') + ' ' + c.careers.join(' ')).toLowerCase();
      return q.split(/\s+/).every(function (w) { return hay.indexOf(w) > -1; });
    }
    function sel(key) { return key === 'mode' ? state.mode_ : state[key]; }
    function passes(c, skipKey) {
      if (!matchesQuery(c)) return false;
      return GROUPS.every(function (g) {
        if (g.key === skipKey) return true;
        var vals = sel(g.key);
        if (!vals.length) return true;
        return vals.some(function (v) { return g.test(c, v); });
      });
    }

    var filtersEl = $('#filters-body');
    function renderFilters() {
      filtersEl.innerHTML = GROUPS.map(function (g) {
        var opts = g.opts.map(function (o) {
          var count = COURSES.filter(function (c) { return passes(c, g.key) && g.test(c, o.v); }).length;
          var checked = sel(g.key).indexOf(o.v) > -1;
          var disabled = o.disabled || (count === 0 && !checked);
          return '<label class="check' + (disabled ? ' is-disabled' : '') + '"><input type="checkbox" data-filter="' + g.key + '" value="' + esc(o.v) + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '> ' + esc(o.l) + ' <span class="count">' + count + '</span></label>';
        }).join('');
        return '<fieldset class="filter-group"><legend>' + g.legend + '</legend><div>' + opts + '</div></fieldset>';
      }).join('');
      $all('input[data-filter]', filtersEl).forEach(function (cb) {
        cb.addEventListener('change', function () {
          var key = cb.getAttribute('data-filter');
          var arr = sel(key);
          var i = arr.indexOf(cb.value);
          if (cb.checked && i === -1) arr.push(cb.value);
          if (!cb.checked && i > -1) arr.splice(i, 1);
          state.shown = 12;
          update(true);
          var again = $('input[data-filter="' + key + '"][value="' + cb.value + '"]', filtersEl);
          if (again) again.focus();
        });
      });
    }

    function sorted(list) {
      var l = list.slice();
      if (state.sort === 'az') l.sort(function (a, b) { return a.title.localeCompare(b.title); });
      if (state.sort === 'level') l.sort(function (a, b) { return levelSort(a) - levelSort(b); });
      return l;
    }

    function renderChips() {
      var chips = [];
      GROUPS.forEach(function (g) {
        sel(g.key).forEach(function (v) {
          var o = g.opts.filter(function (x) { return x.v === v; })[0];
          chips.push('<button type="button" class="chip" data-remove="' + g.key + '" data-value="' + esc(v) + '" aria-label="Remove filter: ' + esc(o ? o.l : v) + '">' + esc(o ? o.l : v) + ' <span class="x" aria-hidden="true">&times;</span></button>');
        });
      });
      var host = $('#active-filters');
      host.innerHTML = chips.length ? chips.join('') + '<button type="button" class="btn-link" data-clear>Clear all</button>' : '';
      $all('[data-remove]', host).forEach(function (b) {
        b.addEventListener('click', function () {
          var arr = sel(b.getAttribute('data-remove'));
          var i = arr.indexOf(b.getAttribute('data-value'));
          if (i > -1) arr.splice(i, 1);
          update(true);
          var first = $('#active-filters button');
          (first || $('#results-q')).focus();
        });
      });
      var clear = $('[data-clear]', host);
      if (clear) clear.addEventListener('click', function () { GROUPS.forEach(function (g) { sel(g.key).length = 0; }); update(true); $('#results-q').focus(); });
      var n = chips.length;
      $all('[data-filter-count]').forEach(function (el) { el.textContent = n ? '(' + n + ')' : ''; });
    }

    function writeUrl() {
      var u = new URLSearchParams();
      if (state.q) u.set('q', state.q);
      if (state.mode === 'career') u.set('mode', 'career');
      ['age', 'subject', 'level', 'campus'].forEach(function (k) { state[k].forEach(function (v) { u.append(k, v); }); });
      state.mode_.forEach(function (v) { u.append('studymode', v); });
      if (state.sort !== 'relevance') u.set('sort', state.sort);
      var s = u.toString();
      try { window.history.replaceState(null, '', window.location.pathname + (s ? '?' + s : '')); } catch (e) { /* sandboxed */ }
    }

    function update(speak) {
      var list = sorted(COURSES.filter(function (c) { return passes(c); }));
      var count = list.length;
      var AGE_H = { '16-18': 'Courses for school leavers (16–18)', adult: 'Courses for adults (19+)', supported: 'Supported learning courses' };
      var heading = state.q ? (state.mode === 'career' ? 'Courses that can lead to a job as a ' + state.q : 'Courses matching “' + state.q + '”') : (state.age.length === 1 ? AGE_H[state.age[0]] : 'All courses');
      $('#results-title').textContent = heading;
      $('#result-count').textContent = count + (count === 1 ? ' course' : ' courses');
      $all('[data-show-count]').forEach(function (b) { b.textContent = 'Show ' + count + (count === 1 ? ' course' : ' courses'); });
      var hint = $('#career-hint');
      if (state.mode === 'career' && state.q && count) {
        hint.hidden = false;
        hint.innerHTML = '<strong>You searched for a career: ' + esc(state.q) + '.</strong> These courses are a first step towards it. Most careers have more than one route, so <a href="tel:01245293031">talk to a careers adviser</a> if you are not sure.';
      } else { hint.hidden = true; }
      var out = $('#results-list');
      if (!count) {
        out.innerHTML = '<div class="empty-state"><h2>No courses match all of those choices</h2><p>Try removing a filter, searching for a subject instead of a course name, or <a href="courses.html?mode=career">search by career</a>.</p><p>Not sure what to study? Call our careers team on <a href="tel:01245293031">01245 293031</a>.</p></div>';
      } else {
        out.innerHTML = '<div class="card-grid cols-3">' + list.slice(0, state.shown).map(courseCard).join('') + '</div>' +
          (count > state.shown ? '<p style="text-align:center;margin-top:1.5rem"><button type="button" class="btn btn-secondary" data-more>Show more courses (' + (count - state.shown) + ' more)</button></p>' : '');
        bindSaveButtons(out);
        var more = $('[data-more]', out);
        if (more) more.addEventListener('click', function () {
          var firstNew = state.shown; state.shown += 12; update(false);
          var cards = $all('.course-card h3 a', out); if (cards[firstNew]) cards[firstNew].focus();
        });
      }
      renderFilters();
      renderChips();
      writeUrl();
      if (speak) announce(count + (count === 1 ? ' course found' : ' courses found'));
    }

    $('#results-form').addEventListener('submit', function (e) {
      e.preventDefault();
      state.q = input.value.trim();
      state.mode = $('input[name="mode"]', panel).value;
      state.shown = 12;
      $('.suggest', panel).hidden = true;
      update(true);
    });
    $('#sort').value = state.sort;
    $('#sort').addEventListener('change', function () { state.sort = this.value; update(true); });

    // Mobile filter drawer
    var drawer = $('#filters');
    var opener = $('#filters-open');
    function openDrawer() { drawer.classList.add('open'); document.body.style.overflow = 'hidden'; opener.setAttribute('aria-expanded', 'true'); var h = $('#filters-heading'); h.setAttribute('tabindex', '-1'); h.focus(); }
    function closeDrawer() { drawer.classList.remove('open'); document.body.style.overflow = ''; opener.setAttribute('aria-expanded', 'false'); opener.focus(); }
    opener.addEventListener('click', openDrawer);
    $all('[data-filters-close]').forEach(function (b) { b.addEventListener('click', closeDrawer); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer(); });

    update(false);
  }

  /* --- Fee checker (R37) ------------------------------------------------ */
  function feeAdvice(c, age, hasL3) {
    var L = c.levelNum;
    var extra = c.additionalFees ? ' There may also be extra costs for trips or kit (see below).' : '';
    var materials = /£\s?\d+/.test(plain(c.fees)) ? ' You will still need to pay: ' + plain(c.fees) + '.' : '';
    if (age === 'under19') return '<strong>Good news: your tuition is free.</strong> If you are 16, 17 or 18 on 31 August in the year you start, you don’t pay tuition fees.' + materials + extra + ' You may also get help with travel, meals and equipment from our <a href="#">bursary</a>.';
    if (age === '19to23') {
      if (L <= 3 && !hasL3) return '<strong>You can probably study this for free.</strong> If you are 19 to 23 and this is your first full Level 2 or Level 3 qualification, the government pays your tuition.' + materials + ' We will check your eligibility when you apply.';
      return '<strong>You may need to pay or take out a loan.</strong> Because you already have a Level 3, you could use a <a href="#">19+ Advanced Learner Loan</a>. You don’t pay anything back until you earn over the threshold.';
    }
    if (L >= 3) return '<strong>You can use an Advanced Learner Loan.</strong> At 24 or over, Level 3 courses are usually paid for with a 19+ Advanced Learner Loan. If you go on to complete a university degree, the loan for an Access to HE Diploma is written off. If you are unemployed or on a low wage, the course may be free.';
    return '<strong>This course may be free.</strong> Adults on a low wage or receiving certain benefits can often study Level 2 and below for free. Our fees team will confirm when you apply.';
  }
  function initFeeChecker(c) {
    var box = $('[data-fee-checker]');
    if (!box) return;
    var result = $('.fee-result', box);
    function run() {
      var age = $('input[name="fc-age"]:checked', box);
      var l3 = $('input[name="fc-l3"]:checked', box);
      $('[data-l3-group]', box).hidden = !(age && age.value !== 'under19');
      if (!age || (age.value !== 'under19' && !l3)) { result.hidden = true; return; }
      result.innerHTML = feeAdvice(c, age.value, l3 && l3.value === 'yes') + '<p class="muted" style="margin:0.5rem 0 0">This is a guide only. Our fees team confirms your fees when you apply.</p>';
      result.hidden = false;
    }
    $all('input', box).forEach(function (i) { i.addEventListener('change', run); });
  }

  /* --- Course template (R14–R16 R35–R39) -------------------------------- */
  function initCourse() {
    var root = $('[data-course]');
    if (!root) return;
    var c = courseById(params().get('id') || 374) || courseById(374);
    document.title = c.title + ' | Chelmsford College prototype';
    var related = COURSES.filter(function (x) { return x.subjectId === c.subjectId && x.id !== c.id; }).slice(0, 3);
    var events = EVENTS.filter(function (e) { return e.subjects.indexOf(c.subjectId) > -1 || e.type === 'Open event'; }).slice(0, 2);
    var funded = c.funding && c.funding.indexOf('16-18') > -1;
    var isAdult = c.ageGroups.indexOf('adult') > -1;
    var feeLine = plain(c.fees) || (funded ? 'Free for 16–18' : 'Contact us');

    var sections = [
      { id: 'for-me', title: 'Is this course for you?', field: 'C_COURSEFORME', html: c.courseForMe },
      { id: 'learn', title: 'What you’ll learn', field: 'C_STUDYOVERVIEW', html: c.overview },
      { id: 'entry', title: 'Entry requirements', field: 'C_ELIGIBILITY', html: c.eligibility },
      { id: 'assess', title: 'How you’ll be assessed', field: 'C_ASSESSMENT', html: c.assessment },
      { id: 'fees', title: 'Fees and funding', field: 'C_FEES + C_ADDITIONALFEES + course_fund_link', html: 'FEES' },
      { id: 'next', title: 'Where it can lead', field: 'C_EMPLOYABILITY', html: c.employability }
    ].filter(function (s) { return s.html; });

    var feesHtml = '<h3 class="visually-hidden">Fees</h3>' + (c.fees || '<p>Contact us for details.</p>') +
      (c.funding.length ? '<p><strong>Funding:</strong> ' + c.funding.map(esc).join(', ') + '</p>' : '') +
      (c.additionalFees ? '<h3 style="font-size:1rem">Extra costs</h3>' + c.additionalFees : '') +
      '<div class="fee-checker" data-fee-checker><h3>Can I study this for free?</h3>' +
      '<fieldset><legend>How old will you be on 31 August before the course starts?</legend><div class="radio-row">' +
      '<label class="radio-pill"><input type="radio" name="fc-age" value="under19"><span>16 to 18</span></label>' +
      '<label class="radio-pill"><input type="radio" name="fc-age" value="19to23"><span>19 to 23</span></label>' +
      '<label class="radio-pill"><input type="radio" name="fc-age" value="24plus"><span>24 or over</span></label></div></fieldset>' +
      '<fieldset data-l3-group hidden><legend>Do you already have a Level 3 qualification (like A Levels)?</legend><div class="radio-row">' +
      '<label class="radio-pill"><input type="radio" name="fc-l3" value="no"><span>No</span></label>' +
      '<label class="radio-pill"><input type="radio" name="fc-l3" value="yes"><span>Yes</span></label></div></fieldset>' +
      '<div class="fee-result" hidden aria-live="polite"></div></div>' +
      '<p class="wf-note" data-note="6"><span class="wf-note-label">Behaviour</span>The fee checker uses the course level (<code>course_level_link</code>) and funding tags (<code>course_fund_link</code>) with funding rules managed in the CMS, so marketing can update them each year without a developer. The rules shown are simplified for the demo.</p>' +
      '<p class="wf-note query" data-note="7"><span class="wf-note-label">Open question</span>Is there a structured fees table (tuition, materials, deposit amounts)? <code>C_FEES</code> is free text today, so the checker can\'t do the maths reliably.</p>';

    var accordion = sections.map(function (s, i) {
      return '<div class="accordion-item' + (i === 0 ? ' open' : '') + '" id="' + s.id + '" data-field="' + s.field + '">' +
        '<h2 style="margin:0;font-size:inherit"><button class="accordion-title" type="button" aria-controls="' + s.id + '-panel">' + s.title + '<span class="accordion-icon" aria-hidden="true">&#9662;</span></button></h2>' +
        '<div class="accordion-content rich" id="' + s.id + '-panel">' + (s.html === 'FEES' ? feesHtml : s.html) + '</div></div>';
    }).join('');

    var startFact = c.start;
    root.innerHTML =
      '<div class="container"><nav class="breadcrumb" aria-label="Breadcrumb"><ul class="breadcrumb-list">' +
      '<li class="breadcrumb-item"><a href="home.html">Home</a></li><li class="breadcrumb-item"><a href="courses.html">Courses</a></li>' +
      '<li class="breadcrumb-item"><a href="subject.html?id=' + c.subjectId + '">' + esc(c.subject) + '</a></li><li class="breadcrumb-item" aria-current="page">' + esc(c.h1 || c.title) + '</li></ul></nav></div>' +

      '<!-- Course header (R15) --><section class="course-hero"><div class="container course-hero-grid">' +
      '<div><span class="overline" data-field="course_sections.S_TITLE">' + esc(c.subject) + '</span>' +
      '<h1 data-field="C_TITLE">' + esc(c.title) + '</h1>' +
      '<div class="tags" style="margin-bottom:1rem"><button type="button" class="tag tag-solid" data-modal-open="level-modal" data-level="' + c.levelNum + '" aria-label="' + esc(c.level) + ': what does this level mean?" data-field="course_level_link">' + esc(c.level) + '</button>' +
      '<span class="tag" data-field="C_MODE">' + esc(c.mode) + '</span>' + (funded ? '<span class="tag tag-soft" data-field="course_fund_link">Free for 16–18</span>' : '') + (isAdult ? '<span class="tag tag-soft">Adults 19+</span>' : '') + '</div>' +
      '<p class="lead" data-field="C_COURSEFORME (first paragraph)">' + esc(firstPara(c.courseForMe || c.overview)) + '</p>' +
      '<div class="course-actions" id="hero-actions"><a class="btn btn-apply btn-lg" href="apply.html?id=' + c.id + '">Apply now</a>' +
      '<button type="button" class="save-btn" data-save="' + c.id + '" data-save-long aria-pressed="' + isSaved(c.id) + '"><span class="glyph glyph-heart" aria-hidden="true"></span><span>' + (isSaved(c.id) ? 'Saved to shortlist' : 'Save to shortlist') + '</span></button></div></div>' +
      '<div>' + imgPh(imgFor(c), 'Course image 4:3 &middot; ' + esc(c.image), 'course-img', ' data-field="Umbraco media (by subject)"') + '</div>' +
      '</div></section>' +

      '<div class="container"><p class="wf-note" data-note="1"><span class="wf-note-label">Data</span>Everything on this page is rendered from the supplied course data (Appendix 2). The orange labels show the SQL column behind each element. One template renders all ' + COURSES.length + ' courses: try <a href="course.html?id=527">Access to HE</a> or <a href="course.html?id=540">Carpentry and Joinery</a>. Empty fields hide themselves, so a course never shows “NULL”.</p>' +
      '<p class="wf-note" data-note="2"><span class="wf-note-label">Build</span>In production, a sync job in the CMS reads <code>courses</code>, <code>course_sections</code>, <code>course_level_link</code> and <code>course_fund_link</code> every 15 minutes and caches them, so pages stay fast if the database is busy. The college is happy to agree the connection method with us: read-only database views, an API or a scheduled export all work with the same job. Job adverts and newsletters are in the same SQL database, so they use the same approach. Everything runs on the college\'s own servers. Marketing adds images, video and testimonials in the CMS around the data, which stays mastered in the college\'s systems.</p></div>' +

      '<div class="container course-layout"><div>' +
      '<!-- Key facts (R35) --><h2 class="visually-hidden">Key facts</h2><dl class="key-facts">' +
      '<div><dt>Level</dt><dd data-field="course_level_link → course_levels">' + esc(c.level) + (c.levelNum === 3 ? ' <span class="muted" style="font-weight:400">(equivalent to A Levels)</span>' : c.levelNum === 2 ? ' <span class="muted" style="font-weight:400">(equivalent to GCSEs 9–4)</span>' : '') + '</dd></div>' +
      '<div><dt>Starts</dt><dd data-field="C_STARTDATE">' + esc(startFact) + '</dd></div>' +
      '<div><dt>Duration</dt><dd data-field="C_DURATION">' + esc(c.duration) + '</dd></div>' +
      '<div><dt>Study mode</dt><dd data-field="C_MODE">' + esc(c.mode) + '</dd></div>' +
      '<div><dt>Campus</dt><dd data-field="(not in data: illustrative)">' + esc(c.campus) + '</dd></div>' +
      '<div><dt>Fees</dt><dd data-field="C_FEES">' + esc(feeLine.length > 60 ? (funded ? 'Free for 16–18' : 'See fees and funding') : feeLine) + '</dd></div>' +
      '</dl>' +
      '<p class="wf-note" data-note="3"><span class="wf-note-label">Data</span>Campus and <code>C_LEVEL</code> are legacy fields with no data (confirmed by the college). Level comes from <code>course_level_link</code>. Campus would be a tag set in the CMS against each course, so it is illustrative here.</p>' +
      '<details class="toc-mobile"><summary>On this page</summary><nav aria-label="On this page"><ul>' + sections.map(function (s) { return '<li><a href="#' + s.id + '">' + s.title + '</a></li>'; }).join('') + '<li><a href="#helper-title">Ask about this course</a></li><li><a href="#how-to-apply">How to apply</a></li></ul></nav></details>' +
      '<!-- Course detail accordions (R16 R36) --><div class="accordion" style="margin-top:1.5rem">' + accordion + '</div>' +
      '<p class="wf-note" data-note="4"><span class="wf-note-label">Behaviour</span>On mobile, accordions keep a long course page scannable: the first section opens by default and the headings act as a contents list. The chips above jump straight to a section and open it. On desktop, a sticky “On this page” panel sits beside the content.</p>' +

      '<!-- Ask about this course (R65) --><section class="course-helper" data-course-helper aria-labelledby="helper-title"><h2 id="helper-title">Ask about this course</h2><p class="muted">Quick answers from the course record. Anything else goes to a person.</p>' +
      '<div class="helper-chips">' + ['How much does it cost?', 'What grades do I need?', 'When does it start?', 'How will I be assessed?', 'What jobs can it lead to?', 'Where is it taught?'].map(function (q) { return '<button type="button" class="chip" data-q-chip>' + q + '</button>'; }).join('') + '</div>' +
      '<div class="helper-log" aria-live="polite" hidden></div>' +
      '<form class="search-field helper-form"><label for="helper-q" class="visually-hidden">Ask your own question</label><input type="text" id="helper-q" placeholder="Or type your own question"><button class="btn" type="submit">Ask</button></form>' +
      '<p class="wf-note" data-note="8"><span class="wf-note-label">Behaviour</span>Answers are put together from this course\'s own fields (<code>C_FEES</code>, <code>C_ELIGIBILITY</code>, <code>C_STARTDATE</code> and so on), so they can never contradict the page. A question it can\'t match goes to admissions with the course attached. A generative AI assistant could sit behind the same box, limited to the college\'s own data. We\'d recommend that as a later phase, once the college is comfortable with how it answers.</p></section>' +
      '<!-- How to apply (R26) --><section id="how-to-apply" class="band" style="padding-bottom:0"><h2>How to apply</h2><ol class="steps-list">' +
      '<li><div><h3>Apply online</h3><p>It takes about 15 minutes. You can save it and come back.</p></div></li>' +
      '<li><div><h3>Come to an interview</h3><p>A friendly chat with a tutor about the course and your plans.</p></div></li>' +
      '<li><div><h3>Get your offer</h3><p>We’ll email you, and your parent or carer if you’re under 18.</p></div></li>' +
      '<li><div><h3>Enrol in the summer</h3><p>Bring your results and you’re ready to start.</p></div></li></ol>' +
      '<p style="margin-top:1.5rem"><a class="btn btn-apply btn-lg" href="apply.html?id=' + c.id + '" id="apply-bottom">Apply for this course</a></p>' +
      '<p class="muted">Questions? Email <a href="#" data-field="C_CONTACT">' + esc(c.contact || 'admissions@chelmsford.ac.uk') + '</a> or call <a href="tel:01245293031">01245 293031</a>.</p></section>' +
      '</div>' +

      '<!-- Desktop aside --><aside class="course-aside" aria-label="Course summary"><div class="sticky-box"><div class="aside-box"><h2>On this page</h2><ul class="toc">' +
      sections.map(function (s) { return '<li><a href="#' + s.id + '">' + s.title + '</a></li>'; }).join('') + '<li><a href="#how-to-apply">How to apply</a></li></ul>' +
      '<p style="margin-top:1rem"><a class="btn btn-apply btn-block" href="apply.html?id=' + c.id + '">Apply now</a></p>' +
      '<p><a class="btn btn-secondary btn-block" href="events.html">Book an open event</a></p></div></div></aside>' +
      '</div>' +

      (events.length ? '<section class="band band-alt"><div class="container"><div class="section-head"><h2>See it for yourself</h2><a href="events.html">All events</a></div><div class="event-list">' + events.map(eventCard).join('') + '</div></div></section>' : '') +
      (related.length ? '<section class="band"><div class="container"><div class="section-head"><h2>Related courses in ' + esc(c.subject) + '</h2><a href="courses.html?subject=' + c.subjectId + '">All ' + esc(c.subject) + ' courses</a></div><div class="card-grid cols-3">' + related.map(courseCard).join('') + '</div>' +
        '<p class="wf-note" data-note="5"><span class="wf-note-label">Data</span>Related courses come from the same <code>C_SECTION</code>, ordered by level, so learners can see the route from Level 1 to Level 3 and beyond.</p></div></section>' : '');

    // Sticky mobile apply bar (R38)
    var bar = document.createElement('div');
    bar.className = 'apply-bar';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<div><small>Starts ' + esc(c.start) + '</small><strong>' + esc(c.h1 || c.title) + '</strong></div><a class="btn btn-apply" href="apply.html?id=' + c.id + '" tabindex="-1">Apply now</a>';
    document.body.appendChild(bar);
    document.body.classList.add('has-apply-bar');
    var heroActions = $('#hero-actions');
    var bottom = $('#apply-bottom');
    function vis(el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; }
    function checkBar() {
      var show = !vis(heroActions) && !vis(bottom) && heroActions.getBoundingClientRect().bottom < 0;
      bar.classList.toggle('show', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      $('a', bar).tabIndex = show ? 0 : -1;
    }
    window.addEventListener('scroll', checkBar, { passive: true });
    checkBar();

    // Jump links open the accordion they target
    root.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var dd = a.closest('details.toc-mobile'); if (dd) dd.open = false;
      var item = document.getElementById(a.getAttribute('href').slice(1));
      if (item && item.classList.contains('accordion-item') && !item.classList.contains('open')) {
        var t = $('.accordion-title', item);
        window.setTimeout(function () { t.click(); t.focus(); }, 0);
      }
    });

    bindSaveButtons(root);
    initFeeChecker(c);
    initCourseHelper(c);
  }

  /* --- Events listing (R17 R40) ----------------------------------------- */
  function initEvents() {
    var root = $('[data-events]');
    if (!root) return;
    var p = params();
    var state = { type: p.get('type') || '', audience: p.get('audience') || '', campus: p.get('campus') || '', view: 'list', month: 0 };
    var typeHost = $('#event-types');
    typeHost.innerHTML = ['All events'].concat(EVENT_TYPES).map(function (t, i) {
      var v = i === 0 ? '' : t;
      return '<button type="button" class="chip" data-type="' + esc(v) + '" aria-pressed="' + (state.type === v) + '">' + esc(t) + '</button>';
    }).join('');
    var aud = $('#event-audience');
    aud.innerHTML = '<option value="">Everyone</option>' + AUDIENCES.map(function (a) { return '<option value="' + a.v + '">' + a.l + '</option>'; }).join('');
    aud.value = state.audience;
    var camp = $('#event-campus');
    camp.value = state.campus;

    function filtered() {
      return EVENTS.filter(function (e) {
        return (!state.type || e.type === state.type) && (!state.audience || e.audience.indexOf(state.audience) > -1) && (!state.campus || e.campus === state.campus || (state.campus !== 'Online' && e.campus === 'Both campuses'));
      });
    }
    function renderList(list) {
      var groups = {};
      list.forEach(function (e) { var k = e.date.slice(0, 7); (groups[k] = groups[k] || []).push(e); });
      return Object.keys(groups).sort().map(function (k) {
        var d = new Date(k + '-01T12:00:00');
        return '<section class="month-group"><h2>' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + '</h2><div class="event-list">' + groups[k].map(eventCard).join('') + '</div></section>';
      }).join('');
    }
    var monthsAvail = ['2026-11', '2026-12', '2027-01', '2027-02'];
    function renderCal(list) {
      var key = monthsAvail[state.month];
      var y = Number(key.slice(0, 4)), m = Number(key.slice(5)) - 1;
      var first = new Date(y, m, 1);
      var offset = (first.getDay() + 6) % 7; // Monday first
      var days = new Date(y, m + 1, 0).getDate();
      var cells = [], i;
      for (i = 0; i < offset; i++) cells.push('<td></td>');
      for (i = 1; i <= days; i++) {
        var iso = key + '-' + (i < 10 ? '0' + i : i);
        var evs = list.filter(function (e) { return e.date === iso; });
        cells.push('<td class="' + (evs.length ? 'has-event' : '') + '"><span>' + i + '</span>' + evs.map(function (e) { return '<a href="event.html?id=' + e.id + '">' + esc(e.title) + '</a>'; }).join('') + '</td>');
      }
      while (cells.length % 7) cells.push('<td></td>');
      var rows = '';
      for (i = 0; i < cells.length; i += 7) rows += '<tr>' + cells.slice(i, i + 7).join('') + '</tr>';
      return '<div class="cal-nav"><button type="button" class="btn btn-secondary" data-cal="-1"' + (state.month === 0 ? ' disabled' : '') + '>Previous month</button>' +
        '<button type="button" class="btn btn-secondary" data-cal="1"' + (state.month === monthsAvail.length - 1 ? ' disabled' : '') + '>Next month</button></div>' +
        '<table class="cal"><caption>' + MONTHS[m] + ' ' + y + '</caption><thead><tr><th scope="col">Mon</th><th scope="col">Tue</th><th scope="col">Wed</th><th scope="col">Thu</th><th scope="col">Fri</th><th scope="col">Sat</th><th scope="col">Sun</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }
    function update(speak) {
      var list = filtered();
      $('#event-count').textContent = list.length + (list.length === 1 ? ' event' : ' events');
      var out = $('#event-results');
      if (!list.length) out.innerHTML = '<div class="empty-state"><h2>No events match those choices</h2><p>Try “All events”, or <a href="#">book a personal campus tour</a>.</p></div>';
      else out.innerHTML = state.view === 'list' ? renderList(list) : renderCal(list);
      $all('[data-cal]', out).forEach(function (b) { b.addEventListener('click', function () { state.month += Number(b.getAttribute('data-cal')); update(false); var nb = $('[data-cal="' + b.getAttribute('data-cal') + '"]', out); if (nb && !nb.disabled) nb.focus(); else $('caption', out).focus(); }); });
      if (speak) announce(list.length + ' events found');
    }
    $all('[data-type]', typeHost).forEach(function (b) {
      b.addEventListener('click', function () {
        state.type = b.getAttribute('data-type');
        $all('[data-type]', typeHost).forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        update(true);
      });
    });
    aud.addEventListener('change', function () { state.audience = aud.value; update(true); });
    camp.addEventListener('change', function () { state.campus = camp.value; update(true); });
    $all('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.view = b.getAttribute('data-view');
        $all('[data-view]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        update(false);
      });
    });
    update(false);
  }

  /* --- Single event + booking (R18 R41) --------------------------------- */
  /* '6.30pm' -> '183000' */
  function hhmmss(t) {
    var m = /^(\d{1,2})(?:\.(\d{2}))?(am|pm)$/.exec(t); if (!m) return null;
    var h = Number(m[1]) % 12 + (m[3] === 'pm' ? 12 : 0);
    return (h < 10 ? '0' : '') + h + (m[2] || '00') + '00';
  }
  function icsFor(e, slot) {
    var d = e.date.replace(/-/g, '');
    var startH = (slot && hhmmss(slot)) || e.startH;
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Chelmsford College//Prototype//EN', 'BEGIN:VEVENT',
      'UID:' + e.id + '@chelmsford-prototype', 'DTSTAMP:20261030T120000Z', 'DTSTART;TZID=Europe/London:' + d + 'T' + startH,
      'DTEND;TZID=Europe/London:' + d + 'T' + e.endH, 'SUMMARY:' + e.title + ' (Chelmsford College)', 'LOCATION:' + e.location.replace(/,/g, '\\,'), 'END:VEVENT', 'END:VCALENDAR'];
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'));
  }
  function initEvent() {
    var root = $('[data-event]');
    if (!root) return;
    var e = eventById(params().get('id') || 'ev1') || EVENTS[0];
    document.title = e.title + ' | Chelmsford College prototype';
    var full = e.status === 'full';
    var others = EVENTS.filter(function (x) { return x.id !== e.id; }).slice(0, 2);
    root.innerHTML =
      '<div class="container"><nav class="breadcrumb" aria-label="Breadcrumb"><ul class="breadcrumb-list"><li class="breadcrumb-item"><a href="home.html">Home</a></li><li class="breadcrumb-item"><a href="events.html">Events</a></li><li class="breadcrumb-item" aria-current="page">' + esc(e.title) + '</li></ul></nav></div>' +
      '<div class="container event-layout"><div>' +
      '<span class="overline">' + esc(e.type) + '</span><h1>' + esc(e.title) + '</h1>' +
      imgPh(IMG_BY_EVENT[e.id] || 'learners', 'Event image 16:9', 'ratio-16-9 event-img') +
      '<p class="lead">' + esc(e.summary) + '</p>' +
      '<dl class="event-facts">' +
      '<div><dt>Date</dt><dd><time datetime="' + e.date + '">' + fmtDate(e.date) + '</time></dd></div>' +
      '<div><dt>Time</dt><dd>' + e.start + ' to ' + e.end + '</dd></div>' +
      '<div><dt>Location</dt><dd>' + esc(e.location) + '<br><a href="#">Map and travel</a></dd></div>' +
      '<div><dt>Who it’s for</dt><dd>' + e.audience.map(function (a) { var x = AUDIENCES.filter(function (y) { return y.v === a; })[0]; return x ? x.l : a; }).join(', ') + '</dd></div>' +
      '<div><dt>Cost</dt><dd>Free</dd></div>' +
      '<div><dt>Places</dt><dd>' + statusTag(e.status) + '</dd></div></dl>' +
      '<p><a class="btn btn-secondary" href="' + icsFor(e) + '" download="chelmsford-college-' + e.id + '.ics">Add to calendar</a></p>' +
      '<h2>What to expect</h2><ul class="fact-list">' + e.agenda.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' +
      (e.arrival ? '<p class="event-arrival"><strong>Arriving:</strong> ' + esc(e.arrival) + '</p>' : '') +
      (e.presentations ? presentationsHtml(e) : '') +
      (e.campus !== 'Online' ? '<h2>Getting here</h2><div class="wf-placeholder map-ph">Map embed &middot; ' + esc(e.campus) + '</div>' +
        '<h3 class="event-sub">Parking</h3><p>Parking is available at both campuses, but it is limited. Street parking is available, but please check you are not parking in a resident-only zone.</p>' : '') +
      '<h2>More help or information</h2><p>If you have any questions, or need help reading or accessing this information, call the Careers Advice Zone on <a href="tel:01245293031">01245 29 30 31</a> or email <a href="mailto:careersadvicezone@chelmsford.ac.uk">careersadvicezone@chelmsford.ac.uk</a> and we’ll get back to you.</p>' +
      (e.campus !== 'Online' ? '<p>If you need help to get into the college building, call the Careers Advice Zone on the number above. <a href="#">Our Equality and Diversity policy</a>.</p>' : '') +
      (e.sample
        ? '<p class="wf-note" data-note="1"><span class="wf-note-label">Data</span>This is the college’s own sample event, entered as one CMS event. The presentations are a simple table per campus that editors fill in, and visitors can show one campus at a time. Arrival times are bookable slots, each with its own capacity, so the evening doesn’t fill up at 6pm and stay empty at 8pm.</p>' +
          '<p class="wf-note query" data-note="2"><span class="wf-note-label">Open question</span>The sample says “your booked time” but doesn’t list the arrival slots, so the half-hourly slots here are our assumption. How are arrival times and capacity set today, and do bookings need to reach a CRM or the MIS for follow-up?</p>'
        : '<p class="wf-note" data-note="1"><span class="wf-note-label">CMS</span>Events are a CMS content type: title, type, date and time, campus, audience, linked subjects, capacity and description. Capacity drives the “Few places left” and “Fully booked” states automatically. Past events drop off the listing.</p>' +
          '<p class="wf-note" data-note="2"><span class="wf-note-label">Content</span>This event is illustrative, to show the listing filters. The <a href="event.html?id=ev1">Showcase Open Evening</a> uses the college’s own sample content.</p>') +
      '</div>' +
      '<!-- Booking (R41) --><aside><div class="booking" id="booking">' + bookingForm(e, full) + '</div></aside></div>' +
      '<section class="band band-alt"><div class="container"><div class="section-head"><h2>Other events</h2><a href="events.html">All events</a></div><div class="event-list">' + others.map(eventCard).join('') + '</div></div></section>';
    bindBooking(e, full);
    bindPresentations(root);
  }
  function presentationsHtml(e) {
    var rows = e.presentations.map(function (pz) {
      return '<li class="pres-item" data-ms="' + (pz.ms ? 1 : 0) + '" data-pr="' + (pz.pr ? 1 : 0) + '"><h3>' + esc(pz.t) + '</h3>' + (pz.d ? '<p class="muted">' + esc(pz.d) + '</p>' : '') +
        '<dl>' + (pz.ms ? '<div class="pres-ms"><dt>Moulsham Street</dt><dd>' + esc(pz.ms) + '</dd></div>' : '') + (pz.pr ? '<div class="pres-pr"><dt>Princes Road</dt><dd>' + esc(pz.pr) + '</dd></div>' : '') + '</dl></li>';
    }).join('');
    return '<section class="presentations" aria-labelledby="pres-title"><h2 id="pres-title">Presentations</h2>' +
      '<div class="search-mode pres-campus" role="group" aria-label="Show presentations at"><button type="button" data-pres="all" aria-pressed="true">Both campuses</button><button type="button" data-pres="ms" aria-pressed="false">Moulsham Street</button><button type="button" data-pres="pr" aria-pressed="false">Princes Road</button></div>' +
      '<p class="visually-hidden" role="status" data-pres-status></p><ul class="pres-list">' + rows + '</ul></section>';
  }
  function bindPresentations(root) {
    var wrap = $('.presentations', root); if (!wrap) return;
    $all('[data-pres]', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-pres');
        $all('[data-pres]', wrap).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        var n = 0;
        $all('.pres-item', wrap).forEach(function (li) {
          var show = v === 'all' || li.getAttribute('data-' + v) === '1';
          li.hidden = !show; if (show) n++;
          $all('.pres-ms, .pres-pr', li).forEach(function (d) { d.hidden = v !== 'all' && !d.classList.contains('pres-' + v); });
        });
        $('[data-pres-status]', wrap).textContent = n + ' presentations' + (v === 'all' ? '' : ' at ' + b.textContent);
      });
    });
  }
  function bookingForm(e, full) {
    return '<h2>' + (full ? 'Join the waiting list' : 'Book your place') + '</h2>' +
      (full ? '<p>This event is fully booked. We’ll email you if a place comes up.</p>' : '<p class="muted">It takes 1 minute. We’ll email your confirmation.</p>') +
      '<div class="error-summary" role="alert" tabindex="-1" hidden><h2>There is a problem</h2><ul></ul></div>' +
      '<form novalidate data-booking>' +
      '<div class="field"><label for="b-first">First name</label><input type="text" id="b-first" autocomplete="given-name"></div>' +
      '<div class="field"><label for="b-last">Last name</label><input type="text" id="b-last" autocomplete="family-name"></div>' +
      '<div class="field"><label for="b-email">Email address</label><input type="email" id="b-email" autocomplete="email" spellcheck="false"></div>' +
      '<div class="field"><label for="b-who">I am</label><select id="b-who"><option value="">Choose one</option><option>A school leaver (Year 11)</option><option>A parent or carer</option><option>An adult learner</option><option>An employer</option></select></div>' +
      (e.slots && !full ? '<fieldset class="field pay-fieldset" id="b-slot"><legend>What time will you arrive?</legend><p class="field-hint">You can stay as long as you like after this.</p><div class="radio-row">' +
        e.slots.map(function (t, i) { return '<label class="radio-pill"><input type="radio" name="b-slot" value="' + t + '"' + (i === 4 ? ' disabled' : '') + '><span>' + t + (i === 4 ? ' (full)' : i === 0 ? ' (2 left)' : '') + '</span></label>'; }).join('') +
        '</div></fieldset>' : '') +
      '<div class="field"><label for="b-guests">How many people are coming, including you?</label><select id="b-guests"><option>1</option><option selected>2</option><option>3</option><option>4</option></select><p class="field-hint">Bring a parent, carer or friend.</p></div>' +
      '<div class="field"><label for="b-needs">Access or support needs <span class="opt">(optional)</span></label><textarea id="b-needs" rows="2"></textarea></div>' +
      '<label class="check" style="margin-bottom:1rem"><input type="checkbox" id="b-sms"> Text me a reminder the day before</label>' +
      '<button class="btn btn-apply btn-lg btn-block" type="submit">' + (full ? 'Join waiting list' : 'Book my place') + '</button>' +
      '<p class="field-hint" style="margin-top:0.75rem">We use your details to manage your booking. <a href="#">Privacy notice</a>.</p>' +
      '<button type="button" class="btn-link" data-demo-fill>Fill with demo details (prototype only)</button>' +
      '</form>';
  }
  function bindBooking(e, full) {
    var box = $('#booking');
    var form = $('[data-booking]', box);
    $('[data-demo-fill]', box).addEventListener('click', function () {
      $('#b-first').value = 'Maya'; $('#b-last').value = 'Smith'; $('#b-email').value = 'maya.smith@example.com'; $('#b-who').selectedIndex = 1;
      var sl = $all('input[name="b-slot"]', box); if (sl[1]) sl[1].checked = true;
    });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var errs = [];
      $all('.field', form).forEach(function (f) { f.classList.remove('has-error'); var m = $('.field-error', f); if (m) m.remove(); });
      if ($('#b-slot')) { $('#b-slot').classList.remove('has-error'); var se = $('#b-slot-err'); if (se) se.remove(); }
      function err(id, msg) {
        var input = $('#' + id); var f = input.closest('.field'); f.classList.add('has-error');
        var p = document.createElement('p'); p.className = 'field-error'; p.id = id + '-err'; p.textContent = msg; input.insertAdjacentElement('beforebegin', p);
        input.setAttribute('aria-describedby', id + '-err'); input.setAttribute('aria-invalid', 'true');
        errs.push('<li><a href="#' + id + '">' + esc(msg) + '</a></li>');
      }
      if (!$('#b-first').value.trim()) err('b-first', 'Enter your first name');
      if (!$('#b-last').value.trim()) err('b-last', 'Enter your last name');
      var em = $('#b-email').value.trim();
      if (!em) err('b-email', 'Enter your email address'); else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) err('b-email', 'Enter an email address in the correct format, like name@example.com');
      if (!$('#b-who').value) err('b-who', 'Tell us who you are, so we can send the right information');
      var slotEl = $('input[name="b-slot"]:checked', form);
      var slot = slotEl ? slotEl.value : '';
      if ($('#b-slot') && !slot) {
        var fs = $('#b-slot'); fs.classList.add('has-error');
        var pe = document.createElement('p'); pe.className = 'field-error'; pe.id = 'b-slot-err'; pe.textContent = 'Choose the time you will arrive';
        $('.radio-row', fs).insertAdjacentElement('beforebegin', pe);
        errs.push('<li><a href="#b-slot">Choose the time you will arrive</a></li>');
      }
      var sum = $('.error-summary', box);
      if (errs.length) { $('ul', sum).innerHTML = errs.join(''); sum.hidden = false; sum.focus(); return; }
      var guests = $('#b-guests').value;
      box.innerHTML = '<div class="confirm-panel" tabindex="-1" id="booked"><div class="tick" aria-hidden="true">&#10003;</div><h2>' + (full ? 'You’re on the waiting list' : 'You’re booked in') + '</h2>' +
        '<p><strong>' + esc(e.title) + '</strong><br>' + fmtDate(e.date) + ', ' + (slot ? 'arrive from ' + slot + ' (the evening ends at ' + e.end + ')' : e.start + ' to ' + e.end) + '<br>' + esc(e.location) + '</p>' +
        '<p>We’ve emailed your confirmation to <strong>' + esc(em) + '</strong>' + (full ? '.' : ' for ' + guests + (guests === '1' ? ' person.' : ' people.')) + '</p>' +
        '<p><a class="btn btn-secondary btn-block" href="' + icsFor(e, slot) + '" download="chelmsford-college-' + e.id + '.ics">Add to calendar</a></p>' +
        '<p><a class="btn btn-apply btn-block" href="courses.html">Find a course before you come</a></p>' +
        '<p class="wf-note" data-note="3"><span class="wf-note-label">Behaviour</span>Confirmation email with a calendar file and a QR code for fast check-in on the night. If the learner has a shortlist, the email lists those courses so tutors can be ready.</p></div>';
      var b = $('#booked'); b.focus();
      document.body.classList.toggle('wf-notes-hidden', document.body.classList.contains('wf-notes-hidden'));
    });
  }

  /* --- Payments (R19–R23 R42) ------------------------------------------- */
  var PAY_TYPES = {
    deposit: { label: 'Course deposit', desc: 'Secure your place on a course before you enrol', ref: 'Application reference', refHint: 'Starts with APP-, on your offer email', refEx: 'APP-2027-04821', refRe: /^APP-\d{4}-\d{5}$/i },
    materials: { label: 'Materials fee', desc: 'Kit, equipment and materials for your course, paid after you enrol', ref: 'Student ID number', refHint: '8 digits, on your college ID card', refEx: '20427713', refRe: /^\d{8}$/ },
    trip: { label: 'Trip or other payment', desc: 'Trips, visits, exam resits and other one-off costs', ref: 'Student ID number', refHint: '8 digits, on your college ID card', refEx: '20419876', refRe: /^\d{8}$/ }
  };
  function lookup(type) {
    // Prototype stand-in for the MIS lookup (student record + fees due)
    if (type === 'deposit') return { learner: 'Maya S.', course: courseById(374), items: [{ id: 'd1', label: 'Course deposit: secures your place for September 2027', amount: 50 }] };
    if (type === 'materials') return { learner: 'Maya S.', course: courseById(374), items: [{ id: 'm1', label: 'Materials fee 2027/28 (from course fees: £150)', amount: 150 }] };
    return { learner: 'Josh T.', course: courseById(734), items: [{ id: 't1', label: 'Industry trip fees (from course fees: £100)', amount: 100 }, { id: 't2', label: 'Exam resit: Functional Skills English', amount: 45 }] };
  }
  function initPay() {
    var root = $('[data-pay]');
    if (!root) return;
    var STEPS = ['type', 'find', 'you', 'review', 'card', 'done'];
    var LABELS = ['Payment', 'Find', 'Your details', 'Check', 'Pay'];
    // Held in memory only: leaving the page clears everything the payer typed
    var st = {};
    var pt = params().get('type');
    if (pt && PAY_TYPES[pt]) { st = { type: pt }; }
    if (window.location.hash && window.location.hash !== '#type') { try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { /* sandboxed */ } }

    function save() { /* in memory only */ }
    function stepIndex() { var h = (window.location.hash || '#type').slice(1); var i = STEPS.indexOf(h); return i < 0 ? 0 : i; }
    function go(name) { window.location.hash = name; }
    function stepper(i) {
      return '<ol class="stepper" aria-label="Payment progress">' + LABELS.map(function (l, n) {
        return '<li data-n="' + (n + 1) + '" class="' + (n < i ? 'done' : '') + '"' + (n === i ? ' aria-current="step"' : '') + '><span>' + l + '</span></li>';
      }).join('') + '</ol><p class="step-label">Step ' + Math.min(i + 1, 5) + ' of 5</p>';
    }
    function total() { return (st.selected || []).reduce(function (s, id) { var it = (st.items || []).filter(function (x) { return x.id === id; })[0]; return s + (it ? it.amount : 0); }, 0); }
    function errorSummary(list) { return '<div class="error-summary" role="alert" tabindex="-1"><h2>There is a problem</h2><ul>' + list.map(function (e) { return '<li><a href="#' + e[0] + '">' + esc(e[1]) + '</a></li>'; }).join('') + '</ul></div>'; }

    function render() {
      var i = stepIndex();
      // Guard: can't skip ahead without the earlier answers
      if (i >= 1 && !st.type) { go('type'); return; }
      if (i >= 2 && !st.items) { go('find'); return; }
      if (i >= 3 && !st.payer) { go('you'); return; }
      var name = STEPS[i];
      var html = '';
      var T = PAY_TYPES[st.type] || {};
      if (name === 'type') {
        html = stepper(0) + '<h1>Make a payment</h1><p class="lead">Pay online for a course deposit, materials or a trip. You don’t need an account, and parents and carers can pay for a student.</p>' +
          (st.err ? errorSummary(st.err) : '') +
          '<form data-step="type" novalidate><fieldset class="pay-fieldset" id="f-type"><legend>What are you paying for?</legend><div class="option-cards">' +
          Object.keys(PAY_TYPES).map(function (k) { var x = PAY_TYPES[k]; return '<label class="option-card"><input type="radio" name="type" value="' + k + '"' + (st.type === k ? ' checked' : '') + '><strong>' + x.label + '</strong><span class="desc">' + x.desc + '</span></label>'; }).join('') +
          '</div></fieldset>' +
          '<fieldset class="pay-fieldset" id="f-who"><legend>Who is paying?</legend><div class="option-cards">' +
          [['student', 'I’m the student', 'Paying for myself'], ['parent', 'I’m a parent or carer', 'Paying for a student'], ['other', 'Someone else', 'For example an employer or sponsor']].map(function (o) { return '<label class="option-card"><input type="radio" name="who" value="' + o[0] + '"' + (st.who === o[0] ? ' checked' : '') + '><strong>' + o[1] + '</strong><span class="desc">' + o[2] + '</span></label>'; }).join('') +
          '</div></fieldset><button class="btn btn-lg" type="submit">Continue</button></form>' +
          '<p class="wf-note" data-note="1"><span class="wf-note-label">Behaviour</span>All three payment types from the brief share one journey, so there is one place to learn and one place to maintain. Links from emails and the course page can skip this step, e.g. <code>pay.html?type=trip</code>. Asking who is paying changes the wording that follows (“your” or “the student’s”) and who gets the receipt.</p>';
      }
      if (name === 'find') {
        var forWho = st.who === 'student' ? 'your' : 'the student’s';
        html = stepper(1) + '<h1>Find the payment</h1><p>We use ' + forWho + ' reference and date of birth to find what is due, so you never have to type an amount.</p>' +
          (st.err ? errorSummary(st.err) : '') +
          '<form data-step="find" novalidate>' +
          '<div class="field' + (st.errRef ? ' has-error' : '') + '"><label for="f-ref">' + (st.who === 'student' ? 'Your ' : 'Student’s ') + T.ref.toLowerCase() + '</label><p class="field-hint" id="f-ref-hint">' + T.refHint + '</p>' + (st.errRef ? '<p class="field-error">' + esc(st.errRef) + '</p>' : '') + '<input type="text" id="f-ref" style="max-width:16rem" aria-describedby="f-ref-hint" spellcheck="false" value="' + esc(st.ref || '') + '"></div>' +
          '<fieldset class="field' + (st.errDob ? ' has-error' : '') + '" id="f-dob" style="border:0"><legend style="font-weight:500">' + (st.who === 'student' ? 'Your' : 'Student’s') + ' date of birth</legend><p class="field-hint">For example, 14 3 2010</p>' + (st.errDob ? '<p class="field-error">' + esc(st.errDob) + '</p>' : '') +
          '<div class="row" style="align-items:flex-end"><div><label for="f-dd">Day</label><input type="text" inputmode="numeric" id="f-dd" style="width:4rem" value="' + esc(st.dd || '') + '"></div>' +
          '<div><label for="f-mm">Month</label><input type="text" inputmode="numeric" id="f-mm" style="width:4rem" value="' + esc(st.mm || '') + '"></div>' +
          '<div><label for="f-yy">Year</label><input type="text" inputmode="numeric" id="f-yy" style="width:6rem" value="' + esc(st.yy || '') + '"></div></div></fieldset>' +
          '<div class="row"><button class="btn btn-lg" type="submit">Find payment</button><button type="button" class="btn-link" data-demo>Use demo details (prototype only)</button></div></form>' +
          '<p><a href="#type">Back</a></p>' +
          '<p class="wf-note" data-note="2"><span class="wf-note-label">Integration</span>This looks up the learner in the college MIS (application or student record) and returns only what is due for this payment type, with the course from <code>courses</code>. The learner\'s name is partly hidden so a payer can confirm they have the right person without exposing personal data. The lookup is rate-limited, and no card data ever touches the website.</p>' +
          '<p class="wf-note query" data-note="3"><span class="wf-note-label">Open question</span>Which MIS holds fees due (e.g. ProSolution, EBS, Unit-e), and can it expose an API or a nightly export of outstanding fees? Are deposit amounts set per course?</p>';
      }
      if (name === 'you') {
        html = stepper(2) + '<h1>Your details</h1>' +
          '<div class="lookup-result"><p style="margin:0"><strong>Payment for ' + esc(st.learner) + '</strong></p><p class="muted" style="margin:0">' + esc(st.courseTitle) + '</p>' +
          '<p style="margin:0.75rem 0 0.25rem;font-weight:600">' + (st.items.length > 1 ? 'Choose what to pay:' : 'Amount due:') + '</p><ul class="due-list" id="f-items">' +
          st.items.map(function (it) { return '<li><label><input type="checkbox" name="item" value="' + it.id + '"' + ((st.selected || []).indexOf(it.id) > -1 ? ' checked' : '') + '><span>' + esc(it.label) + '</span><strong>' + money(it.amount) + '</strong></label></li>'; }).join('') + '</ul>' +
          '<p style="margin:0">Not the right student? <a href="#find">Search again</a></p></div>' +
          (st.err ? errorSummary(st.err) : '') +
          '<form data-step="you" novalidate>' +
          '<div class="field"><label for="p-name">' + (st.who === 'student' ? 'Your full name' : 'Your full name (the person paying)') + '</label><input type="text" id="p-name" autocomplete="name" value="' + esc((st.payer && st.payer.name) || '') + '"></div>' +
          '<div class="field"><label for="p-email">Email address for the receipt</label><input type="email" id="p-email" autocomplete="email" spellcheck="false" value="' + esc((st.payer && st.payer.email) || '') + '"></div>' +
          (st.who !== 'student' ? '<div class="field"><label for="p-rel">Your relationship to the student</label><select id="p-rel"><option>Parent</option><option>Carer or guardian</option><option>Employer</option><option>Other</option></select></div><label class="check" style="margin-bottom:1rem"><input type="checkbox" id="p-copy" checked> Also email a copy of the receipt to the student</label>' : '') +
          '<button class="btn btn-lg" type="submit">Continue</button></form><p><a href="#find">Back</a></p>' +
          '<p class="wf-note" data-note="4"><span class="wf-note-label">Behaviour</span>For trips and other payments, every outstanding item is listed and the payer chooses what to pay now. Instalment plans for larger materials fees could be offered here, depending on the provider.</p>';
      }
      if (name === 'review') {
        var sel = st.items.filter(function (x) { return st.selected.indexOf(x.id) > -1; });
        html = stepper(3) + '<h1>Check your payment</h1>' +
          '<dl class="summary-list">' +
          '<div><dt>Payment type</dt><dd>' + esc(T.label) + '</dd><a class="change" href="#type">Change<span class="visually-hidden"> payment type</span></a></div>' +
          '<div><dt>Student</dt><dd>' + esc(st.learner) + ' (' + esc(st.ref) + ')</dd><a class="change" href="#find">Change<span class="visually-hidden"> student</span></a></div>' +
          '<div><dt>Course</dt><dd>' + esc(st.courseTitle) + '</dd><dd></dd></div>' +
          sel.map(function (x) { return '<div><dt>' + esc(x.label) + '</dt><dd>' + money(x.amount) + '</dd><a class="change" href="#you">Change<span class="visually-hidden"> items</span></a></div>'; }).join('') +
          '<div><dt>Paid by</dt><dd>' + esc(st.payer.name) + '<br>' + esc(st.payer.email) + '</dd><a class="change" href="#you">Change<span class="visually-hidden"> your details</span></a></div></dl>' +
          '<div class="total-row"><span>Total to pay</span><span>' + money(total()) + '</span></div>' +
          (st.err ? errorSummary(st.err) : '') +
          '<form data-step="review" novalidate><label class="check' + (st.err ? ' has-error' : '') + '" style="margin-bottom:1.25rem" id="r-terms-wrap"><input type="checkbox" id="r-terms"> I agree to the <a href="#">payment terms</a> and <a href="#">refund policy</a></label>' +
          '<button class="btn btn-apply btn-lg" type="submit">Continue to secure payment</button></form><p><a href="#you">Back</a></p>' +
          '<p class="secure-note">You will enter your card details on our payment provider’s secure page. Chelmsford College never sees or stores your card number.</p>';
      }
      if (name === 'card') {
        html = stepper(4) + '<h1 class="visually-hidden">Pay by card</h1>' +
          '<div class="provider-frame"><div class="provider-bar"><span class="wf-placeholder logo provider-logo" data-img="logo" role="img" aria-label="Chelmsford College">College logo</span><span>Secure payment &middot; hosted by the payment provider</span></div>' +
          '<p style="font-weight:700;font-size:1.25rem;margin-bottom:0.25rem">Pay ' + money(total()) + '</p><p class="muted">' + esc(T.label) + ' for ' + esc(st.learner) + '</p>' +
          (st.declined ? '<div class="notice error" role="alert"><strong>Your card was declined</strong>No money has been taken. Check your card details, or try another card.</div>' : '') +
          '<div class="wallet-row"><button type="button" class="wallet-btn" data-wallet>Pay with Apple Pay</button><button type="button" class="wallet-btn" data-wallet>Pay with Google Pay</button></div>' +
          '<p class="muted" style="text-align:center">or pay by card</p>' +
          '<form data-step="card" novalidate><div class="field"><label for="c-num">Card number</label><input type="text" id="c-num" inputmode="numeric" autocomplete="cc-number" value="4444 3333 2222 1111"></div>' +
          '<div class="card-grid-2"><div class="field"><label for="c-exp">Expiry date</label><input type="text" id="c-exp" autocomplete="cc-exp" placeholder="MM / YY" value="09 / 29"></div><div class="field"><label for="c-cvc">Security code</label><input type="text" id="c-cvc" inputmode="numeric" autocomplete="cc-csc" value="123"></div></div>' +
          '<div class="field"><label for="c-name">Name on card</label><input type="text" id="c-name" autocomplete="cc-name" value="' + esc(st.payer.name) + '"></div>' +
          '<button class="btn btn-apply btn-lg btn-block" type="submit">Pay ' + money(total()) + '</button></form>' +
          '<p style="text-align:center;margin-top:1rem"><a href="#review">Cancel and go back</a></p></div>' +
          '<p style="margin-top:0.75rem"><button type="button" class="btn-link" data-decline>Simulate a declined card (prototype only)</button></p>' +
          '<p class="wf-note" data-note="5"><span class="wf-note-label">Security</span>This panel is the payment provider\'s hosted page (e.g. Stripe Checkout, Worldpay, Pay360 or an education platform such as WisePay), styled with the college\'s colours. The college will contract the provider directly; our price covers the integration. Card data never touches the college\'s servers, which keeps PCI DSS scope to SAQ-A. 3-D Secure (Strong Customer Authentication) is handled by the provider.</p>';
      }
      if (name === 'done') {
        html = '<div class="confirm-panel" tabindex="-1" id="pay-done"><div class="tick" aria-hidden="true">&#10003;</div><h1>Payment complete</h1>' +
          '<p class="lead">You paid <strong>' + money(st.paid || 0) + '</strong> for ' + esc(st.learner) + '</p>' +
          '<dl class="summary-list"><div><dt>Payment reference</dt><dd>' + esc(st.receipt) + '</dd><dd></dd></div><div><dt>Payment type</dt><dd>' + esc(T.label) + '</dd><dd></dd></div><div><dt>Course</dt><dd>' + esc(st.courseTitle) + '</dd><dd></dd></div></dl>' +
          '<p>We’ve emailed a receipt to <strong>' + esc(st.payer.email) + '</strong>' + (st.copy ? ' and a copy to the student' : '') + '.</p>' +
          '<h2 style="font-size:1.25rem">What happens next</h2><p>' + (st.type === 'deposit' ? 'Your place is now secured. We’ll be in touch about enrolment in the summer, and the deposit comes off any fees you pay later.' : st.type === 'materials' ? 'Your tutor will be told the fee is paid, and your kit will be ready at your first lesson.' : 'Your trip place is confirmed. Your tutor will share the itinerary and consent form.') + '</p>' +
          '<div class="row"><button type="button" class="btn btn-secondary" data-print>Print receipt</button><a class="btn" href="pay.html" data-new-payment>Make another payment</a><a href="home.html">Back to the homepage</a></div></div>' +
          '<p class="wf-note" data-note="6"><span class="wf-note-label">Integration</span>The provider\'s webhook confirms the payment. The website then writes the transaction back to the MIS against the student and course, so finance can reconcile it with no re-keying. Reporting exports (CSV) are available to finance in the CMS.</p>';
      }
      root.innerHTML = html;
      st.err = null; st.errRef = null; st.errDob = null;
      bindStep(name);
      var focusT = $('.error-summary', root) || $('#pay-done', root) || $('h1', root);
      if (focusT && document.readyState === 'complete') { if (!focusT.hasAttribute('tabindex')) focusT.setAttribute('tabindex', '-1'); focusT.focus(); }
      var notesHidden = document.body.classList.contains('wf-notes-hidden');
      document.body.classList.toggle('wf-notes-hidden', notesHidden);
    }

    function bindStep(name) {
      var form = $('form[data-step]', root);
      var demo = $('[data-demo]', root);
      if (demo) demo.addEventListener('click', function () { $('#f-ref').value = PAY_TYPES[st.type].refEx; $('#f-dd').value = st.type === 'trip' ? '2' : '14'; $('#f-mm').value = st.type === 'trip' ? '7' : '3'; $('#f-yy').value = st.type === 'trip' ? '2009' : '2010'; });
      var dec = $('[data-decline]', root);
      if (dec) dec.addEventListener('click', function () { st.declined = true; save(); render(); });
      $all('[data-wallet]', root).forEach(function (w) { w.addEventListener('click', function () { var f = $('form[data-step="card"]', root); if (f) f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })); }); });
      var pr = $('[data-print]', root);
      if (pr) pr.addEventListener('click', function () { window.print(); });
      var np = $('[data-new-payment]', root);
      if (np) np.addEventListener('click', function () { st = {}; });
      if (!form) return;
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (name === 'type') {
          var t = $('input[name="type"]:checked', form), w = $('input[name="who"]:checked', form);
          var errs = [];
          if (!t) errs.push(['f-type', 'Choose what you are paying for']);
          if (!w) errs.push(['f-who', 'Choose who is paying']);
          if (errs.length) { st.err = errs; render(); return; }
          if (st.type !== t.value) { st.items = null; st.selected = null; }
          st.type = t.value; st.who = w.value; save(); go('find');
        }
        if (name === 'find') {
          var T = PAY_TYPES[st.type];
          st.ref = $('#f-ref').value.trim(); st.dd = $('#f-dd').value.trim(); st.mm = $('#f-mm').value.trim(); st.yy = $('#f-yy').value.trim();
          var errs2 = [];
          if (!st.ref) { st.errRef = 'Enter the ' + T.ref.toLowerCase(); errs2.push(['f-ref', st.errRef]); }
          else if (!T.refRe.test(st.ref)) { st.errRef = T.ref + ' must look like ' + T.refEx; errs2.push(['f-ref', st.errRef]); }
          var d = Number(st.dd), m = Number(st.mm), y = Number(st.yy);
          if (!(d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1940 && y <= 2012)) { st.errDob = 'Date of birth must be a real date, like 14 3 2010'; errs2.push(['f-dd', st.errDob]); }
          if (errs2.length) { st.err = errs2; save(); render(); return; }
          var r = lookup(st.type);
          st.learner = r.learner; st.courseTitle = r.course.title; st.items = r.items; st.selected = r.items.length === 1 ? [r.items[0].id] : [r.items[0].id];
          save(); go('you');
        }
        if (name === 'you') {
          st.selected = $all('input[name="item"]:checked', root).map(function (x) { return x.value; });
          var nm = $('#p-name').value.trim(), em = $('#p-email').value.trim();
          var errs3 = [];
          if (!st.selected.length) errs3.push(['f-items', 'Choose at least one thing to pay for']);
          if (!nm) errs3.push(['p-name', 'Enter your full name']);
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) errs3.push(['p-email', 'Enter an email address in the correct format, like name@example.com']);
          if (errs3.length) { st.err = errs3; st.payer = st.payer || null; save(); render(); return; }
          st.payer = { name: nm, email: em };
          st.copy = $('#p-copy') ? $('#p-copy').checked : false;
          save(); go('review');
        }
        if (name === 'review') {
          if (!$('#r-terms').checked) { st.err = [['r-terms', 'Agree to the payment terms to continue']]; render(); return; }
          st.declined = false; save(); go('card');
        }
        if (name === 'card') {
          if (st.declined) { st.declined = false; }
          st.paid = total();
          st.receipt = 'CCP-' + String(Date.now()).slice(-8);
          save(); go('done');
        }
      });
    }

    window.addEventListener('hashchange', render);
    render();
  }

  /* --- Shortlist page (R25) --------------------------------------------- */
  function initShortlist() {
    var root = $('[data-shortlist]');
    if (!root) return;
    var shared = params().get('ids');
    function render() {
      var ids = shared ? shared.split(',').map(Number) : shortlist();
      var list = ids.map(courseById).filter(Boolean);
      if (!list.length) {
        root.innerHTML = '<div class="empty-state"><h2>Your shortlist is empty</h2><p>Tap <strong>Save</strong> on any course to add it here, then compare up to 3 side by side.</p><p><a class="btn" href="courses.html">Find a course</a></p></div>';
        return;
      }
      var cmp = list.slice(0, 3);
      var shareUrl = window.location.href.split('?')[0] + '?ids=' + list.map(function (c) { return c.id; }).join(',');
      var rows = [['Level', 'level'], ['Subject', 'subject'], ['Starts', 'start'], ['Duration', 'duration'], ['Campus', 'campus'], ['Fees', function (c) { return plain(c.fees) || 'Contact us'; }], ['Entry requirements', function (c) { return plain(c.eligibility) || '–'; }]];
      root.innerHTML = (shared ? '<div class="notice"><strong>A shortlist was shared with you</strong>These are the courses someone saved. <a href="shortlist.html">View your own shortlist</a>.</div>' : '') +
        '<div class="section-head"><h2>' + list.length + ' saved course' + (list.length === 1 ? '' : 's') + '</h2>' +
        '<div class="row"><button type="button" class="btn btn-secondary" data-share>Share with a parent or carer</button></div></div>' +
        '<p class="field-hint" data-share-msg hidden></p>' +
        '<div class="card-grid cols-3">' + list.map(courseCard).join('') + '</div>' +
        (cmp.length > 1 ? '<h2 style="margin-top:2.5rem">Compare</h2>' +
          '<div class="compare-cards">' + cmp.map(function (c) { return '<section class="compare-card"><h3><a href="course.html?id=' + c.id + '">' + esc(c.title) + '</a></h3><dl>' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(typeof r[1] === 'function' ? r[1](c) : c[r[1]]) + '</dd></div>'; }).join('') + '</dl><a class="btn btn-apply btn-block" href="apply.html?id=' + c.id + '">Apply</a></section>'; }).join('') + '</div>' +
          '<div class="compare-wrap"><table class="compare"><caption class="visually-hidden">Comparison of saved courses</caption><thead><tr><td></td>' + cmp.map(function (c) { return '<th scope="col"><a href="course.html?id=' + c.id + '">' + esc(c.title) + '</a></th>'; }).join('') + '</tr></thead><tbody>' +
          rows.map(function (r) { return '<tr><th scope="row">' + r[0] + '</th>' + cmp.map(function (c) { return '<td>' + esc(typeof r[1] === 'function' ? r[1](c) : c[r[1]]) + '</td>'; }).join('') + '</tr>'; }).join('') +
          '<tr><th scope="row"></th>' + cmp.map(function (c) { return '<td><a class="btn btn-apply" href="apply.html?id=' + c.id + '">Apply</a></td>'; }).join('') + '</tr></tbody></table></div>' : '<p class="muted" style="margin-top:1.5rem">Save one more course to compare them side by side.</p>');
      bindSaveButtons(root);
      $all('[data-save]', root).forEach(function (b) { b.addEventListener('click', function () { if (!shared) window.setTimeout(render, 50); }); });
      var sh = $('[data-share]', root);
      sh.addEventListener('click', function () {
        var msg = $('[data-share-msg]', root);
        msg.hidden = false;
        msg.textContent = 'Link to share: ' + shareUrl;
        try { navigator.clipboard.writeText(shareUrl).then(function () { msg.textContent = 'Link copied. Send it to a parent or carer by text or email.'; announce(msg.textContent); }); } catch (e) { /* no clipboard */ }
      });
    }
    render();
  }

  /* --- Apply hand-off (R26) --------------------------------------------- */
  function initApply() {
    var root = $('[data-apply]');
    if (!root) return;
    var id = params().get('id');
    var c = id ? courseById(id) : null;
    var slot = $('[data-apply-course]', root);
    if (c) {
      slot.innerHTML = '<div class="lookup-result"><span class="overline">You’re applying for</span><p style="font-weight:700;margin:0">' + esc(c.title) + '</p><p class="muted" style="margin:0">' + esc(c.level) + ' &middot; ' + esc(c.mode) + ' &middot; ' + esc(c.campus) + '</p>' +
        '<div class="field" style="margin:1rem 0 0"><label for="a-start">Start date</label><select id="a-start" style="max-width:20rem"><option>' + esc(c.start) + '</option></select></div>' +
        '<p style="margin:0.75rem 0 0"><a href="courses.html">Choose a different course</a></p></div>';
    } else {
      slot.innerHTML = '<div class="notice"><strong>Choose a course first</strong>Find your course and press <em>Apply now</em> on the course page, so we know what you’re applying for. <a href="courses.html">Find a course</a></div>';
    }
    var form = $('form', root);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      $('[data-apply-form]', root).innerHTML = '<div class="confirm-panel" tabindex="-1" id="applied"><div class="tick" aria-hidden="true">&#10003;</div><h2>Application started</h2><p>We’ve emailed you a link so you can finish your application on any device. It’s saved as you go.</p><p>The same email has a link to track your application and book your interview.</p><div class="row"><a class="btn btn-apply" href="application.html?id=' + (c ? c.id : 374) + '">Track your application</a><a class="btn btn-secondary" href="events.html">Book an open event</a></div></div>';
      $('#applied').focus();
    });
  }

  /* --- Responsive viewer ------------------------------------------------ */
  function initViewer() {
    var root = $('[data-viewer]');
    if (!root) return;
    var select = $('#viewer-page');
    var host = $('#viewer-devices');
    var DEVICES = [{ name: 'Mobile', w: 375, h: 760, scale: 0.75 }, { name: 'Tablet', w: 768, h: 1024, scale: 0.55 }, { name: 'Desktop', w: 1366, h: 900, scale: 0.5 }];
    function render() {
      var url = select.value;
      host.innerHTML = DEVICES.map(function (d) {
        return '<div class="device"><h2>' + d.name + ' &middot; ' + d.w + 'px</h2><div class="device-frame" style="width:' + Math.round(d.w * d.scale + 20) + 'px;height:' + Math.round(d.h * d.scale + 20) + 'px"><iframe title="' + d.name + ' preview of ' + esc(select.options[select.selectedIndex].text) + '" src="' + url + '" style="width:' + d.w + 'px;height:' + d.h + 'px;transform:scale(' + d.scale + ')"></iframe></div></div>';
      }).join('');
    }
    select.addEventListener('change', render);
    var start = params().get('page');
    if (start) select.value = start;
    render();
  }

  /* ======================================================================
     Beyond the brief (V3)
     ====================================================================== */

  /* --- Course matcher (R60) --------------------------------------------- */
  var INTERESTS = [
    { v: 'make', l: 'Making and building things', s: [6, 8, 9] },
    { v: 'food', l: 'Cooking and food', s: [14] },
    { v: 'style', l: 'Hair, beauty and styling', s: [12] },
    { v: 'create', l: 'Art, design, fashion and media', s: [48] },
    { v: 'stage', l: 'Performing on stage', s: [55, 48] },
    { v: 'tech', l: 'Computers and technology', s: [15] },
    { v: 'biz', l: 'Business, law and marketing', s: [5] },
    { v: 'care', l: 'Caring for and helping people', s: [13, 7, 2] },
    { v: 'sci', l: 'Science and investigation', s: [3] },
    { v: 'sport', l: 'Sport and fitness', s: [19] },
    { v: 'serve', l: 'Police, fire and armed forces', s: [17] },
    { v: 'travel', l: 'Travel and meeting people', s: [21] }
  ];
  var HANDS_ON = [6, 8, 9, 12, 14, 19, 55];
  var BOOKISH = [2, 3, 5, 13, 15];
  function initMatch() {
    var root = $('[data-match]');
    if (!root) return;
    var a = { interests: [], stage: '', grades: '', style: '' };
    var steps = ['interests', 'stage', 'grades', 'style', 'results'];
    var i = 0;
    function visibleSteps() { return steps.filter(function (s) { return s !== 'grades' || a.stage === 'leaver' || a.stage === 'year11'; }); }
    function progress() {
      var vs = visibleSteps(); var n = vs.indexOf(steps[i]) + 1; var total = vs.length - 1;
      return '<p class="step-label">Question ' + n + ' of ' + total + '</p><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + n + '" aria-label="Question ' + n + ' of ' + total + '"><span style="width:' + Math.round(n / total * 100) + '%"></span></div>';
    }
    function radios(name, opts, cur) {
      return '<div class="option-cards">' + opts.map(function (o) {
        return '<label class="option-card"><input type="radio" name="' + name + '" value="' + o[0] + '"' + (cur === o[0] ? ' checked' : '') + '><strong>' + esc(o[1]) + '</strong>' + (o[2] ? '<span class="desc">' + esc(o[2]) + '</span>' : '') + '</label>';
      }).join('') + '</div>';
    }
    function nav(last) {
      return '<p class="field-error" data-match-err hidden></p><div class="row"><button class="btn btn-lg" type="submit">' + (last ? 'Show my matches' : 'Next') + '</button>' + (i > 0 ? '<button type="button" class="btn-link" data-back>Back</button>' : '') + '</div>';
    }
    function score() {
      var subj = {};
      a.interests.forEach(function (v) { INTERESTS.filter(function (x) { return x.v === v; })[0].s.forEach(function (s) { subj[s] = true; }); });
      var target = a.stage === 'adult' ? 3 : a.stage === 'support' ? 0 : ({ high: 3, some: 2, low: 1, unsure: 2 })[a.grades] || 2;
      return COURSES.map(function (c) {
        var why = [], sc = 0;
        if (subj[c.subjectId]) { sc += 6; why.push('You enjoy ' + c.subject.toLowerCase()); }
        var age = a.stage === 'adult' ? 'adult' : a.stage === 'support' ? 'supported' : '16-18';
        if (c.ageGroups.indexOf(age) > -1) { sc += 3; why.push(age === 'adult' ? 'Designed for adults' : age === 'supported' ? 'Supported learning' : 'Full time for school leavers'); }
        else if (age === 'adult' && subj[c.subjectId]) { sc += 1; }
        if (a.stage !== 'support') {
          if (c.levelNum === target) { sc += 3; why.push(c.level + ' suits your expected grades'); }
          else if (c.levelNum === target - 1) { sc += 1; why.push(c.level + ': a step up to Level ' + target + ' later'); }
        }
        if (a.style === 'hands' && HANDS_ON.indexOf(c.subjectId) > -1) { sc += 1; why.push('Mostly hands-on'); }
        if (a.style === 'class' && BOOKISH.indexOf(c.subjectId) > -1) { sc += 1; why.push('More classroom and project work'); }
        return { c: c, sc: sc, why: why };
      }).filter(function (r) { return r.sc >= 6; }).sort(function (x, y) { return y.sc - x.sc; }).slice(0, 6);
    }
    function render(focus) {
      var step = steps[i], html = '';
      if (step === 'interests') {
        html = progress() + '<form data-q><fieldset class="pay-fieldset"><legend>What do you enjoy? Choose up to three.</legend><div class="interest-grid">' +
          INTERESTS.map(function (o) { return '<label class="option-card"><input type="checkbox" name="interest" value="' + o.v + '"' + (a.interests.indexOf(o.v) > -1 ? ' checked' : '') + '><strong>' + esc(o.l) + '</strong></label>'; }).join('') +
          '</div></fieldset>' + nav(false) + '</form>';
      }
      if (step === 'stage') html = progress() + '<form data-q><fieldset class="pay-fieldset"><legend>Where are you now?</legend>' + radios('stage', [['year11', 'I’m in Year 11', 'Finishing school this summer'], ['leaver', 'I’ve left school and I’m 16 to 18', ''], ['adult', 'I’m 19 or over', 'Returning to learning or changing career'], ['support', 'I need extra support with learning', 'For example an EHCP or special educational needs']], a.stage) + '</fieldset>' + nav(false) + '</form>';
      if (step === 'grades') html = progress() + '<form data-q><fieldset class="pay-fieldset"><legend>What grades do you expect in English and maths?</legend>' + radios('grades', [['high', 'Mostly 4 or above', ''], ['some', 'Some 4s, some 3s', ''], ['low', 'Mostly 3 or below', ''], ['unsure', 'I’m not sure yet', 'That’s fine. We’ll suggest a middle level and you can talk it through at interview.']], a.grades) + '</fieldset>' + nav(false) + '</form>';
      if (step === 'style') html = progress() + '<form data-q><fieldset class="pay-fieldset"><legend>How do you like to learn?</legend>' + radios('style', [['hands', 'Hands-on, in a workshop, salon or kitchen', ''], ['mix', 'A mix of practical and classroom', ''], ['class', 'Projects, research and computers', '']], a.style) + '</fieldset>' + nav(true) + '</form>';
      if (step === 'results') {
        var res = score();
        html = '<h2 tabindex="-1" id="match-title">' + (res.length ? 'Your ' + res.length + ' best matches' : 'We couldn’t find a close match') + '</h2>' +
          (res.length ? '<p>Based on what you told us. Open any course to see more, or save them all to compare.</p><div class="row" style="margin-bottom:1.25rem"><button type="button" class="btn btn-secondary" data-save-all>Save all to my shortlist</button><button type="button" class="btn-link" data-restart>Start again</button></div>' +
            '<ol class="match-list">' + res.map(function (r) {
              return '<li class="match-item">' + imgPh(imgFor(r.c), 'Image', 'match-img') + '<div><div class="tags"><span class="tag tag-solid">' + esc(r.c.level) + '</span><span class="tag">' + esc(r.c.subject) + '</span></div><h3><a href="course.html?id=' + r.c.id + '">' + esc(r.c.title) + '</a></h3><ul class="why">' + r.why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul></div></li>';
            }).join('') + '</ol>' +
            '<p style="margin-top:1.5rem">Want to see how a subject builds from Level 1 to university? <a href="subject.html?id=' + res[0].c.subjectId + '">Explore the ' + esc(res[0].c.subject) + ' pathway</a>.</p>'
            : '<p>Try choosing different interests, or talk to our careers team on <a href="tel:01245293031">01245 293031</a>. They do this every day.</p><button type="button" class="btn" data-restart>Start again</button>');
      }
      root.innerHTML = html;
      var form = $('form', root);
      if (form) form.addEventListener('submit', function (e) {
        e.preventDefault();
        var err = $('[data-match-err]', root);
        if (step === 'interests') {
          a.interests = $all('input[name="interest"]:checked', form).map(function (x) { return x.value; });
          if (!a.interests.length) { err.textContent = 'Choose at least one thing you enjoy'; err.hidden = false; $('input', form).focus(); return; }
          if (a.interests.length > 3) { err.textContent = 'Choose up to three, so we can find the closest matches'; err.hidden = false; return; }
        } else {
          var picked = $('input[type="radio"]:checked', form);
          if (!picked) { err.textContent = 'Choose one answer to continue'; err.hidden = false; $('input', form).focus(); return; }
          a[step] = picked.value;
        }
        do { i++; } while (steps[i] === 'grades' && visibleSteps().indexOf('grades') < 0);
        render(true);
      });
      var back = $('[data-back]', root);
      if (back) back.addEventListener('click', function () { do { i--; } while (steps[i] === 'grades' && visibleSteps().indexOf('grades') < 0); render(true); });
      $all('[data-restart]', root).forEach(function (b) { b.addEventListener('click', function () { a = { interests: [], stage: '', grades: '', style: '' }; i = 0; render(true); }); });
      var sa = $('[data-save-all]', root);
      if (sa) sa.addEventListener('click', function () {
        var list = shortlist();
        score().forEach(function (r) { if (list.indexOf(r.c.id) < 0) list.push(r.c.id); });
        setShortlist(list); sa.textContent = 'Saved to your shortlist'; sa.disabled = true; announce('All matches saved to your shortlist');
      });
      if (focus) { var f = $('#match-title', root) || $('legend', root); if (f) { f.setAttribute('tabindex', '-1'); f.focus(); } }
    }
    render(false);
  }

  /* --- Subject pathway page (R61) --------------------------------------- */
  function initSubject() {
    var root = $('[data-subject]');
    if (!root) return;
    var id = Number(params().get('id') || 48);
    var s = DATA.subjects.filter(function (x) { return x.id === id; })[0] || DATA.subjects.filter(function (x) { return x.id === 48; })[0];
    var courses = COURSES.filter(function (c) { return c.subjectId === s.id; });
    document.title = s.title + ' | Chelmsford College prototype';
    var key = IMG_BY_SUBJECT[s.id] || 'learners';
    var careers = [];
    courses.forEach(function (c) { c.careers.forEach(function (k) { if (careers.indexOf(k) < 0) careers.push(k); }); });
    var levels = [0, 1, 2, 3];
    var rungs = levels.map(function (L) {
      var cs = courses.filter(function (c) { return c.levelNum === L; });
      if (!cs.length) return '';
      return '<li class="rung"><div class="rung-level"><span>' + (L === 0 ? 'Entry' : 'Level ' + L) + '</span><small>' + ({ 0: 'Building skills', 1: 'Like GCSEs 3 to 1', 2: 'Like GCSEs 9 to 4', 3: 'Like A Levels' })[L] + '</small></div><ul>' +
        cs.map(function (c) { return '<li><a href="course.html?id=' + c.id + '">' + esc(c.title) + '</a> <span class="muted">' + esc(c.duration) + '</span></li>'; }).join('') + '</ul></li>';
    }).join('');
    var events = EVENTS.filter(function (e) { return e.subjects.indexOf(s.id) > -1 || e.type === 'Open event'; }).slice(0, 2);
    root.innerHTML =
      '<section class="hero subject-hero"><div class="container hero-grid">' +
      '<div class="hero-media">' + imgPh(key, 'Subject image 16:9 &middot; ' + esc(s.title)) + '</div>' +
      '<div class="hero-copy"><nav class="breadcrumb" aria-label="Breadcrumb"><ul class="breadcrumb-list"><li class="breadcrumb-item"><a href="home.html">Home</a></li><li class="breadcrumb-item"><a href="courses.html">Courses</a></li><li class="breadcrumb-item" aria-current="page">' + esc(s.title) + '</li></ul></nav>' +
      '<span class="overline">Subject</span><h1>' + esc(s.title) + '</h1><p class="lead">' + esc((s.description || '').split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.')) + '</p>' +
      '<div class="row"><a class="btn btn-apply btn-lg" href="courses.html?subject=' + s.id + '">See all ' + courses.length + ' courses</a></div></div></div></section>' +
      '<div class="container"><p class="wf-note" data-note="1"><span class="wf-note-label">Data</span>The heading and introduction come from <code>course_sections</code> (<code>S_TITLE</code>, <code>S_DESCRIPTION</code>). The route below is built from the courses in this section, grouped by level, so it updates itself when a course is added. Marketing adds the image, video and student stories in the CMS.</p></div>' +
      '<section class="band"><div class="container"><h2>Your route through ' + esc(s.title) + '</h2><p class="muted">Start at the level that suits your grades and move up a level each year.</p><ol class="pathway">' + rungs +
      '<li class="rung rung-next"><div class="rung-level"><span>Next</span><small>After college</small></div><ul><li>University degree or a Higher Technical Qualification</li><li>Higher or degree apprenticeship</li><li>Straight into work</li></ul></li></ol>' +
      '<p class="wf-note" data-note="2"><span class="wf-note-label">Behaviour</span>The “pathway” idea already exists on the current site as an image. Here it is live data, and every rung links to a course page.</p></div></section>' +
      (careers.length ? '<section class="band band-alt"><div class="container"><h2>Where it can lead</h2><div class="career-cloud">' + careers.map(function (k) { return '<a class="chip" href="courses.html?mode=career&q=' + encodeURIComponent(k) + '">' + esc(k.charAt(0).toUpperCase() + k.slice(1)) + '</a>'; }).join('') + '</div></div></section>' : '') +
      '<section class="band"><div class="container"><div class="section-head"><h2>Come and see us</h2><a href="events.html">All events</a></div><div class="event-list">' + events.map(eventCard).join('') + '</div></div></section>';
  }

  /* --- Employer vacancy form (R62) -------------------------------------- */
  function initVacancy() {
    var root = $('[data-vacancy]');
    if (!root) return;
    var v = {};
    var step = 0;
    var LBL = ['Your business', 'The role', 'Contact'];
    function stepper() {
      return '<ol class="stepper" aria-label="Vacancy form progress">' + LBL.concat(['Check']).map(function (l, n) { return '<li data-n="' + (n + 1) + '" class="' + (n < step ? 'done' : '') + '"' + (n === step ? ' aria-current="step"' : '') + '><span>' + l + '</span></li>'; }).join('') + '</ol>';
    }
    function field(id, label, val, extra) { return '<div class="field"><label for="' + id + '">' + label + '</label><input type="text" id="' + id + '" value="' + esc(val || '') + '"' + (extra || '') + '></div>'; }
    function render(focus) {
      var html = stepper();
      if (step === 0) html += '<form data-v novalidate>' + field('v-org', 'Business name', v.org, ' autocomplete="organization"') +
        '<div class="field"><label for="v-size">Number of employees</label><select id="v-size"><option value="">Choose one</option><option>1 to 9</option><option>10 to 49</option><option>50 to 249</option><option>250 or more</option></select></div>' +
        '<fieldset class="pay-fieldset"><legend style="font-size:1rem;font-weight:600">Do you pay the apprenticeship levy?</legend><div class="radio-row"><label class="radio-pill"><input type="radio" name="v-levy" value="Yes"><span>Yes</span></label><label class="radio-pill"><input type="radio" name="v-levy" value="No"><span>No</span></label><label class="radio-pill"><input type="radio" name="v-levy" value="Not sure"><span>Not sure</span></label></div></fieldset>';
      if (step === 1) html += '<form data-v novalidate>' + field('v-role', 'Job title', v.role) +
        '<div class="field"><label for="v-area">Area of work</label><select id="v-area"><option value="">Choose one</option><option>Construction and building services</option><option>Electrical</option><option>Engineering</option><option>Business and administration</option><option>Accounting</option><option>Digital and IT</option><option>Hair and beauty</option><option>Hospitality and catering</option><option>Health and care</option><option>Childcare and education</option><option>Something else</option></select></div>' +
        '<fieldset class="pay-fieldset"><legend style="font-size:1rem;font-weight:600">What are you looking for?</legend><div class="radio-row"><label class="radio-pill"><input type="radio" name="v-type" value="A new apprentice"><span>A new apprentice</span></label><label class="radio-pill"><input type="radio" name="v-type" value="Train an existing employee"><span>Train an existing employee</span></label><label class="radio-pill"><input type="radio" name="v-type" value="T Level placement"><span>T Level placement</span></label></div></fieldset>' +
        '<div class="field"><label for="v-start">When would you like them to start? <span class="opt">(optional)</span></label><select id="v-start"><option>As soon as possible</option><option>In the next 3 months</option><option>September 2027</option><option>Not sure yet</option></select></div>';
      if (step === 2) html += '<form data-v novalidate>' + field('v-name', 'Your name', v.name, ' autocomplete="name"') + field('v-email', 'Email address', v.email, ' autocomplete="email" type="email"') + field('v-phone', 'Phone number', v.phone, ' autocomplete="tel" inputmode="tel"');
      if (step === 3) html += '<dl class="summary-list">' + [['Business', v.org + ' (' + v.size + ', levy: ' + v.levy + ')', 0], ['Role', v.role + ', ' + v.area, 1], ['Looking for', v.type + ', ' + v.start, 1], ['Contact', v.name + ', ' + v.email + ', ' + v.phone, 2]].map(function (r) {
        return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd><dd class="change"><a href="#vacancy" data-goto="' + r[2] + '">Change<span class="visually-hidden"> ' + r[0].toLowerCase() + '</span></a></dd></div>';
      }).join('') + '</dl><form data-v novalidate><p class="field-hint">We’ll use these details to contact you about this vacancy. <a href="#">Privacy notice</a>.</p>';
      if (step === 4) {
        root.innerHTML = '<div class="confirm-panel" tabindex="-1" id="v-done"><div class="tick" aria-hidden="true">&#10003;</div><h3>Thanks, ' + esc(v.name.split(' ')[0]) + '. We’ve got your vacancy.</h3><p>Reference <strong>EMP-' + String(Date.now()).slice(-5) + '</strong>. Someone from our employer team will call you on ' + esc(v.phone) + ' within two working days to talk about the ' + esc(v.role) + ' role.</p><p>We’ve sent a copy to ' + esc(v.email) + '.</p><p><a class="btn btn-secondary" href="event.html?id=ev5">Meet us at the employer breakfast</a></p></div>';
        $('#v-done').focus();
        return;
      }
      html += '<div class="error-summary" role="alert" tabindex="-1" hidden><h2>There is a problem</h2><ul></ul></div><div class="row"><button class="btn btn-lg ' + (step === 3 ? 'btn-apply' : '') + '" type="submit">' + (step === 3 ? 'Send vacancy' : 'Continue') + '</button>' + (step > 0 ? '<button type="button" class="btn-link" data-vback>Back</button>' : '') + '</div>' +
        (step === 0 ? '<button type="button" class="btn-link" data-vdemo>Fill with demo details (prototype only)</button>' : '') + '</form>';
      root.innerHTML = html;
      if (step === 0) { if (v.size) $('#v-size').value = v.size; if (v.levy) { var lv = $('input[name="v-levy"][value="' + v.levy + '"]'); if (lv) lv.checked = true; } }
      if (step === 1) { if (v.area) $('#v-area').value = v.area; if (v.type) { var t = $('input[name="v-type"][value="' + v.type + '"]'); if (t) t.checked = true; } if (v.start) $('#v-start').value = v.start; }
      var form = $('form', root);
      $all('[data-goto]', root).forEach(function (l) { l.addEventListener('click', function (e) { e.preventDefault(); step = Number(l.getAttribute('data-goto')); render(true); }); });
      var back = $('[data-vback]', root); if (back) back.addEventListener('click', function () { step--; render(true); });
      var demo = $('[data-vdemo]', root);
      if (demo) demo.addEventListener('click', function () {
        v = { org: 'Moulsham Joinery Ltd', size: '10 to 49', levy: 'No', role: 'Apprentice joiner', area: 'Construction and building services', type: 'A new apprentice', start: 'September 2027', name: 'Priya Shah', email: 'priya@example.com', phone: '01245 000000' };
        render(false);
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var errs = [];
        function need(id, msg) { var el = $('#' + id); if (!el.value.trim()) errs.push([id, msg]); return el.value.trim(); }
        if (step === 0) { v.org = need('v-org', 'Enter your business name'); v.size = need('v-size', 'Choose how many people you employ'); var l = $('input[name="v-levy"]:checked'); if (!l) errs.push(['v-org', 'Tell us whether you pay the levy (choose “Not sure” if you don’t know)']); else v.levy = l.value; }
        if (step === 1) { v.role = need('v-role', 'Enter the job title'); v.area = need('v-area', 'Choose the area of work'); var t = $('input[name="v-type"]:checked'); if (!t) errs.push(['v-role', 'Choose what you are looking for']); else v.type = t.value; v.start = $('#v-start').value; }
        if (step === 2) { v.name = need('v-name', 'Enter your name'); v.email = need('v-email', 'Enter your email address'); v.phone = need('v-phone', 'Enter a phone number so we can call you'); if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) errs.push(['v-email', 'Enter an email address in the correct format, like name@example.com']); }
        if (errs.length) { var sum = $('.error-summary', root); $('ul', sum).innerHTML = errs.map(function (x) { return '<li><a href="#' + x[0] + '">' + esc(x[1]) + '</a></li>'; }).join(''); sum.hidden = false; sum.focus(); return; }
        step++; render(true);
      });
      if (focus) { var h = $('.stepper', root); var first = $('input, select', root) || $('dl', root); if (first) first.focus(); }
    }
    render(false);
  }

  /* --- Display settings (R64) ------------------------------------------- */
  function applyA11y(p) {
    var h = document.documentElement;
    ['a11y-text-lg', 'a11y-text-xl', 'a11y-contrast', 'a11y-readable', 'a11y-underline', 'a11y-motion'].forEach(function (c) { h.classList.remove(c); });
    if (p.size) h.classList.add('a11y-text-' + p.size);
    if (p.contrast) h.classList.add('a11y-contrast');
    if (p.readable) h.classList.add('a11y-readable');
    if (p.underline) h.classList.add('a11y-underline');
    if (p.motion) h.classList.add('a11y-motion');
  }
  applyA11y(local.get('cc-a11y', {}));
  function initA11y() {
    var form = $('[data-a11y]');
    if (!form) return;
    var p = local.get('cc-a11y', {});
    function sync() {
      $all('input[name="a11y-size"]', form).forEach(function (r) { r.checked = (r.value === (p.size || '')); });
      ['contrast', 'readable', 'underline', 'motion'].forEach(function (k) { $('input[name="' + k + '"]', form).checked = !!p[k]; });
    }
    sync();
    form.addEventListener('change', function () {
      var size = $('input[name="a11y-size"]:checked', form);
      p = { size: size ? size.value : '', contrast: $('input[name="contrast"]', form).checked, readable: $('input[name="readable"]', form).checked, underline: $('input[name="underline"]', form).checked, motion: $('input[name="motion"]', form).checked };
      local.set('cc-a11y', p); applyA11y(p); announce('Display settings updated');
    });
    $('[data-a11y-reset]', form).addEventListener('click', function () { p = {}; local.set('cc-a11y', p); applyA11y(p); sync(); announce('Display settings reset'); });
  }

  /* --- Application tracker + interview booking (R63) -------------------- */
  function initApplication() {
    var root = $('[data-application]');
    if (!root) return;
    var c = courseById(params().get('id') || 374) || courseById(374);
    var st = {};
    var SLOTS = [['2026-11-10', ['4pm', '4.30pm', '5pm']], ['2026-11-12', ['10am', '2pm']], ['2026-11-17', ['4pm', '4.30pm']], ['2026-11-19', ['1pm', '1.30pm', '2pm']]];
    function render(focusSel) {
      var booked = st.slot;
      var steps = [
        ['done', 'Application received', 'Thursday 29 October 2026'],
        [booked ? 'done' : 'current', booked ? 'Interview booked' : 'Book your interview', booked ? fmtDate(booked.d) + ' at ' + booked.t + ', ' + c.campus : 'Choose a time that suits you'],
        ['todo', 'Your offer', 'Usually within a week of your interview'],
        ['todo', 'Enrol', 'Summer 2027, once you have your results']
      ];
      var html = '<span class="overline">Your application &middot; APP-2027-04821</span><h1 tabindex="-1">Hi Maya, here’s where you are</h1>' +
        '<div class="lookup-result"><span class="overline">Applied for</span><p style="font-weight:700;margin:0"><a href="course.html?id=' + c.id + '">' + esc(c.title) + '</a></p><p class="muted" style="margin:0">' + esc(c.level) + ' &middot; starts ' + esc(c.start) + ' &middot; ' + esc(c.campus) + '</p></div>' +
        '<ol class="timeline">' + steps.map(function (s) { return '<li class="tl-' + s[0] + '"' + (s[0] === 'current' ? ' aria-current="step"' : '') + '><strong>' + esc(s[1]) + '</strong><span>' + esc(s[2]) + '</span></li>'; }).join('') + '</ol>';
      if (!booked) {
        html += '<section class="booking" style="position:static" aria-labelledby="slot-title"><h2 id="slot-title">Book your interview</h2><p>A relaxed 20-minute chat with a tutor about the course and what you enjoy. Bring any artwork or photos of things you’ve made.</p>' +
          '<form data-slot><fieldset class="pay-fieldset"><legend style="font-size:1rem;font-weight:600">Choose a day and time</legend>' +
          SLOTS.map(function (d) { return '<p class="slot-day">' + fmtDate(d[0]) + '</p><div class="radio-row">' + d[1].map(function (t) { return '<label class="radio-pill"><input type="radio" name="slot" value="' + d[0] + '|' + t + '"><span>' + t + '</span></label>'; }).join('') + '</div>'; }).join('') +
          '</fieldset><p class="field-error" data-slot-err hidden>Choose a time for your interview</p><label class="check" style="margin-bottom:1rem"><input type="checkbox" id="slot-parent" checked> Send the details to my parent or carer as well</label><button class="btn btn-apply btn-lg" type="submit">Book this interview</button></form>' +
          '<p class="muted" style="margin-top:1rem">None of these work? <a href="tel:01245265611">Call admissions on 01245 265611</a>.</p></section>';
      } else {
        html += '<div class="confirm-panel" tabindex="-1" id="slot-done"><div class="tick" aria-hidden="true">&#10003;</div><h2>Your interview is booked</h2><p><strong>' + fmtDate(booked.d) + ' at ' + booked.t + '</strong><br>' + esc(c.campus) + ' campus, main reception</p><p>We’ve emailed you' + (booked.parent ? ' and your parent or carer' : '') + ', and we’ll text a reminder the day before.</p><div class="row"><a class="btn btn-secondary" href="' + icsFor({ id: 'interview', date: booked.d, startH: '160000', endH: '162000', title: 'Interview: ' + c.title, location: c.campus + ' campus, Chelmsford College' }) + '" download="chelmsford-interview.ics">Add to calendar</a><button type="button" class="btn-link" data-rebook>Change time</button></div></div>' +
          '<h2 style="margin-top:2rem;font-size:1.25rem">Before your interview</h2><ul class="fact-list"><li>Bring any artwork, sketchbooks or photos of things you’ve made</li><li>Bring your latest school report or predicted grades</li><li>Tell us about any support you’ll need: <a href="#">add support needs</a></li><li>Have a look round at the <a href="event.html?id=ev1">Open Evening</a> first</li></ul>';
      }
      root.innerHTML = html;
      var f = $('[data-slot]', root);
      if (f) f.addEventListener('submit', function (e) {
        e.preventDefault();
        var s = $('input[name="slot"]:checked', f);
        if (!s) { var er = $('[data-slot-err]', f); er.hidden = false; $('input[name="slot"]', f).focus(); return; }
        var parts = s.value.split('|');
        st.slot = { d: parts[0], t: parts[1], parent: $('#slot-parent').checked };
        render('#slot-done');
      });
      var rb = $('[data-rebook]', root);
      if (rb) rb.addEventListener('click', function () { st.slot = null; render('#slot-title'); });
      if (focusSel) { var el = $(focusSel, root); if (el) { if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1'); el.focus(); } }
    }
    render(null);
  }

  /* --- "Ask about this course" helper (R65) ----------------------------- */
  function courseAnswer(c, q) {
    q = q.toLowerCase();
    var link = function (id, t) { return ' <a href="#' + id + '" data-open-acc="' + id + '">' + t + '</a>'; };
    if (/(cost|fee|pay|price|free|money|£|loan)/.test(q)) return (plain(c.fees) ? 'Fees: ' + esc(plain(c.fees)) + '. ' : '') + (c.funding.indexOf('16-18') > -1 ? 'Tuition is free if you’re 16 to 18. ' : '') + (c.additionalFees ? esc(plain(c.additionalFees)) + ' ' : '') + link('fees', 'See fees and funding');
    if (/(grade|gcse|entry|require|need to get|qualif|get in)/.test(q)) return c.eligibility ? 'You’ll need: ' + esc(plain(c.eligibility)) + link('entry', 'See entry requirements') : 'Entry requirements aren’t listed for this course yet. Our admissions team can tell you.';
    if (/(start|when|date|begin|september|january)/.test(q)) return 'It starts ' + esc(c.start) + (c.duration ? ' and lasts ' + esc(c.duration) : '') + '.';
    if (/(assess|exam|test|coursework|portfolio|mark)/.test(q)) return c.assessment ? esc(plain(c.assessment)) + link('assess', 'More on assessment') : 'Assessment details aren’t listed for this course yet.';
    if (/(job|career|lead|after|university|degree|progress|work)/.test(q)) return c.employability ? esc(firstPara(c.employability)) + link('next', 'See where it can lead') : 'Our careers team can talk you through where this course can lead.';
    if (/(where|campus|location|site|travel|bus)/.test(q)) return 'It’s taught at ' + esc(c.campus) + (c.campus === 'Online' ? '' : ' campus in Chelmsford') + '. <a href="#">Travel and directions</a>';
    if (/(level|hard|difficult|a level|equivalent)/.test(q)) return esc(c.level) + (c.levelNum === 3 ? ', which is equivalent to A Levels.' : c.levelNum === 2 ? ', which is equivalent to GCSEs at grades 9 to 4.' : c.levelNum === 1 ? ', which is equivalent to GCSEs at grades 3 to 1.' : '.') + ' <a href="#" data-modal-open="level-modal" data-level="' + c.levelNum + '">What do the levels mean?</a>';
    if (/(how long|duration|years|hours|days|part)/.test(q)) return 'It lasts ' + esc(c.duration) + ' and is ' + esc(c.mode.toLowerCase()) + '.';
    return null;
  }
  function initCourseHelper(c) {
    var box = $('[data-course-helper]');
    if (!box) return;
    var log = $('.helper-log', box);
    var form = $('form', box);
    function ask(q) {
      var a = courseAnswer(c, q);
      var item = document.createElement('div');
      item.className = 'helper-qa';
      item.innerHTML = '<p class="helper-q">' + esc(q) + '</p><div class="helper-a">' + (a ? '<span class="helper-src">From the course record</span>' + a : 'I can’t answer that from the course record, so it’s one for a person. <a href="#" data-ask-human>Send it to our admissions team</a> or call <a href="tel:01245293031">01245 293031</a>.') + '</div>';
      log.appendChild(item);
      log.hidden = false;
      announce(a ? plain(a) : 'That question needs a person. Send it to the admissions team.');
      var human = $('[data-ask-human]', item);
      if (human) human.addEventListener('click', function (e) {
        e.preventDefault();
        human.parentNode.innerHTML = 'Thanks. We’ve sent your question to admissions with this course attached, and they’ll reply by email within a working day. <span class="muted">(Prototype: they would ask for your email address first.)</span>';
      });
    }
    $all('[data-q-chip]', box).forEach(function (b) { b.addEventListener('click', function () { ask(b.textContent); }); });
    form.addEventListener('submit', function (e) { e.preventDefault(); var i = $('input', form); if (i.value.trim()) { ask(i.value.trim()); i.value = ''; } });
    box.addEventListener('click', function (e) {
      var a = e.target.closest('[data-open-acc]');
      if (!a) return;
      var item = document.getElementById(a.getAttribute('data-open-acc'));
      if (item && !item.classList.contains('open')) { var t = $('.accordion-title', item); window.setTimeout(function () { t.click(); t.focus(); }, 0); }
    });
  }

  /* --- Greyscale / designed toggle (V2-04) ------------------------------- */
  function applyTheme() {
    var lofi = session.get('cc-lofi', false);
    $all('link[rel="stylesheet"]').forEach(function (l) { if (/theme\.css$/.test(l.getAttribute('href'))) l.disabled = !!lofi; });
    document.documentElement.classList.toggle('lofi', !!lofi);
    $all('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', lofi ? 'true' : 'false');
      b.textContent = lofi ? 'View the designed version' : 'View the greyscale wireframe';
    });
  }
  function initThemeToggle() {
    applyTheme();
    $all('[data-theme-toggle]').forEach(function (b) {
      b.addEventListener('click', function () { session.set('cc-lofi', !session.get('cc-lofi', false)); applyTheme(); });
    });
  }
  applyTheme();

  /* --- Never keep what someone typed (V3.1) -------------------------------
     Browsers restore form fields on Back/Forward and reload. On a shared
     college or library computer that leaks one person's details to the next,
     so every form starts empty. (Display settings and the shortlist are
     preferences, not personal details, and are kept on purpose.) */
  function resetForms() {
    $all('form').forEach(function (f) {
      if (f.hasAttribute('data-a11y') || f.id === 'results-form' || f.id === 'search-form') return;
      try { f.reset(); } catch (e) { /* ignore */ }
    });
  }
  // Browsers put typed values back during load (after DOMContentLoaded), so
  // clear again once the page is shown, and reload pages restored from cache.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { window.location.reload(); return; }
    resetForms();
    window.setTimeout(resetForms, 0);
  });

  document.addEventListener('DOMContentLoaded', function () {
    resetForms();
    initThemeToggle();
    initHeader();
    initSiteSearchOverlay();
    initSiteSearchPage();
    initLevelLinks();
    initSearchPanels();
    initHome();
    initResults();
    initCourse();
    initEvents();
    initEvent();
    initPay();
    initShortlist();
    initApply();
    initViewer();
    initMatch();
    initSubject();
    initVacancy();
    initA11y();
    initApplication();
    bindSaveButtons(document);
  });
})();
