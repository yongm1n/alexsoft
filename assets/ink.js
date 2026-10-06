/* ALEXSOFT: static pages, optional language preference and progressive enhancement. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root || !root.document) return;
  var doc = root.document;
  var key = 'alexsoft.language';
  var saved;
  try { saved = root.localStorage.getItem(key); } catch (_) { /* Storage is optional. */ }
  var navigation = root.performance && root.performance.getEntriesByType('navigation')[0];
  var target = api.homeRedirect(root.location.href, saved, root.navigator.languages,
    root.navigator.language, navigation && navigation.type);
  if (target) root.location.replace(target);

  function init() {
    var aliases = { 'en-hero-title': 'hero-title', 'en-expertise': 'services',
      'en-expertise-title': 'services', 'en-process': 'process', 'en-process-title': 'process',
      'en-work': 'proof', 'en-work-title': 'proof', 'en-products': 'products',
      'en-products-title': 'products', 'en-founder': 'about', 'en-founder-title': 'about',
      'en-contact': 'start', 'en-contact-title': 'start' };
    var oldId = root.location.hash.slice(1);
    if (aliases[oldId] && doc.getElementById(aliases[oldId])) {
      var u = new URL(root.location.href); u.hash = aliases[oldId];
      root.history.replaceState(null, '', u.href);
      doc.getElementById(aliases[oldId]).scrollIntoView();
    }
    doc.querySelectorAll('[data-language]').forEach(function (a) {
      // Keep real links usable without JavaScript and with blocked storage.
      var base = a.href;
      a.href = api.switchURL(base, root.location.href);
      a.addEventListener('click', function () {
        var lang = a.getAttribute('data-language');
        try { root.localStorage.setItem(key, lang); } catch (_) { /* URL stays authoritative. */ }
        var hash = root.location.hash;
        if (!hash && root.scrollY > 160) {
          var header = doc.querySelector('.top');
          var line = (header ? header.getBoundingClientRect().bottom : 0) + 100;
          var candidates = doc.querySelectorAll('main section[id], main h2[id], main h3[id], main article[id], .slide.active[id]');
          var closest;
          candidates.forEach(function (el) {
            if (el.getBoundingClientRect().top <= line) closest = el;
          });
          if (closest) hash = '#' + closest.id;
        }
        a.href = api.switchURL(base, root.location.href, hash);
      });
    });
    doc.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
    var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduce && reduce.matches) doc.querySelectorAll('video[data-motion]').forEach(function (v) {
      v.removeAttribute('autoplay'); v.autoplay = false; v.pause();
    });
    var path = root.location.pathname;
    doc.querySelectorAll('.top .main-nav a[href]').forEach(function (a) {
      var url = new URL(a.href);
      if (!url.hash && url.pathname !== '/' && url.pathname !== '/en/' && path.indexOf(url.pathname) === 0)
        a.setAttribute('aria-current', 'page');
    });
    var targets = Array.prototype.slice.call(doc.querySelectorAll('[data-ink], [data-reveal]'));
    if (!('IntersectionObserver' in root)) {
      targets.forEach(function (el) { el.classList.add('is-in'); }); return;
    }
    var io = new root.IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  function preferredLanguage(languages, language) {
    var list = languages && languages.length ? languages : [language || ''];
    for (var i = 0; i < list.length; i++) {
      var primary = String(list[i]).toLowerCase().split(/[-_]/)[0];
      if (primary === 'ko' || primary === 'en') return primary;
    }
    return 'en';
  }
  function homeRedirect(href, saved, languages, language, navigationType) {
    var url = new URL(href);
    if (url.pathname !== '/' && url.pathname !== '/index.html') return null;
    var explicit = url.searchParams.get('lang');
    var chosen = explicit === 'ko' || explicit === 'en' ? explicit :
      (saved === 'ko' || saved === 'en' ? saved : preferredLanguage(languages, language));
    // Never replace a page restored by the Back/Forward buttons.
    if (chosen !== 'en' || navigationType === 'back_forward') return null;
    url.pathname = '/en/'; url.searchParams.delete('lang');
    return url.href;
  }
  function switchURL(counterpart, current, hash) {
    var from = new URL(current), to = new URL(counterpart, from);
    to.search = from.search;
    to.searchParams.delete('lang');
    if (to.pathname === '/' || to.pathname === '/index.html') to.searchParams.set('lang', 'ko');
    to.hash = hash === undefined ? from.hash : hash;
    return to.href;
  }
  return { preferredLanguage: preferredLanguage, homeRedirect: homeRedirect, switchURL: switchURL };
});
