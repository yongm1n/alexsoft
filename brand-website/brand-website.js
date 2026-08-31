/* ALEXSOFT brand-website — 문의 폼 전용 스크립트.
   리빌·연도 표시는 ink.js가 담당한다. 요소가 없으면 아무것도 하지 않는다. */
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
  var defaultLabel = submitLabel ? submitLabel.textContent : '문의 신청';
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
    if (submitLabel) submitLabel.textContent = '문의가 접수되었습니다';
    setStatus('success', '접수가 완료되었습니다. 내용을 확인한 뒤 alexsoft.kr@gmail.com에서 회신드리겠습니다.');
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

    // 상담 단계 select에는 name이 없다 — 본문 항목 끝에 붙여서 함께 보낸다.
    originalMessage = messageField ? messageField.value.trim() : '';
    var stage = (stageField && stageField.value) || '아이디어를 검토하는 중';
    if (messageField) {
      messageField.value = originalMessage + '\n\n[문의 서비스] 브랜드 웹사이트\n[상담 단계] ' + stage;
    }

    pending = true;
    form.setAttribute('aria-busy', 'true');
    if (submitButton) submitButton.disabled = true;
    if (submitLabel) submitLabel.textContent = '안전하게 전송 중입니다';
    setStatus('sending', '문의 내용을 전송하고 있습니다. 잠시만 기다려주세요.');

    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      if (!pending) return;
      pending = false;
      form.removeAttribute('aria-busy');
      restoreMessage();
      if (submitButton) submitButton.disabled = false;
      if (submitLabel) submitLabel.textContent = defaultLabel;
      setStatus('error', '전송 확인이 지연되고 있습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.');
    }, 15000);
  });
})();
