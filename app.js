(() => {
  'use strict';

  const doc = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileLayout = window.matchMedia('(max-width: 760px)');
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const map = (value, inMin, inMax, outMin = 0, outMax = 1) => {
    const progress = clamp((value - inMin) / (inMax - inMin));
    return outMin + (outMax - outMin) * progress;
  };
  const mix = (from, to, value) => Math.round(from + (to - from) * value);

  const header = document.querySelector('[data-header]');
  const progressBar = document.querySelector('.scroll-progress span');
  const editorialHero = document.querySelector('[data-hero]');
  const editorialHeroVideo = editorialHero?.querySelector('[data-hero-video]');
  const heroSection = document.querySelector('[data-scrub="hero"]');
  const heroStage = heroSection?.querySelector('.hero-stage');
  const heroImage = heroSection?.querySelector('.hero-media img');
  const heroContent = heroSection?.querySelector('.hero-content');
  const heroLede = heroSection?.querySelector('.hero-lede');
  const heroCta = heroSection?.querySelector('.hero-cta');
  const heroIndex = [...(heroSection?.querySelectorAll('.hero-index div') || [])];
  const manifestoSection = document.querySelector('[data-scrub="manifesto"]');
  const manifestoStage = manifestoSection?.querySelector('.manifesto-stage');
  const manifestoGiant = manifestoSection?.querySelector('.manifesto-giant');
  const manifestoCopy = manifestoSection?.querySelector('.manifesto-copy');
  const manifestoOrbits = [...(manifestoSection?.querySelectorAll('.manifesto-orbit') || [])];
  const craftSection = document.querySelector('[data-scrub="craft"]');
  const craftSphere = craftSection?.querySelector('.craft-sphere');
  const craftSteps = [...(craftSection?.querySelectorAll('[data-step]') || [])];
  const craftNumber = craftSection?.querySelector('[data-craft-number]');
  const craftCurrent = craftSection?.querySelector('[data-craft-current]');
  const craftAxisPoint = craftSection?.querySelector('.craft-axis span');
  const workSection = document.querySelector('[data-scrub="work"]');
  const workTrack = workSection?.querySelector('.work-track');
  const workProgress = workSection?.querySelector('[data-work-progress]');
  const contact = document.querySelector('.contact');

  const measurements = new Map();
  let scrollY = window.scrollY;
  let ticking = false;
  let workDistance = 0;

  function syncEditorialHeroVideo() {
    if (!editorialHeroVideo) return;
    if (reduceMotion.matches) {
      editorialHeroVideo.pause();
      editorialHeroVideo.classList.remove('is-ready');
      return;
    }
    const source = editorialHeroVideo.querySelector('source[data-src]');
    if (source && !source.src) {
      source.src = source.dataset.src;
      editorialHeroVideo.load();
    }
    editorialHeroVideo.muted = true;
    editorialHeroVideo.play().catch(() => {
      editorialHeroVideo.classList.remove('is-ready');
    });
  }

  editorialHeroVideo?.addEventListener('playing', () => {
    editorialHeroVideo.classList.add('is-ready');
  });
  syncEditorialHeroVideo();

  function measureSections() {
    document.querySelectorAll('[data-scrub]').forEach((section) => {
      const rect = section.getBoundingClientRect();
      const start = rect.top + window.scrollY;
      const stage = section.querySelector('.hero-stage, .manifesto-stage, .craft-stage, .work-stage');
      const stageHeight = stage?.offsetHeight || window.innerHeight;
      const distance = Math.max(1, section.offsetHeight - stageHeight);
      measurements.set(section, { start, distance });
    });
    if (workTrack) {
      workDistance = Math.max(0, workTrack.scrollWidth - window.innerWidth + window.innerWidth * 0.045);
    }
    field.resize();
    requestRender();
  }

  function sectionProgress(section) {
    const metrics = measurements.get(section);
    if (!metrics) return 0;
    return clamp((scrollY - metrics.start) / metrics.distance);
  }

  function renderHero(progress) {
    if (!heroStage || reduceMotion.matches) return;
    const exit = clamp((progress - .42) / .42);
    const drift = progress * -42;
    heroImage.style.transform = `translate3d(${progress * 1.8}%, ${drift * .14}px, 0) scale(${1.03 + progress * .2})`;
    heroImage.style.filter = `saturate(${1 - progress * .22}) brightness(${1 - progress * .22})`;
    heroContent.style.transform = `translate3d(0, ${drift}px, 0)`;
    heroContent.style.opacity = String(1 - exit);
    heroLede.style.transform = `translate3d(0, ${progress * -18}px, 0)`;
    heroCta.style.opacity = String(1 - clamp((progress - .28) / .24));
    heroIndex.forEach((item, index) => item.classList.toggle('is-active', index === Math.min(3, Math.floor(progress * 4))));
    field.draw(progress);
  }

  function renderEditorialHero() {
    if (!editorialHero) return;
    const heroStart = editorialHero.offsetTop;
    const heroDistance = Math.max(1, editorialHero.offsetHeight);
    const progress = clamp((scrollY - heroStart) / heroDistance);
    editorialHero.style.setProperty('--hero-p', reduceMotion.matches ? '0' : progress.toFixed(4));
  }

  function renderManifesto(progress) {
    if (!manifestoStage || reduceMotion.matches) return;
    const lighten = map(progress, .48, .74);
    const bg = [mix(8, 241, lighten), mix(8, 240, lighten), mix(9, 236, lighten)];
    const fg = [mix(246, 5, lighten), mix(245, 5, lighten), mix(240, 5, lighten)];
    manifestoStage.style.backgroundColor = `rgb(${bg.join(',')})`;
    manifestoStage.style.color = `rgb(${fg.join(',')})`;
    const giantScale = .86 + map(progress, 0, .58) * .3;
    const giantY = map(progress, 0, .6, 7, -7);
    const giantFade = 1 - map(progress, .57, .73);
    manifestoGiant.style.transform = `translate3d(${map(progress, 0, .62, 8, -8)}vw, ${giantY}vh, 0) scale(${giantScale})`;
    manifestoGiant.style.opacity = String(giantFade);
    manifestoGiant.style.webkitTextStrokeColor = `rgba(${mix(255, 0, lighten)},${mix(255, 0, lighten)},${mix(255, 0, lighten)},.25)`;
    const copyIn = map(progress, .65, .82);
    manifestoCopy.style.opacity = String(copyIn);
    manifestoCopy.style.transform = `translate3d(0, ${(1 - copyIn) * 38}px, 0)`;
    manifestoOrbits.forEach((orbit, index) => {
      orbit.style.opacity = String(map(progress, .56 + index * .03, .82) * .9);
      orbit.style.transform = `scale(${.7 + progress * .5}) rotate(${progress * (index ? -38 : 46)}deg)`;
    });
  }

  function renderCraft(progress) {
    if (!craftSection) return;
    if (reduceMotion.matches) {
      craftSteps.forEach((step) => {
        step.style.removeProperty('opacity');
        step.style.removeProperty('transform');
        step.style.removeProperty('pointer-events');
      });
      return;
    }
    const lastStep = Math.max(0, craftSteps.length - 1);
    const segmentPosition = Math.min(craftSteps.length - .001, progress * craftSteps.length);
    const currentStep = Math.min(lastStep, Math.floor(segmentPosition));
    const segmentProgress = segmentPosition - currentStep;
    const transitionProgress = currentStep < lastStep ? map(segmentProgress, .78, 1) : 0;
    const desktopStep = Math.min(lastStep, Math.floor(progress * craftSteps.length));
    const mobileStep = Math.min(lastStep, currentStep + (transitionProgress >= .5 ? 1 : 0));
    const stepIndex = mobileLayout.matches ? mobileStep : desktopStep;
    craftSteps.forEach((step, index) => {
      step.classList.toggle('is-active', index === stepIndex);
      if (mobileLayout.matches) {
        let opacity = 0;
        let offset = index < currentStep ? -28 : 28;
        if (index === currentStep) {
          opacity = 1 - transitionProgress;
          offset = transitionProgress * -28;
        } else if (index === currentStep + 1) {
          opacity = transitionProgress;
          offset = (1 - transitionProgress) * 28;
        }
        step.style.opacity = opacity.toFixed(3);
        step.style.transform = `translate3d(0, calc(-50% + ${offset}px), 0)`;
        step.style.pointerEvents = opacity > .6 ? 'auto' : 'none';
      } else {
        step.style.removeProperty('opacity');
        step.style.removeProperty('transform');
        step.style.removeProperty('pointer-events');
      }
    });
    const count = String(stepIndex + 1).padStart(2, '0');
    if (craftNumber) craftNumber.textContent = count;
    if (craftCurrent) craftCurrent.textContent = count;
    if (craftAxisPoint) craftAxisPoint.style.top = `${8 + progress * 84}%`;
    if (craftSphere) {
      const pulse = Math.sin(progress * Math.PI * 8) * .018;
      const rotation = mobileLayout.matches ? 300 : 190;
      const tilt = mobileLayout.matches ? 52 : 38;
      craftSphere.style.transform = `rotate(${progress * rotation}deg) rotateX(${progress * tilt}deg) scale(${1 + pulse})`;
      const rings = craftSphere.querySelectorAll('.sphere-ring');
      const ringBoost = mobileLayout.matches ? 1.45 : 1;
      rings[0].style.transform = `rotateX(67deg) rotateZ(${progress * 280 * ringBoost}deg)`;
      rings[1].style.transform = `rotateY(67deg) rotateZ(${progress * -220 * ringBoost}deg)`;
      rings[2].style.transform = `rotateX(63deg) rotateZ(${38 + progress * 310 * ringBoost}deg)`;
    }
  }

  function renderWork(progress) {
    if (!workTrack || mobileLayout.matches || reduceMotion.matches) return;
    const eased = progress < .5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    workTrack.style.transform = `translate3d(${-workDistance * eased}px, 0, 0)`;
    if (workProgress) workProgress.style.transform = `scaleX(${progress})`;
  }

  function render() {
    ticking = false;
    const pageDistance = Math.max(1, doc.scrollHeight - window.innerHeight);
    progressBar.style.transform = `scaleX(${clamp(scrollY / pageDistance)})`;
    renderEditorialHero();
    renderHero(sectionProgress(heroSection));
    renderManifesto(sectionProgress(manifestoSection));
    renderCraft(sectionProgress(craftSection));
    renderWork(sectionProgress(workSection));
  }

  function requestRender() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(render);
  }

  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    requestRender();
  }, { passive: true });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measureSections, 120);
  });

  const menuToggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-nav]');
  function closeMenu() {
    body.classList.remove('menu-open');
    menu?.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', '메뉴 열기');
  }
  menuToggle?.addEventListener('click', () => {
    const opening = !menu.classList.contains('is-open');
    body.classList.toggle('menu-open', opening);
    menu.classList.toggle('is-open', opening);
    menuToggle.setAttribute('aria-expanded', String(opening));
    menuToggle.setAttribute('aria-label', opening ? '메뉴 닫기' : '메뉴 열기');
  });
  menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .16, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach((element, index) => {
    element.style.transitionDelay = `${(index % 4) * 70}ms`;
    revealObserver.observe(element);
  });

  document.querySelectorAll('.tilt-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      if (mobileLayout.matches || reduceMotion.matches || event.pointerType === 'touch') return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.setProperty('--ry', `${x * 1.8}deg`);
      card.style.setProperty('--rx', `${y * -1.6}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--ry', '0deg');
      card.style.setProperty('--rx', '0deg');
    });
  });

  heroStage?.addEventListener('pointermove', (event) => {
    const rect = heroStage.getBoundingClientRect();
    heroStage.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
    heroStage.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    field.pointer.x = (event.clientX - rect.left) / rect.width;
    field.pointer.y = (event.clientY - rect.top) / rect.height;
    requestRender();
  });

  editorialHero?.addEventListener('pointermove', (event) => {
    if (reduceMotion.matches || event.pointerType === 'touch') return;
    const rect = editorialHero.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - .5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - .5) * 2;
    editorialHero.style.setProperty('--mx', x.toFixed(3));
    editorialHero.style.setProperty('--my', y.toFixed(3));
  });
  editorialHero?.addEventListener('pointerleave', () => {
    editorialHero.style.setProperty('--mx', '0');
    editorialHero.style.setProperty('--my', '0');
  });

  contact?.addEventListener('pointermove', (event) => {
    if (mobileLayout.matches || reduceMotion.matches) return;
    const rect = contact.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) * .09;
    const y = (event.clientY - rect.top - rect.height / 2) * .09;
    contact.style.setProperty('--contact-x', `${x}px`);
    contact.style.setProperty('--contact-y', `${y}px`);
  });

  const field = (() => {
    const canvas = document.querySelector('#intelligence-field');
    const context = canvas?.getContext('2d');
    const pointer = { x: .68, y: .48 };
    let width = 0;
    let height = 0;
    let ratio = 1;
    let seed = 6417;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const points = Array.from({ length: 34 }, () => ({
      x: .34 + random() * .65,
      y: .08 + random() * .84,
      radius: .55 + random() * 1.2,
      phase: random() * Math.PI * 2
    }));

    function resize() {
      if (!canvas || !context || !heroStage) return;
      ratio = Math.min(2, window.devicePixelRatio || 1);
      width = heroStage.clientWidth;
      height = heroStage.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function draw(progress = 0) {
      if (!context || reduceMotion.matches || !width) return;
      context.clearRect(0, 0, width, height);
      const positions = points.map((point) => ({
        ...point,
        px: (point.x + Math.sin(point.phase + progress * 4) * .018 + (pointer.x - .5) * .008) * width,
        py: (point.y + Math.cos(point.phase + progress * 3) * .014 + (pointer.y - .5) * .008) * height
      }));
      for (let i = 0; i < positions.length; i += 1) {
        for (let j = i + 1; j < positions.length; j += 1) {
          const a = positions[i];
          const b = positions[j];
          const distance = Math.hypot(a.px - b.px, a.py - b.py);
          const threshold = Math.min(width, height) * .19;
          if (distance > threshold) continue;
          context.beginPath();
          context.moveTo(a.px, a.py);
          context.lineTo(b.px, b.py);
          context.strokeStyle = `rgba(121,157,255,${(1 - distance / threshold) * .16})`;
          context.lineWidth = .65;
          context.stroke();
        }
      }
      positions.forEach((point) => {
        context.beginPath();
        context.arc(point.px, point.py, point.radius, 0, Math.PI * 2);
        context.fillStyle = 'rgba(193,210,255,.66)';
        context.fill();
      });
    }
    return { resize, draw, pointer };
  })();

  document.querySelector('[data-year]').textContent = new Date().getFullYear();
  reduceMotion.addEventListener?.('change', () => {
    syncEditorialHeroVideo();
    measureSections();
  });
  mobileLayout.addEventListener?.('change', measureSections);
  window.addEventListener('load', measureSections, { once: true });
  measureSections();
})();
