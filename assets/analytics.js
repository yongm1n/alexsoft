/* ALEXSOFT website analytics; retain a prior explicit opt-out if one exists. */
(function () {
  'use strict';
  var id = 'G-HDBZ615XDF';
  try {
    if (localStorage.getItem('alexsoft.analytics-consent.v1') === 'deny') return;
  } catch (_) { /* Analytics remains available if browser storage is blocked. */ }

  function cleanReferrer() {
    try { return document.referrer ? new URL(document.referrer).origin + '/' : ''; }
    catch (_) { return ''; }
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id, {
    page_location: location.origin + location.pathname,
    page_referrer: cleanReferrer(),
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
  var tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(tag);

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/^mailto:/i.test(href)) window.gtag('event', 'contact_click', { contact_method: 'email' });
    else if (/^tel:/i.test(href)) window.gtag('event', 'contact_click', { contact_method: 'phone' });
  });
  document.addEventListener('submit', function (e) {
    if (!e.defaultPrevented && e.target.matches('[data-inquiry-form]')) {
      window.gtag('event', 'inquiry_submit_attempt', {});
    }
  });
})();
