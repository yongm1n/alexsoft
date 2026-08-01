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
  const submitButton = form?.querySelector('[type="submit"]');
  const submitLabel = submitButton?.querySelector('span');
  const honeypot = form?.querySelector('[data-form-honeypot]');
  const responseFrame = document.querySelector('[data-google-form-target]');
  const defaultSubmitLabel = submitLabel?.textContent || '문의 신청';
  let submissionPending = false;
  let submissionTimer;

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

  function setSubmissionState(state, message) {
    if (formStatus) {
      formStatus.dataset.state = state;
      formStatus.textContent = message;
    }
  }

  function finishSubmission() {
    if (!submissionPending) return;
    submissionPending = false;
    window.clearTimeout(submissionTimer);
    form?.removeAttribute('aria-busy');
    form?.reset();
    if (submitButton) submitButton.disabled = false;
    if (submitLabel) submitLabel.textContent = '신청이 접수되었습니다';
    setSubmissionState('success', '접수가 완료되었습니다. 내용을 확인한 뒤 alexsoft.kr@gmail.com에서 회신드리겠습니다.');
    window.setTimeout(() => {
      if (submitLabel) submitLabel.textContent = defaultSubmitLabel;
    }, 2600);
  }

  responseFrame?.addEventListener('load', finishSubmission);

  form?.addEventListener('submit', (event) => {
    if (!form.reportValidity()) {
      event.preventDefault();
      return;
    }

    if (honeypot?.value) {
      event.preventDefault();
      form.reset();
      return;
    }

    submissionPending = true;
    form.setAttribute('aria-busy', 'true');
    if (submitButton) submitButton.disabled = true;
    if (submitLabel) submitLabel.textContent = '안전하게 전송 중입니다';
    setSubmissionState('sending', '문의 내용을 전송하고 있습니다. 잠시만 기다려주세요.');

    window.clearTimeout(submissionTimer);
    submissionTimer = window.setTimeout(() => {
      if (!submissionPending) return;
      submissionPending = false;
      form.removeAttribute('aria-busy');
      if (submitButton) submitButton.disabled = false;
      if (submitLabel) submitLabel.textContent = defaultSubmitLabel;
      setSubmissionState('error', '전송 확인이 지연되고 있습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.');
    }, 15000);
  });

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
  renderScrollState();
})();
