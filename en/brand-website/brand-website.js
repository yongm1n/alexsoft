/* ALEXSOFT English inquiry form. Shared presentation behavior is in /assets/ink.js. */
(function () {
  'use strict';

  var form = document.querySelector('[data-inquiry-form]');
  if (!form) return;

  var status = document.querySelector('[data-form-status]');
  var submitButton = form.querySelector('[type="submit"]');
  var submitLabel = (submitButton && submitButton.querySelector('span')) || submitButton;
  var honeypot = form.querySelector('[data-form-honeypot]');
  var messageField = form.querySelector('[data-message]');
  var stageField = form.querySelector('[data-consultation-stage]');
  var responseFrame = document.querySelector('[data-google-form-target]');
  var defaultLabel = submitLabel ? submitLabel.textContent : 'Send inquiry';
  var pending = false;
  var timer;
  var originalMessage = '';

  function setStatus(state, message) {
    if (!status) return;
    status.setAttribute('data-state', state);
    status.textContent = message;
  }

  function restoreMessage() {
    if (messageField && originalMessage) messageField.value = originalMessage;
  }

  function finish() {
    if (!pending) return;
    pending = false;
    window.clearTimeout(timer);
    form.removeAttribute('aria-busy');
    form.reset();
    originalMessage = '';
    if (submitButton) submitButton.disabled = false;
    if (submitLabel) submitLabel.textContent = 'Inquiry received';
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

    // The stage select has no name; append its unchanged backend value to the message.
    originalMessage = messageField ? messageField.value.trim() : '';
    var stage = (stageField && stageField.value) || '아이디어를 검토하는 중';
    if (messageField) {
      messageField.value = originalMessage + '\n\n[문의 서비스] 브랜드 웹사이트\n[상담 단계] ' + stage;
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
      restoreMessage();
      if (submitButton) submitButton.disabled = false;
      if (submitLabel) submitLabel.textContent = defaultLabel;
      setStatus('error', 'Confirmation is taking longer than expected. Check your connection and try again, or call +82-10-6548-0292.');
    }, 15000);
  });
})();
