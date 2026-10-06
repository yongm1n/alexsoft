/* ALEXSOFT English inquiry form. Shared presentation behavior is in /assets/ink.js. */
(function () {
  'use strict';

  var form = document.querySelector('[data-inquiry-form]');
  if (!form) return;

  var status = document.querySelector('[data-form-status]');
  var serviceSelect = form.querySelector('[data-service-select]');
  var submitButton = form.querySelector('[type="submit"]');
  var submitLabel = (submitButton && submitButton.querySelector('span')) || submitButton;
  var honeypot = form.querySelector('[data-form-honeypot]');
  var responseFrame = document.querySelector('[data-google-form-target]');
  var defaultLabel = submitLabel ? submitLabel.textContent : 'Send inquiry';
  var pending = false;
  var timer;

  // Reflect the stage selected by the page CTA in the form.
  if (serviceSelect) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-inquiry-type]'), function (link) {
      link.addEventListener('click', function () {
        var wanted = link.getAttribute('data-inquiry-type');
        var options = serviceSelect.options;
        for (var i = 0; i < options.length; i++) {
          if (options[i].value === wanted) { serviceSelect.value = wanted; return; }
        }
      });
    });
  }

  function setStatus(state, message) {
    if (!status) return;
    status.setAttribute('data-state', state);
    status.textContent = message;
  }

  function finish() {
    if (!pending) return;
    pending = false;
    window.clearTimeout(timer);
    form.removeAttribute('aria-busy');
    form.reset();
    if (submitButton) submitButton.disabled = false;
    if (submitLabel) submitLabel.textContent = 'Request received';
    setStatus('success', 'Your inquiry has been received. We will review it and reply from contact@alexsoft.co.kr. For urgent inquiries, call +82-10-6548-0292.');
    window.setTimeout(function () {
      if (submitLabel) submitLabel.textContent = defaultLabel;
    }, 2600);
  }

  if (responseFrame) responseFrame.addEventListener('load', finish);

  form.addEventListener('submit', function (event) {
    if (!form.reportValidity()) {
      event.preventDefault();
      return;
    }
    if (honeypot && honeypot.value) {
      event.preventDefault();
      form.reset();
      return;
    }

    pending = true;
    form.setAttribute('aria-busy', 'true');
    if (submitButton) submitButton.disabled = true;
    if (submitLabel) submitLabel.textContent = 'Sending securely';
    setStatus('sending', 'Sending your inquiry. Please wait.');

    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      if (!pending) return;
      pending = false;
      form.removeAttribute('aria-busy');
      if (submitButton) submitButton.disabled = false;
      if (submitLabel) submitLabel.textContent = defaultLabel;
      setStatus('error', 'Confirmation is taking longer than expected. Check your connection and try again, or call +82-10-6548-0292.');
    }, 15000);
  });
})();
