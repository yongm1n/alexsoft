(() => {
  'use strict';

  const body = document.body;
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-nav]');
  const services = nav?.querySelector('[data-nav-services]');
  const servicesSummary = services?.querySelector('summary');
  const mobileLayout = window.matchMedia('(max-width: 760px)');

  if (!toggle || !nav) return;

  const currentPath = window.location.pathname
    .replace(/\/index\.html$/, '')
    .replace(/\/+$/, '');
  const normalizedPath = currentPath ? `${currentPath}/` : '/';
  nav.querySelectorAll('[data-nav-path]').forEach((link) => {
    const linkPath = `${link.dataset.navPath.replace(/\/+$/, '')}/`;
    const isCurrent = normalizedPath === linkPath;
    if (isCurrent) {
      link.setAttribute('aria-current', 'page');
      services?.classList.add('is-current');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  function closeServices({ restoreFocus = false } = {}) {
    if (!services?.open) return;
    services.open = false;
    if (restoreFocus) servicesSummary?.focus();
  }

  function closeMenu() {
    body.classList.remove('menu-open');
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '메뉴 열기');
    closeServices();
  }

  toggle.addEventListener('click', () => {
    const opening = !nav.classList.contains('is-open');
    body.classList.toggle('menu-open', opening);
    nav.classList.toggle('is-open', opening);
    toggle.setAttribute('aria-expanded', String(opening));
    toggle.setAttribute('aria-label', opening ? '메뉴 닫기' : '메뉴 열기');
    if (!opening) closeServices();
  });

  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

  document.addEventListener('pointerdown', (event) => {
    if (services?.open && !services.contains(event.target)) closeServices();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (services?.open) closeServices({ restoreFocus: true });
    else if (nav.classList.contains('is-open')) { closeMenu(); toggle.focus(); }
  });

  mobileLayout.addEventListener('change', () => closeMenu());
})();
