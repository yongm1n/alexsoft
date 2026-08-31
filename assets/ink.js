/* ALEXSOFT ink.js — 공용 스크립트. 페이지별 훅 없음, 요소가 없어도 죽지 않는다. */
(function () {
  'use strict';

  // 연도
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  // 현재 페이지 표시 (헤더 내비, 루트 절대경로 기준)
  var path = location.pathname;
  document.querySelectorAll('.top nav a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href && href.indexOf('#') === -1 && href !== '/' && path.indexOf(href) === 0) {
      a.setAttribute('aria-current', 'page');
    }
  });

  // 잉크 선 그리기 + 리빌
  var targets = [].concat(
    Array.prototype.slice.call(document.querySelectorAll('[data-ink]')),
    Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'))
  );
  if (!targets.length) return;
  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });
  targets.forEach(function (el) { io.observe(el); });
})();
