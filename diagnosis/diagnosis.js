(() => {
  'use strict';

  const body = document.body;
  const header = document.querySelector('[data-header]');
  const progress = document.querySelector('.scroll-progress span');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-nav]');
  const form = document.querySelector('[data-inquiry-form]');
  const formStatus = document.querySelector('[data-form-status]');
  const serviceSelect = document.querySelector('[data-service-select]');

  function closeMenu() {
    body.classList.remove('menu-open');
    menu?.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', '메뉴 열기');
  }

  function renderScrollState() {
    const distance = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = Math.min(1, Math.max(0, window.scrollY / distance));
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    header?.classList.toggle('is-scrolled', window.scrollY > 20);
  }

  menuToggle?.addEventListener('click', () => {
    const opening = !menu?.classList.contains('is-open');
    body.classList.toggle('menu-open', opening);
    menu?.classList.toggle('is-open', opening);
    menuToggle.setAttribute('aria-expanded', String(opening));
    menuToggle.setAttribute('aria-label', opening ? '메뉴 닫기' : '메뉴 열기');
  });

  menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.querySelectorAll('[data-inquiry-type]').forEach((link) => {
    link.addEventListener('click', () => {
      if (serviceSelect) serviceSelect.value = link.dataset.inquiryType;
    });
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
  window.addEventListener('scroll', renderScrollState, { passive: true });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const values = Object.fromEntries(new FormData(form).entries());
    const subjectCompany = values.company ? ` — ${values.company}` : '';
    const subject = `ALEXSOFT ${values.service || '업무 상담'} 문의${subjectCompany}`;
    const message = [
      'ALEXSOFT에 업무 상담을 문의합니다.',
      '',
      `[관심 서비스] ${values.service || '미입력'}`,
      `[회사·조직명] ${values.company || '미입력'}`,
      `[담당자명] ${values.name}`,
      `[회신 이메일] ${values.email}`,
      `[희망 시기] ${values.timing || '미정'}`,
      `[현재 사용하는 도구] ${values.tools || '미입력'}`,
      '',
      '[현재 가장 해결하고 싶은 문제]',
      values.problem
    ].join('\n');

    if (formStatus) formStatus.textContent = '메일 앱을 여는 중입니다. 열리지 않으면 alexsoft.kr@gmail.com으로 보내주세요.';
    window.location.href = `mailto:alexsoft.kr@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  });

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
  renderScrollState();
})();
