(() => {
  'use strict';

  const body = document.body;
  const header = document.querySelector('[data-header]');
  const progress = document.querySelector('.scroll-progress span');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-nav]');
  const hero = document.querySelector('[data-brand-hero]');
  const heroArt = hero?.querySelector('.brand-hero-art');
  const form = document.querySelector('[data-inquiry-form]');
  const formStatus = document.querySelector('[data-form-status]');
  const responseFrame = document.querySelector('[data-google-form-target]');
  const submitButton = form?.querySelector('[type="submit"]');
  const submitLabel = submitButton?.querySelector('span');
  const honeypot = form?.querySelector('[data-form-honeypot]');
  const messageField = form?.querySelector('[data-message]');
  const budgetField = form?.querySelector('[data-budget]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const defaultSubmitLabel = submitLabel?.textContent || '문의 신청';
  let submissionPending = false;
  let submissionTimer;
  let originalMessage = '';

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
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
  window.addEventListener('scroll', renderScrollState, { passive: true });

  if (hero && heroArt && !reduceMotion.matches) {
    let pointerFrame = 0;
    hero.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      window.cancelAnimationFrame(pointerFrame);
      pointerFrame = window.requestAnimationFrame(() => {
        const bounds = hero.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width - .5) * 11;
        const y = ((event.clientY - bounds.top) / bounds.height - .5) * 11;
        heroArt.style.setProperty('--art-x', x.toFixed(2));
        heroArt.style.setProperty('--art-y', y.toFixed(2));
      });
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      heroArt.style.setProperty('--art-x', '0');
      heroArt.style.setProperty('--art-y', '0');
    });
  }

  const revealItems = document.querySelectorAll('[data-reveal]');
  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries, revealObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    revealItems.forEach((item, index) => {
      item.style.transitionDelay = `${(index % 3) * 70}ms`;
      observer.observe(item);
    });
  }

  function setSubmissionState(state, message) {
    if (!formStatus) return;
    formStatus.dataset.state = state;
    formStatus.textContent = message;
  }

  function restoreMessage() {
    if (messageField && originalMessage) messageField.value = originalMessage;
  }

  function finishSubmission() {
    if (!submissionPending) return;
    submissionPending = false;
    window.clearTimeout(submissionTimer);
    form?.removeAttribute('aria-busy');
    form?.reset();
    originalMessage = '';
    if (submitButton) submitButton.disabled = false;
    if (submitLabel) submitLabel.textContent = '문의가 접수되었습니다';
    setSubmissionState('success', '접수가 완료되었습니다. 내용을 확인한 뒤 alexsoft.kr@gmail.com에서 회신드리겠습니다.');
    window.setTimeout(() => { if (submitLabel) submitLabel.textContent = defaultSubmitLabel; }, 2600);
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

    originalMessage = messageField?.value.trim() || '';
    const budget = budgetField?.value || '아직 정하지 못함';
    if (messageField) messageField.value = `${originalMessage}\n\n[문의 서비스] 브랜드 웹사이트\n[예상 예산] ${budget}`;

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
      restoreMessage();
      if (submitButton) submitButton.disabled = false;
      if (submitLabel) submitLabel.textContent = defaultSubmitLabel;
      setSubmissionState('error', '전송 확인이 지연되고 있습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.');
    }, 15000);
  });

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
  renderScrollState();
})();
