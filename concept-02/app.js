(() => {
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector('[data-header]');
  const progress = document.querySelector('.page-progress i');
  const hero = document.querySelector('[data-hero]');
  const heroMedia = hero?.querySelector('.hero-media');
  const philosophy = document.querySelector('[data-philosophy]');
  const stackCards = [...document.querySelectorAll('[data-stack-card]')];
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-nav]');
  const serviceItems = [...document.querySelectorAll('.service-item')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canUseGSAP = Boolean(window.gsap && window.ScrollTrigger && !reducedMotion.matches);

  const closeMenu = () => {
    body.classList.remove('menu-open');
    nav?.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', '메뉴 열기');
  };

  menuToggle?.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    if (isOpen) {
      closeMenu();
      return;
    }
    body.classList.add('menu-open');
    nav?.classList.add('is-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', '메뉴 닫기');
  });

  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  serviceItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      serviceItems.forEach((other) => {
        if (other !== item) other.open = false;
      });

      if (canUseGSAP) {
        const panel = item.querySelector(':scope > div');
        window.gsap.fromTo(panel,
          { opacity: 0, y: -12 },
          { opacity: 1, y: 0, duration: .42, ease: 'power3.out', overwrite: true, clearProps: 'transform' });
      }
    });
  });

  document.querySelectorAll('[data-year]').forEach((element) => {
    element.textContent = new Date().getFullYear();
  });

  const initGSAPMotion = () => {
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    gsap.config({ nullTargetWarn: false });
    ScrollTrigger.config({ limitCallbacks: true });
    root.classList.add('has-gsap');

    gsap.from(header, { y: -86, opacity: 0, duration: .78, ease: 'power4.out' });

    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        gsap.set(progress, { scaleX: self.progress, transformOrigin: 'left center' });
        header?.classList.toggle('is-scrolled', self.scroll() > 24);

        if (!header || body.classList.contains('menu-open')) return;
        if (window.innerWidth <= 760) {
          gsap.to(header, { y: 0, duration: .28, ease: 'power3.out', overwrite: true });
          return;
        }
        if (self.scroll() < 180 || self.direction < 0) {
          gsap.to(header, { y: 0, duration: .4, ease: 'power3.out', overwrite: true });
        } else if (self.direction > 0) {
          gsap.to(header, { y: -78, duration: .38, ease: 'power3.inOut', overwrite: true });
        }
      }
    });

    const standardReveals = gsap.utils.toArray('.reveal:not([data-gsap-heading])');
    gsap.set(standardReveals, { opacity: 0, y: 32 });
    ScrollTrigger.batch(standardReveals, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) => gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: .74,
        stagger: .08,
        ease: 'power3.out',
        overwrite: true,
        clearProps: 'transform'
      })
    });

    gsap.utils.toArray('[data-gsap-heading]').forEach((heading) => {
      gsap.fromTo(heading,
        { opacity: 0, y: 52, clipPath: 'inset(0 0 100% 0)' },
        {
          opacity: 1,
          y: 0,
          clipPath: 'inset(0 0 0% 0)',
          duration: .95,
          ease: 'power4.out',
          scrollTrigger: { trigger: heading, start: 'top 86%', once: true },
          clearProps: 'transform,clipPath'
        });
    });

    const mm = gsap.matchMedia();

    mm.add('(min-width: 761px)', () => {
      const heroLines = gsap.utils.toArray('.hero-title-text');
      const heroIntro = gsap.timeline({ defaults: { ease: 'power4.out' } });
      heroIntro
        .from('.kicker', { y: 18, opacity: 0, duration: .62 })
        .from(heroLines, { yPercent: 112, opacity: 0, duration: .9, stagger: .085 }, '-=.32')
        .from('.hero-lede', { y: 24, opacity: 0, duration: .68 }, '-=.52')
        .from('.hero-actions > *', { y: 18, opacity: 0, duration: .62, stagger: .08 }, '-=.46')
        .from('.hero-caption', { x: 24, opacity: 0, duration: .64 }, '-=.55')
        .from('.hero-rail > *', { opacity: 0, duration: .46, stagger: .06 }, '-=.45');

      const heroScroll = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: '+=85%',
          pin: true,
          scrub: .8,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });
      heroScroll
        .to(heroMedia, { scale: 1.11, yPercent: -3.5 }, 0)
        .to('.hero-copy', { xPercent: -4, opacity: .18 }, 0)
        .to(heroLines, { yPercent: -12, stagger: .025 }, 0)
        .to('.hero-caption', { y: -62, opacity: 0 }, 0)
        .to('.hero-grid', { xPercent: -3.5, opacity: .07 }, 0)
        .to('.hero-rail', { '--rail-p': 1 }, 0);

      const moveX = gsap.quickTo(heroMedia, 'x', { duration: .42, ease: 'power3.out' });
      const moveY = gsap.quickTo(heroMedia, 'y', { duration: .42, ease: 'power3.out' });
      const onHeroMove = (event) => {
        if (event.pointerType === 'touch') return;
        const rect = hero.getBoundingClientRect();
        moveX(((event.clientX - rect.left) / rect.width - .5) * 14);
        moveY(((event.clientY - rect.top) / rect.height - .5) * 10);
      };
      const onHeroLeave = () => { moveX(0); moveY(0); };
      hero.addEventListener('pointermove', onHeroMove);
      hero.addEventListener('pointerleave', onHeroLeave);

      stackCards.forEach((card, index) => {
        const nextCard = stackCards[index + 1];
        const infoItems = card.querySelectorAll('.project-info > *');
        const visual = card.querySelector('.project-visual');

        gsap.from(infoItems, {
          opacity: 0,
          y: 34,
          duration: .78,
          stagger: .07,
          ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 74%', toggleActions: 'play none none reverse' }
        });
        gsap.from(visual, {
          clipPath: 'inset(0 0 0 100%)',
          duration: 1.05,
          ease: 'power4.out',
          scrollTrigger: { trigger: card, start: 'top 76%', toggleActions: 'play none none reverse' },
          clearProps: 'clipPath'
        });

        if (nextCard) {
          gsap.to(card, {
            scale: .955,
            y: -7,
            filter: 'brightness(.77)',
            ease: 'none',
            scrollTrigger: {
              trigger: nextCard,
              start: 'top 94%',
              end: 'top 104px',
              scrub: .55
            }
          });
        }
      });

      gsap.from('.map-paths path', {
        opacity: 0,
        strokeDashoffset: 100,
        duration: 1.15,
        stagger: .11,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.project-cascade', start: 'top 58%', toggleActions: 'play none none reverse' }
      });
      gsap.from('.map-nodes circle', {
        scale: 0,
        transformOrigin: 'center',
        duration: .58,
        stagger: .075,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.project-cascade', start: 'top 56%', toggleActions: 'play none none reverse' }
      });
      gsap.from('.goal-summary > div, .goal-list p', {
        opacity: 0,
        y: 24,
        duration: .66,
        stagger: .07,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.project-goal', start: 'top 55%', toggleActions: 'play none none reverse' }
      });
      gsap.fromTo('.grace-browser img', { scale: 1.11 }, {
        scale: 1.025,
        ease: 'none',
        scrollTrigger: { trigger: '.project-grace', start: 'top bottom', end: 'bottom top', scrub: .8 }
      });
      gsap.from('.care-grid > div', {
        opacity: 0,
        y: 26,
        duration: .68,
        stagger: .08,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.project-care', start: 'top 55%', toggleActions: 'play none none reverse' }
      });

      const philosophyPath = philosophy.querySelector('[data-draw-line]');
      gsap.set(philosophyPath, { strokeDasharray: 2200, strokeDashoffset: 2200 });
      const philosophyTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: philosophy,
          start: 'top top',
          end: '+=75%',
          pin: true,
          scrub: .8,
          anticipatePin: 1
        }
      });
      philosophyTimeline
        .from('.philosophy .section-index', { opacity: .48, y: 18, duration: .26 }, 0)
        .from('.philosophy h2', { opacity: .42, y: 42, scale: .985, duration: .34, transformOrigin: 'left center' }, 0)
        .to(philosophyPath, { strokeDashoffset: 0, ease: 'none' }, 0)
        .from('.philosophy-copy', { opacity: 0, y: 36 }, .28);

      gsap.utils.toArray('.magnetic').forEach((element) => {
        const xTo = gsap.quickTo(element, 'x', { duration: .34, ease: 'power3.out' });
        const yTo = gsap.quickTo(element, 'y', { duration: .34, ease: 'power3.out' });
        const onMove = (event) => {
          const rect = element.getBoundingClientRect();
          xTo((event.clientX - rect.left - rect.width / 2) * .12);
          yTo((event.clientY - rect.top - rect.height / 2) * .16);
        };
        const onLeave = () => { xTo(0); yTo(0); };
        element.addEventListener('pointermove', onMove);
        element.addEventListener('pointerleave', onLeave);
      });

      return () => {
        hero.removeEventListener('pointermove', onHeroMove);
        hero.removeEventListener('pointerleave', onHeroLeave);
      };
    });

    mm.add('(max-width: 760px)', () => {
      gsap.from('.hero-title-text', { opacity: 0, y: 36, duration: .78, stagger: .08, ease: 'power3.out' });
      gsap.from('.hero-lede, .hero-actions > *', { opacity: 0, y: 22, duration: .68, stagger: .09, ease: 'power3.out', delay: .24 });
      stackCards.forEach((card) => {
        gsap.from(card, {
          opacity: 0,
          y: 38,
          duration: .78,
          ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 88%', once: true }
        });
      });
      gsap.fromTo('[data-draw-line]', { strokeDasharray: 2200, strokeDashoffset: 2200 }, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: { trigger: philosophy, start: 'top 85%', end: 'bottom 25%', scrub: .65 }
      });
    });

    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  };

  const initFallbackMotion = () => {
    let frame = 0;

    const render = () => {
      frame = 0;
      const scrollY = window.scrollY;
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.style.transform = `scaleX(${scrollY / scrollable})`;
      header?.classList.toggle('is-scrolled', scrollY > 24);

      if (!reducedMotion.matches && hero) {
        root.style.setProperty('--hero-p', clamp(scrollY / Math.max(1, hero.offsetHeight * .72)).toFixed(4));
      }

      if (!reducedMotion.matches && philosophy) {
        const rect = philosophy.getBoundingClientRect();
        const distance = philosophy.offsetHeight + window.innerHeight;
        philosophy.style.setProperty('--line-p', clamp((window.innerHeight - rect.top) / distance).toFixed(4));
      }

      if (!reducedMotion.matches && window.innerWidth > 760) {
        stackCards.forEach((card, index) => {
          const nextCard = stackCards[index + 1];
          if (!nextCard) return card.style.setProperty('--stack-p', '0');
          const nextTop = nextCard.getBoundingClientRect().top;
          const start = window.innerHeight * .94;
          card.style.setProperty('--stack-p', clamp((start - nextTop) / (start - 120)).toFixed(4));
        });
      }
    };

    const requestRender = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };
    window.addEventListener('scroll', requestRender, { passive: true });
    window.addEventListener('resize', requestRender);

    hero?.addEventListener('pointermove', (event) => {
      if (reducedMotion.matches || event.pointerType === 'touch') return;
      const rect = hero.getBoundingClientRect();
      root.style.setProperty('--mx', (((event.clientX - rect.left) / rect.width - .5) * 2).toFixed(3));
      root.style.setProperty('--my', (((event.clientY - rect.top) / rect.height - .5) * 2).toFixed(3));
    });
    hero?.addEventListener('pointerleave', () => {
      root.style.setProperty('--mx', '0');
      root.style.setProperty('--my', '0');
    });

    if (!reducedMotion.matches) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
      document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
    }

    render();
  };

  if (canUseGSAP) initGSAPMotion();
  else initFallbackMotion();
})();
