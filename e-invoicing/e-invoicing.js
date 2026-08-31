/* ALEXSOFT — e-invoicing 문의 폼 전송만 담당. 연도·리빌·잉크선은 /assets/ink.js. */
(function () {
  'use strict';

  var form = document.querySelector('[data-inquiry-form]');
  if (!form) return;

  var status = document.querySelector('[data-form-status]');
  var frame = document.querySelector('[data-google-form-target]');
  var button = form.querySelector('[type="submit"]');
  var label = button ? button.querySelector('span') : null;
  var honeypot = form.querySelector('[data-form-honeypot]');
  var defaultLabel = (label && label.textContent) || '문의 신청';
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
      release('문의가 접수되었습니다');
      form.reset();
      setState('success', '접수가 완료되었습니다. 내용을 확인한 뒤 alexsoft.kr@gmail.com에서 회신드리겠습니다.');
      window.setTimeout(function () { if (label) label.textContent = defaultLabel; }, 2600);
    });
  }

  form.addEventListener('submit', function (event) {
    if (!form.reportValidity()) { event.preventDefault(); return; }
    if (honeypot && honeypot.value) { event.preventDefault(); form.reset(); return; }

    pending = true;
    form.setAttribute('aria-busy', 'true');
    if (button) button.disabled = true;
    if (label) label.textContent = '안전하게 전송 중입니다';
    setState('sending', '문의 내용을 전송하고 있습니다. 잠시만 기다려주세요.');

    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      if (!pending) return;
      release(defaultLabel);
      setState('error', '전송 확인이 지연되고 있습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.');
    }, 15000);
  });
})();
