/* Optional, consent-based measurement for the ALEXSOFT company website. */
(function () {
  'use strict';
  var id = 'G-HDBZ615XDF';
  var key = 'alexsoft.analytics-consent.v1';
  var english = document.documentElement.lang.toLowerCase().indexOf('en') === 0;
  var copy = english ? {
    title: 'Website analytics',
    text: 'With your permission, Google Analytics uses cookies to measure visits and contact actions. Data is processed by Google. You can change your choice at any time.',
    accept: 'Allow analytics', reject: 'Decline', settings: 'Analytics settings',
    privacy: 'About Google Analytics privacy', saved: 'Your choice could not be saved. Analytics remains off.'
  } : {
    title: '웹사이트 이용 분석',
    text: '동의하시면 Google Analytics가 쿠키를 사용해 방문과 문의 행동을 측정합니다. 데이터는 Google에서 처리하며, 선택은 언제든 변경할 수 있습니다.',
    accept: '분석 허용', reject: '거부', settings: '분석 설정',
    privacy: 'Google Analytics 개인정보 안내', saved: '선택을 저장하지 못했습니다. 분석은 사용하지 않습니다.'
  };
  var choice;
  try { choice = localStorage.getItem(key); } catch (_) { choice = null; }
  var active = false;
  var banner;

  function cleanLocation() {
    return location.origin + location.pathname;
  }
  function cleanReferrer() {
    try { return document.referrer ? new URL(document.referrer).origin + '/' : ''; }
    catch (_) { return ''; }
  }
  function start() {
    if (active) return;
    active = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, {
      page_location: cleanLocation(), page_referrer: cleanReferrer(),
      allow_google_signals: false, allow_ad_personalization_signals: false
    });
    var tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(tag);
  }
  function event(name, parameters) {
    if (active && window.gtag) window.gtag('event', name, parameters);
  }
  function save(value) {
    try { localStorage.setItem(key, value); }
    catch (_) { banner.querySelector('[data-status]').textContent = copy.saved; return; }
    var wasActive = active;
    choice = value;
    banner.remove(); banner = null;
    if (value === 'allow') start();
    else {
      ['_ga', '_ga_' + id.slice(2)].forEach(function (name) {
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
        document.cookie = name + '=; Max-Age=0; path=/; domain=.alexsoft.co.kr; SameSite=Lax';
      });
      if (wasActive) location.reload();
    }
  }
  function show() {
    if (banner) return;
    banner = document.createElement('section');
    banner.className = 'analytics-choice';
    banner.setAttribute('aria-label', copy.title);
    var title = document.createElement('strong'); title.textContent = copy.title;
    var text = document.createElement('p'); text.textContent = copy.text;
    var link = document.createElement('a'); link.href = 'https://support.google.com/analytics/answer/6004245';
    link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = copy.privacy;
    var buttons = document.createElement('div'); buttons.className = 'analytics-choice-actions';
    var allow = document.createElement('button'); allow.type = 'button'; allow.textContent = copy.accept;
    var deny = document.createElement('button'); deny.type = 'button'; deny.textContent = copy.reject;
    var status = document.createElement('p'); status.setAttribute('data-status', ''); status.setAttribute('role', 'status');
    allow.addEventListener('click', function () { save('allow'); });
    deny.addEventListener('click', function () { save('deny'); });
    buttons.append(allow, deny); banner.append(title, text, link, buttons, status); document.body.appendChild(banner);
  }
  function init() {
    var style = document.createElement('style');
    style.textContent = '.analytics-choice{position:fixed;z-index:2147483000;bottom:16px;left:16px;right:16px;max-width:520px;padding:20px;background:#fff;color:#20242a;border:1px solid #b9c1cb;box-shadow:0 8px 32px #0003;font:15px/1.5 system-ui,sans-serif}.analytics-choice strong{font-size:17px}.analytics-choice p{margin:8px 0}.analytics-choice a{text-decoration:underline;color:#2147a7}.analytics-choice-actions{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}.analytics-choice button{font:inherit;cursor:pointer;padding:9px 15px;border:1px solid #2147a7;background:#2147a7;color:white}.analytics-choice button+button{background:white;color:#2147a7}.analytics-settings{font:inherit;color:inherit;background:none;border:0;text-decoration:underline;cursor:pointer;padding:4px 0}.analytics-choice button:focus-visible,.analytics-settings:focus-visible{outline:3px solid #f0a000;outline-offset:2px}';
    document.head.appendChild(style);
    var footer = document.querySelector('footer.site .shell') || document.querySelector('footer') || document.querySelector('.topbar');
    if (footer) {
      var settings = document.createElement('button'); settings.type = 'button'; settings.className = 'analytics-settings';
      settings.textContent = copy.settings; settings.addEventListener('click', show); footer.appendChild(settings);
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (/^mailto:/i.test(href)) event('contact_click', { contact_method: 'email' });
      else if (/^tel:/i.test(href)) event('contact_click', { contact_method: 'phone' });
    });
    document.addEventListener('submit', function (e) {
      if (!e.defaultPrevented && e.target.matches('[data-inquiry-form]')) event('inquiry_submit_attempt', {});
    });
    if (choice === 'allow') start(); else if (choice !== 'deny') show();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
