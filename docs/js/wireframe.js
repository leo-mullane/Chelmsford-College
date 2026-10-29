/* ==========================================================================
   wireframe.js — shared interaction behaviour for lo-fi wireframes.

   Everything here is driven by data attributes and classes, so pages stay
   declarative and no page needs its own inline script. Keep it that way: a
   wireframe pack with five slightly different accordion implementations is
   how nav bugs get reported in a client review.

   All patterns are keyboard-operable and dismissible with Escape, because
   accessibility is cheaper to design in at wireframe stage than to retrofit.
   ========================================================================== */

(function () {
  'use strict';

  /* --- Navigation flyouts ------------------------------------------------
     Opened on hover AND focus. Hover alone would make the whole navigation
     unusable by keyboard, which is the single most common wireframe defect
     that survives into build. */
  function initNav() {
    var backdrop = document.querySelector('.flyout-backdrop');
    var items = document.querySelectorAll('.nav-item');

    function closeAll() {
      document.querySelectorAll('.nav-item.open').forEach(function (i) {
        i.classList.remove('open');
      });
      if (backdrop) backdrop.classList.remove('active');
    }

    items.forEach(function (item) {
      var flyout = item.querySelector('.nav-flyout');
      if (!flyout) return;

      var trigger = item.querySelector('.nav-link');
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-haspopup', 'true');
      }

      function open() {
        closeAll();
        item.classList.add('open');
        if (trigger) trigger.setAttribute('aria-expanded', 'true');
        if (backdrop) backdrop.classList.add('active');
      }

      function close() {
        item.classList.remove('open');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        if (backdrop) backdrop.classList.remove('active');
      }

      item.addEventListener('mouseenter', open);
      item.addEventListener('mouseleave', close);
      item.addEventListener('focusin', open);
      item.addEventListener('focusout', function () {
        window.setTimeout(function () {
          if (!item.contains(document.activeElement)) close();
        }, 10);
      });

      if (trigger) {
        trigger.addEventListener('click', function (ev) {
          if (trigger.getAttribute('href') === '#') {
            ev.preventDefault();
            item.classList.contains('open') ? close() : open();
          }
        });
      }
    });

    if (backdrop) backdrop.addEventListener('click', closeAll);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll();
    });
  }

  /* --- Accordions --------------------------------------------------------
     Markup: <div class="accordion-item"><button class="accordion-title">…
     Multiple panels may be open at once unless the .accordion carries
     data-single. */
  function initAccordions() {
    document.querySelectorAll('.accordion-title').forEach(function (title) {
      title.setAttribute('aria-expanded', 'false');
      title.addEventListener('click', function () {
        var item = title.closest('.accordion-item');
        var group = title.closest('.accordion');
        var willOpen = !item.classList.contains('open');

        if (group && group.hasAttribute('data-single')) {
          group.querySelectorAll('.accordion-item.open').forEach(function (o) {
            o.classList.remove('open');
            var t = o.querySelector('.accordion-title');
            if (t) t.setAttribute('aria-expanded', 'false');
          });
        }

        item.classList.toggle('open', willOpen);
        title.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
    });
  }

  /* --- Tabs --------------------------------------------------------------
     Markup: <button class="tab" data-tab="panel-id"> and
             <div class="tab-panel" id="panel-id"> */
  function initTabs() {
    document.querySelectorAll('.tabs').forEach(function (group) {
      var tabs = group.querySelectorAll('.tab');
      tabs.forEach(function (tab) {
        tab.setAttribute('role', 'tab');
        tab.addEventListener('click', function () {
          tabs.forEach(function (t) {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
          });
          tab.classList.add('active');
          tab.setAttribute('aria-selected', 'true');

          var target = document.getElementById(tab.getAttribute('data-tab'));
          if (!target) return;
          var container = target.parentElement;
          container.querySelectorAll('.tab-panel').forEach(function (p) {
            p.classList.remove('active');
          });
          target.classList.add('active');
        });
      });
    });
  }

  /* --- Carousels ---------------------------------------------------------
     Markup: <div class="carousel" data-autoplay="6000"> containing
             .carousel-track > .carousel-item, .carousel-arrow[data-dir],
             and an empty .carousel-indicators which is populated here. */
  function initCarousels() {
    document.querySelectorAll('.carousel').forEach(function (carousel) {
      var track = carousel.querySelector('.carousel-track');
      if (!track) return;
      var items = track.querySelectorAll('.carousel-item');
      var dotsHost = carousel.querySelector('.carousel-indicators');
      var index = 0;
      var timer = null;

      function render() {
        track.style.transform = 'translateX(-' + index * 100 + '%)';
        if (!dotsHost) return;
        dotsHost.querySelectorAll('.carousel-dot').forEach(function (d, i) {
          d.classList.toggle('active', i === index);
          d.setAttribute('aria-current', i === index ? 'true' : 'false');
        });
      }

      function go(n) {
        index = (n + items.length) % items.length;
        render();
      }

      if (dotsHost) {
        items.forEach(function (_, i) {
          var dot = document.createElement('button');
          dot.className = 'carousel-dot';
          dot.type = 'button';
          dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
          dot.addEventListener('click', function () { go(i); });
          dotsHost.appendChild(dot);
        });
      }

      carousel.querySelectorAll('.carousel-arrow').forEach(function (arrow) {
        arrow.addEventListener('click', function () {
          go(index + (arrow.getAttribute('data-dir') === 'prev' ? -1 : 1));
        });
      });

      var interval = parseInt(carousel.getAttribute('data-autoplay'), 10);
      if (interval > 0) {
        var start = function () { timer = window.setInterval(function () { go(index + 1); }, interval); };
        var stop = function () { window.clearInterval(timer); };
        start();
        carousel.addEventListener('mouseenter', stop);
        carousel.addEventListener('focusin', stop);
        carousel.addEventListener('mouseleave', start);
      }

      render();
    });
  }

  /* --- Modals ------------------------------------------------------------
     Markup: any element with data-modal-open="modal-id", and
             <div class="wf-modal" id="modal-id"> */
  function initModals() {
    function close(modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }

    document.querySelectorAll('[data-modal-open]').forEach(function (trigger) {
      trigger.addEventListener('click', function (ev) {
        ev.preventDefault();
        var modal = document.getElementById(trigger.getAttribute('data-modal-open'));
        if (!modal) return;
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        var panel = modal.querySelector('.wf-modal-panel');
        if (panel) {
          panel.setAttribute('tabindex', '-1');
          panel.focus();
        }
      });
    });

    document.querySelectorAll('.wf-modal').forEach(function (modal) {
      modal.addEventListener('click', function (ev) {
        if (ev.target === modal || ev.target.classList.contains('wf-modal-close')) close(modal);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      document.querySelectorAll('.wf-modal.open').forEach(close);
    });
  }

  /* --- Annotation toggle -------------------------------------------------
     Injects the floating control only when the page actually has notes, and
     remembers the choice for the session so a reviewer clicking through ten
     pages does not have to hide notes ten times. */
  function initNotes() {
    if (!document.querySelector('.wf-note')) return;

    /* Chelmsford College: notes are OFF by default so the prototype demos
       clean; a reviewer turns them on with the button, and the choice is
       remembered for the session. */
    var hidden = true;
    try {
      var stored = window.sessionStorage.getItem('wf-notes-hidden');
      if (stored !== null) hidden = stored === '1';
    } catch (e) { /* private mode */ }

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'wf-notes-toggle';

    function apply() {
      document.body.classList.toggle('wf-notes-hidden', hidden);
      button.textContent = hidden ? 'Show annotations' : 'Hide annotations';
      button.setAttribute('aria-pressed', hidden ? 'true' : 'false');
    }

    button.addEventListener('click', function () {
      hidden = !hidden;
      try { window.sessionStorage.setItem('wf-notes-hidden', hidden ? '1' : '0'); } catch (e) { /* private mode */ }
      apply();
    });

    document.body.appendChild(button);
    apply();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initAccordions();
    initTabs();
    initCarousels();
    initModals();
    initNotes();
  });
})();
