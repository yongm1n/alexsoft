/* ALEXSOFT diagnosis — 문의 폼 전용 스크립트.
   리빌·연도 표시는 ink.js가 담당한다. 요소가 없으면 아무것도 하지 않는다. */
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
  var defaultLabel = submitLabel ? submitLabel.textContent : '문의 신청';
  var pending = false;
  var timer;

  // 본문 CTA에서 누른 단계를 폼의 select에 반영
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
    if (submitLabel) submitLabel.textContent = '신청이 접수되었습니다';
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
      if (submitButton) submitButton.disabled = false;
      if (submitLabel) submitLabel.textContent = defaultLabel;
      setStatus('error', '전송 확인이 지연되고 있습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.');
    }, 15000);
  });
})();
