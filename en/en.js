(() => {
  'use strict';

  const header = document.querySelector('[data-header]');

  function renderScrollState() {
    header?.classList.toggle('is-scrolled', window.scrollY > 20);
  }

  window.addEventListener('scroll', renderScrollState, { passive: true });
  renderScrollState();

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
