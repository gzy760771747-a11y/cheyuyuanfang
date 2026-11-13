(() => {
  const transferKey = 'carmall24-dealer-application-transfer';
  const transferFields = [
    'business_type', 'city', 'business_name', 'credit_code', 'legal_representative',
    'calling_code', 'phone', 'taxpayer_type', 'export_qualification'
  ];
  const startForm = document.querySelector('#partner-application');

  if (startForm) {
    startForm.addEventListener('submit', event => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      const filled = transferFields.map(name => [name, startForm.elements.namedItem(name).value.trim()]);
      try {
        sessionStorage.setItem(transferKey, JSON.stringify(Object.fromEntries(filled.filter(([, value]) => value))));
      } catch {
        // The application page shows a fallback message when storage is unavailable.
      }
      location.assign('./dealer-application.html#prefill');
    });
    return;
  }

  const flow = document.querySelector('#dealer-flow');
  if (!flow) return;

  const panels = [...flow.querySelectorAll('[data-dealer-step]')];
  const markers = [...flow.querySelectorAll('.dealer-progress li')];
  const detailsForm = document.querySelector('#dealer-details-form');
  const fields = detailsForm.elements;
  const agreementForm = document.querySelector('#dealer-agreement-form');
  const agreement = agreementForm.elements.namedItem('agreement');
  const back = document.querySelector('#dealer-back');
  const next = document.querySelector('#dealer-next');
  const pay = document.querySelector('#dealer-pay');
  const depositLabel = document.querySelector('#dealer-deposit-label');
  const reviewStatus = document.querySelector('#dealer-review-status');
  const reviewInstructions = reviewStatus.textContent;
  const stepHashes = ['#step-1', '#step-2', '#step-3'];
  let activeStep = 1;
  let detailsConfirmed = false;
  let depositPaid = false;
  let reviewSubmitted = false;

  const isTransfer = location.hash === '#prefill';
  let draft;
  try {
    const stored = sessionStorage.getItem(transferKey);
    sessionStorage.removeItem(transferKey);
    if (isTransfer && stored) draft = JSON.parse(stored);
  } catch {
    // The fields are editable even when the browser cannot restore a draft.
  }

  if (draft) {
    transferFields.forEach(name => {
      if (typeof draft[name] === 'string' && draft[name]) fields.namedItem(name).value = draft[name];
    });
  } else if (isTransfer) {
    const status = document.querySelector('#dealer-prefill-status');
    status.textContent = '浏览器未能带入已填信息，请在此继续填写。';
    status.hidden = false;
  }

  function renderDeposit() {
    pay.disabled = depositPaid;
    pay.textContent = depositPaid ? '已模拟缴纳' : '缴纳保证金';
    depositLabel.textContent = depositPaid ? '保证金模拟缴纳完成' : '需缴纳保证金';
    if (reviewSubmitted) {
      reviewStatus.textContent = '申请流程演示完成。';
    } else if (depositPaid) {
      reviewStatus.textContent = '模拟缴纳完成，可以体验提交审核。';
    } else {
      reviewStatus.textContent = reviewInstructions;
    }

    if (activeStep === 3) {
      next.disabled = !depositPaid || reviewSubmitted;
      next.textContent = reviewSubmitted ? '已完成' : '提交审核';
    }
  }

  function resetDeposit() {
    depositPaid = false;
    reviewSubmitted = false;
    renderDeposit();
  }

  function invalidateDetails() {
    if (!detailsConfirmed) return;
    detailsConfirmed = false;
    agreement.checked = false;
    resetDeposit();
  }

  function renderStep(moveFocus = false) {
    const requestedStep = stepHashes.indexOf(location.hash) + 1 || 1;
    const lastStep = detailsConfirmed ? (agreement.checked ? 3 : 2) : 1;
    activeStep = Math.min(requestedStep, lastStep);
    const hash = stepHashes[activeStep - 1];
    if (location.hash !== hash) history.replaceState(history.state, '', hash);

    panels.forEach((panel, index) => { panel.hidden = index + 1 !== activeStep; });
    markers.forEach((marker, index) => {
      const step = index + 1;
      marker.toggleAttribute('data-complete', step < activeStep);
      if (step === activeStep) marker.setAttribute('aria-current', 'step');
      else marker.removeAttribute('aria-current');
    });

    if (activeStep === 3) {
      next.type = 'button';
      next.removeAttribute('form');
    } else {
      next.type = 'submit';
      next.setAttribute('form', activeStep === 1 ? detailsForm.id : agreementForm.id);
      next.textContent = '下一步';
      next.disabled = false;
    }
    renderDeposit();

    if (moveFocus) {
      window.scrollTo(0, 0);
      panels[activeStep - 1].querySelector('h1').focus({ preventScroll: true });
    }
  }

  function updateFileDisplay(input, message = '') {
    const slot = input.closest('.dealer-document');
    const file = input.files[0];
    const name = slot.querySelector('.dealer-file-name');
    name.textContent = file?.name ?? '';
    name.hidden = !file;
    slot.querySelector('.dealer-remove-file').hidden = !file;
    input.dispatchEvent(new CustomEvent('carmall24:validate-field', { bubbles: true, detail: message }));
  }

  function requireDocument(input, required, showMark = required) {
    input.required = required;
    input.closest('.dealer-document').querySelector('.partner-field-label img').hidden = !showMark;
    if (!required) updateFileDisplay(input);
  }

  function updateDocumentRequirements() {
    const businessType = fields.namedItem('business_type').value;
    const taxpayerType = fields.namedItem('taxpayer_type').value;
    const sellsNewCars = businessType === 'New car dealer' || businessType === 'New and used car dealer';
    requireDocument(fields.namedItem('taxpayer_proof'), taxpayerType === 'General taxpayer');
    requireDocument(fields.namedItem('brand_authorization'), sellsNewCars, sellsNewCars || !businessType);
  }

  detailsForm.querySelectorAll('input[type="file"]').forEach(input => {
    const slot = input.closest('.dealer-document');

    input.addEventListener('change', () => {
      invalidateDetails();
      const file = input.files[0];
      const supported = !file || file.type === 'application/pdf' || file.type.startsWith('image/')
        || /\.(?:pdf|jpe?g|png|gif|webp|bmp|heic|heif|tiff?|avif|svg)$/i.test(file.name);
      if (!supported) input.value = '';
      updateFileDisplay(input, supported ? '' : '请选择 PDF 或图片文件。');
    });
    slot.querySelector('.dealer-remove-file').addEventListener('click', () => {
      input.value = '';
      updateFileDisplay(input);
      invalidateDetails();
      input.focus();
    });
    updateFileDisplay(input);
  });

  detailsForm.addEventListener('input', event => {
    const control = event.target;
    if (control.type === 'file') return;
    invalidateDetails();
    if (control.name === 'business_type' || control.name === 'taxpayer_type') updateDocumentRequirements();
  });

  detailsForm.addEventListener('submit', event => {
    if (event.defaultPrevented) return;
    event.preventDefault();
    detailsConfirmed = true;
    location.hash = stepHashes[1];
  });

  agreement.addEventListener('change', () => {
    if (!agreement.checked) resetDeposit();
  });

  agreementForm.addEventListener('submit', event => {
    if (event.defaultPrevented) return;
    event.preventDefault();
    if (detailsConfirmed && agreement.checked) location.hash = stepHashes[2];
  });

  back.addEventListener('click', () => {
    if (activeStep === 1) location.assign('./work-with-us.html#partner-application');
    else location.hash = stepHashes[activeStep - 2];
  });

  pay.addEventListener('click', () => {
    depositPaid = true;
    renderDeposit();
    next.focus({ preventScroll: true });
  });

  next.addEventListener('click', () => {
    if (activeStep === 3 && depositPaid && !reviewSubmitted) {
      reviewSubmitted = true;
      renderDeposit();
      reviewStatus.focus({ preventScroll: true });
    }
  });

  window.addEventListener('hashchange', () => renderStep(true));
  updateDocumentRequirements();
  renderStep();
})();
