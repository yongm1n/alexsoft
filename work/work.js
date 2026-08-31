(() => {
  'use strict';

  const header = document.querySelector('[data-header]');
  const progress = document.querySelector('.scroll-progress span');

  function renderScrollState() {
    const distance = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = Math.min(1, Math.max(0, window.scrollY / distance));
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    header?.classList.toggle('is-scrolled', window.scrollY > 20);
  }

  window.addEventListener('scroll', renderScrollState, { passive: true });

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
  renderScrollState();
})();
