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

  /* --- Events (sample content: the brief's sample events were not in the pack) */
  var EVENTS = [
    { id: 'ev1', title: 'Open Evening: explore courses and campuses', type: 'Open event', date: '2026-11-17', start: '5pm', end: '7.30pm', startH: '170000', endH: '193000', campus: 'Both campuses', location: 'Moulsham Street and Princes Road, Chelmsford', audience: ['16-18', 'parents', 'adult'], subjects: [], status: 'few',
      summary: 'Meet our tutors, tour the workshops and salons, and get help with your application on the night.',
      agenda: ['5pm: Welcome talk from the Principal (repeated at 6pm)', 'Subject zones: talk to tutors and see student work', 'Free shuttle bus between campuses every 15 minutes', 'Apply on the night with our admissions team', 'Finance, travel and learning support advice stand'] },
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
    { id: 'ev6', title: 'Open Evening: January', type: 'Open event', date: '2027-01-20', start: '5pm', end: '7.30pm', startH: '170000', endH: '193000', campus: 'Both campuses', location: 'Moulsham Street and Princes Road, Chelmsford', audience: ['16-18', 'parents', 'adult'], subjects: [], status: 'available',
      summary: 'Our second Open Evening of the year: see the facilities, meet tutors and apply on the night.',
      agenda: ['Welcome talks at 5pm and 6pm', 'Subject zones and facility tours', 'Apply on the night'] },
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
      if (q.length < 2) { results.hidden = true; tabsWrap.hidden = false; panels.hidden = false; return; }
      var courses = COURSES.filter(function (c) {
        return (c.title + ' ' + c.subject + ' ' + (c.h1 || '') + ' ' + c.careers.join(' ')).toLowerCase().indexOf(q) > -1;
      });
      var subjects = DATA.subjects.filter(function (s) { return s.title.toLowerCase().indexOf(q) > -1; }).slice(0, 3);
      var careers = [];
      COURSES.forEach(function (c) { c.careers.forEach(function (k) { if (k.indexOf(q) > -1 && careers.indexOf(k) === -1) careers.push(k); }); });
      careers = careers.slice(0, 3);
      var html = '<p class="result-count" role="status">' + courses.length + (courses.length === 1 ? ' course' : ' courses') + ' for “' + esc(input.value.trim()) + '”</p>';
      if (courses.length) html += '<h3>Courses</h3><ul>' + courses.slice(0, 5).map(function (c) {
        return '<li><a class="res" href="' + BASE + 'course.html?id=' + c.id + '"><span>' + highlight(c.title, q) + '<small>' + esc(c.subject) + ' &middot; ' + esc(c.duration) + '</small></span><span class="tag tag-solid">' + esc(c.level) + '</span></a></li>';
      }).join('') + '</ul>';
      if (careers.length) html += '<h3>Careers</h3><ul>' + careers.map(function (k) {
        return '<li><a class="res" href="' + BASE + 'courses.html?mode=career&q=' + encodeURIComponent(k) + '"><span>I want to be a ' + highlight(k, q) + '</span></a></li>';
      }).join('') + '</ul>';
      if (subjects.length) html += '<h3>Subjects</h3><ul>' + subjects.map(function (s) {
        return '<li><a class="res" href="' + BASE + 'courses.html?subject=' + s.id + '"><span>' + highlight(s.title, q) + '</span></a></li>';
      }).join('') + '</ul>';
      if (!courses.length && !careers.length && !subjects.length) html += '<p>Nothing matches yet. Try a subject such as “construction”, or call our careers team on <a href="tel:01245293031">01245 293031</a>.</p>';
      else html += '<a class="mega-all" href="' + BASE + 'courses.html?q=' + encodeURIComponent(input.value.trim()) + '">See all results</a>';
      results.innerHTML = html;
      results.hidden = false; tabsWrap.hidden = true; panels.hidden = true;
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
      '<p class="wf-note" data-note="2"><span class="wf-note-label">Build</span>In production, an Umbraco sync job reads <code>courses</code>, <code>course_sections</code>, <code>course_level_link</code> and <code>course_fund_link</code> every 15 minutes (or on a webhook from the college\'s course database) and caches them. Marketing adds images, video and testimonials in the CMS around the data. The data itself stays mastered in the college\'s systems.</p></div>' +

      '<div class="container course-layout"><div>' +
      '<!-- Key facts (R35) --><h2 class="visually-hidden">Key facts</h2><dl class="key-facts">' +
      '<div><dt>Level</dt><dd data-field="course_level_link → course_levels">' + esc(c.level) + (c.levelNum === 3 ? ' <span class="muted" style="font-weight:400">(equivalent to A Levels)</span>' : c.levelNum === 2 ? ' <span class="muted" style="font-weight:400">(equivalent to GCSEs 9–4)</span>' : '') + '</dd></div>' +
      '<div><dt>Starts</dt><dd data-field="C_STARTDATE">' + esc(startFact) + '</dd></div>' +
      '<div><dt>Duration</dt><dd data-field="C_DURATION">' + esc(c.duration) + '</dd></div>' +
      '<div><dt>Study mode</dt><dd data-field="C_MODE">' + esc(c.mode) + '</dd></div>' +
      '<div><dt>Campus</dt><dd data-field="(not in data: illustrative)">' + esc(c.campus) + '</dd></div>' +
      '<div><dt>Fees</dt><dd data-field="C_FEES">' + esc(feeLine.length > 60 ? (funded ? 'Free for 16–18' : 'See fees and funding') : feeLine) + '</dd></div>' +
      '</dl>' +
      '<p class="wf-note query" data-note="3"><span class="wf-note-label">Open question</span>Campus is not in the supplied <code>courses</code> table, so it is illustrative here. Which table holds campus, and will part-time and evening courses be in the same table (all 33 demo courses are <code>FT</code>)?</p>' +
      '<nav class="jump-links" aria-label="On this page">' + sections.map(function (s) { return '<a href="#' + s.id + '">' + s.title + '</a>'; }).join('') + '<a href="#how-to-apply">How to apply</a></nav>' +
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
  function icsFor(e) {
    var d = e.date.replace(/-/g, '');
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Chelmsford College//Prototype//EN', 'BEGIN:VEVENT',
      'UID:' + e.id + '@chelmsford-prototype', 'DTSTAMP:20261029T120000Z', 'DTSTART;TZID=Europe/London:' + d + 'T' + e.startH,
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
      (e.campus !== 'Online' ? '<h2>Getting here</h2><div class="wf-placeholder map-ph">Map embed &middot; ' + esc(e.campus) + '</div><p class="muted" style="margin-top:0.5rem">Free parking on the evening. Step-free access to all areas. <a href="#">Accessibility information</a>.</p>' : '') +
      '<p class="wf-note" data-note="1"><span class="wf-note-label">CMS</span>Events are a CMS content type: title, type, date and time, campus, audience, linked subjects, capacity and description. Capacity drives the “Few places left” and “Fully booked” states automatically. Past events drop off the listing.</p>' +
      '<p class="wf-note query" data-note="2"><span class="wf-note-label">Open question</span>The sample event details were not in the tender pack, so these events are placeholders. Do bookings need to go into a CRM (e.g. Dynamics, Salesforce) or the college\'s MIS for follow-up?</p>' +
      '</div>' +
      '<!-- Booking (R41) --><aside><div class="booking" id="booking">' + bookingForm(e, full) + '</div></aside></div>' +
      '<section class="band band-alt"><div class="container"><div class="section-head"><h2>Other events</h2><a href="events.html">All events</a></div><div class="event-list">' + others.map(eventCard).join('') + '</div></div></section>';
    bindBooking(e, full);
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
    });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var errs = [];
      $all('.field', form).forEach(function (f) { f.classList.remove('has-error'); var m = $('.field-error', f); if (m) m.remove(); });
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
      var sum = $('.error-summary', box);
      if (errs.length) { $('ul', sum).innerHTML = errs.join(''); sum.hidden = false; sum.focus(); return; }
      var guests = $('#b-guests').value;
      box.innerHTML = '<div class="confirm-panel" tabindex="-1" id="booked"><div class="tick" aria-hidden="true">&#10003;</div><h2>' + (full ? 'You’re on the waiting list' : 'You’re booked in') + '</h2>' +
        '<p><strong>' + esc(e.title) + '</strong><br>' + fmtDate(e.date) + ', ' + e.start + ' to ' + e.end + '<br>' + esc(e.location) + '</p>' +
        '<p>We’ve emailed your confirmation to <strong>' + esc(em) + '</strong>' + (full ? '.' : ' for ' + guests + (guests === '1' ? ' person.' : ' people.')) + '</p>' +
        '<p><a class="btn btn-secondary btn-block" href="' + icsFor(e) + '" download="chelmsford-college-' + e.id + '.ics">Add to calendar</a></p>' +
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
    var st = session.get('cc-pay', {});
    var pt = params().get('type');
    if (pt && PAY_TYPES[pt] && !window.location.hash) { st = { type: pt }; session.set('cc-pay', st); }

    function save() { session.set('cc-pay', st); }
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
          '<div class="provider-frame"><div class="provider-bar"><span class="wf-placeholder logo" style="width:110px;height:28px">College logo</span><span>Secure payment &middot; hosted by the payment provider</span></div>' +
          '<p style="font-weight:700;font-size:1.25rem;margin-bottom:0.25rem">Pay ' + money(total()) + '</p><p class="muted">' + esc(T.label) + ' for ' + esc(st.learner) + '</p>' +
          (st.declined ? '<div class="notice error" role="alert"><strong>Your card was declined</strong>No money has been taken. Check your card details, or try another card.</div>' : '') +
          '<div class="wallet-row"><div class="wf-placeholder">Apple Pay</div><div class="wf-placeholder">Google Pay</div></div>' +
          '<p class="muted" style="text-align:center">or pay by card</p>' +
          '<form data-step="card" novalidate><div class="field"><label for="c-num">Card number</label><input type="text" id="c-num" inputmode="numeric" autocomplete="cc-number" value="4444 3333 2222 1111"></div>' +
          '<div class="card-grid-2"><div class="field"><label for="c-exp">Expiry date</label><input type="text" id="c-exp" autocomplete="cc-exp" placeholder="MM / YY" value="09 / 29"></div><div class="field"><label for="c-cvc">Security code</label><input type="text" id="c-cvc" inputmode="numeric" autocomplete="cc-csc" value="123"></div></div>' +
          '<div class="field"><label for="c-name">Name on card</label><input type="text" id="c-name" autocomplete="cc-name" value="' + esc(st.payer.name) + '"></div>' +
          '<button class="btn btn-apply btn-lg btn-block" type="submit">Pay ' + money(total()) + '</button></form>' +
          '<p style="text-align:center;margin-top:1rem"><a href="#review">Cancel and go back</a></p></div>' +
          '<p style="margin-top:0.75rem"><button type="button" class="btn-link" data-decline>Simulate a declined card (prototype only)</button></p>' +
          '<p class="wf-note" data-note="5"><span class="wf-note-label">Security</span>This panel is the payment provider\'s hosted page (e.g. Stripe Checkout, Worldpay, Pay360 or an education platform such as WisePay), styled with the college\'s colours. Card data never touches the college\'s servers, which keeps PCI DSS scope to SAQ-A. 3-D Secure (Strong Customer Authentication) is handled by the provider.</p>';
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
      var pr = $('[data-print]', root);
      if (pr) pr.addEventListener('click', function () { window.print(); });
      var np = $('[data-new-payment]', root);
      if (np) np.addEventListener('click', function () { session.del('cc-pay'); });
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
        (cmp.length > 1 ? '<h2 style="margin-top:2.5rem">Compare</h2><div class="compare-wrap"><table class="compare"><caption class="visually-hidden">Comparison of saved courses</caption><thead><tr><td></td>' + cmp.map(function (c) { return '<th scope="col"><a href="course.html?id=' + c.id + '">' + esc(c.title) + '</a></th>'; }).join('') + '</tr></thead><tbody>' +
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
    var st = session.get('cc-app', {});
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
        session.set('cc-app', st); render('#slot-done');
      });
      var rb = $('[data-rebook]', root);
      if (rb) rb.addEventListener('click', function () { st.slot = null; session.set('cc-app', st); render('#slot-title'); });
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

  document.addEventListener('DOMContentLoaded', function () {
    initThemeToggle();
    initHeader();
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
