/* ALEXSOFT English inquiry form. Shared presentation behavior is in /assets/ink.js. */
(function () {
  'use strict';

  var form = document.querySelector('[data-inquiry-form]');
  if (!form) return;

  var status = document.querySelector('[data-form-status]');
  var frame = document.querySelector('[data-google-form-target]');
  var button = form.querySelector('[type="submit"]');
  var label = button ? button.querySelector('span') : null;
  var honeypot = form.querySelector('[data-form-honeypot]');
  var defaultLabel = (label && label.textContent) || 'Send inquiry';
  var pending = false;
  var timer;

  function setState(state, message) {
    if (!status) return;
    status.dataset.state = state;
    status.textContent = message;
  }

  function release(labelText) {
    pending = false;
    window.clearTimeout(timer);
    form.removeAttribute('aria-busy');
    if (button) button.disabled = false;
    if (label) label.textContent = labelText;
  }

  if (frame) {
    frame.addEventListener('load', function () {
      if (!pending) return;
      release('Inquiry received');
      form.reset();
      setState('success', 'Your inquiry has been received. We will review it and reply from contact@alexsoft.co.kr. For urgent inquiries, call +82-10-6548-0292.');
      window.setTimeout(function () { if (label) label.textContent = defaultLabel; }, 2600);
    });
  }

  form.addEventListener('submit', function (event) {
    if (!form.reportValidity()) { event.preventDefault(); return; }
    if (honeypot && honeypot.value) { event.preventDefault(); form.reset(); return; }

    pending = true;
    form.setAttribute('aria-busy', 'true');
    if (button) button.disabled = true;
    if (label) label.textContent = 'Sending securely';
    setState('sending', 'Sending your inquiry. Please wait.');

    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      if (!pending) return;
      release(defaultLabel);
      setState('error', 'Confirmation is taking longer than expected. Check your connection and try again, or call +82-10-6548-0292.');
    }, 15000);
  });
})();
