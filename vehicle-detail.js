(() => {
  const page = document.querySelector('[data-vehicle-detail]');
  const byId = id => document.getElementById(id);
  const catalog = globalThis.carmallInventory;
  const detailsById = globalThis.carmallVehicleDetails;
  const id = new URLSearchParams(location.search).get('id') ?? 'new-mg5';
  const vehicle = catalog.find(item => item.id === id);
  if (!vehicle) {
    const empty = document.createElement('p');
    empty.className = 'detail-panel detail-missing';
    empty.textContent = 'This vehicle is unavailable. ';
    const back = document.createElement('a');
    back.href = './new-cars.html';
    back.textContent = 'Browse vehicles';
    empty.append(back);
    page.append(empty);
    return;
  }

  const detail = detailsById[id] || {};
  const used = vehicle.condition === 'used';
  const listingPage = used ? './used-cars.html' : './new-cars.html';
  const listingLabel = used ? 'Used Cars' : 'New Cars';
  const number = new Intl.NumberFormat('en-US');
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const memberMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const memberPrices = new Map();
  const titleFor = item => item.title || [item.make, item.model, item.year, item.version].join(' ');
  const priceFor = item => memberPrices.get(item.id) ?? item.priceDisplay ?? money.format(item.price);
  const hrefFor = item => './vehicle-detail.html?id=' + encodeURIComponent(item.id);
  const title = titleFor(vehicle);
  const photos = detail.photos || [vehicle.photo];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motion = () => reduceMotion.matches ? 'instant' : 'smooth';
  const typeLabels = { sedan: 'Sedan', suv: 'SUV', minivan: 'MPV' };
  const fallbackParameters = {
    'Model Year': vehicle.year, 'Body Type': typeLabels[vehicle.body] || vehicle.body,
    'Displacement Class': vehicle.displacement, 'Drive Type': vehicle.drive,
    'Fuel Type': vehicle.fuel, 'Transmission': vehicle.transmission
  };
  const present = value => value ?? '—';

  function element(tag, content, className) {
    const node = document.createElement(tag);
    if (content !== undefined) node.textContent = content;
    if (className) node.className = className;
    return node;
  }

  function image(src, alt = '', lazy = false) {
    const node = element('img');
    node.src = src;
    node.alt = alt;
    if (lazy) node.loading = 'lazy';
    return node;
  }

  function addPairs(target, pairs) {
    for (const [label, value] of pairs) {
      const pair = element('div');
      pair.append(element('dt', label), element('dd', present(value)));
      target.append(pair);
    }
  }

  const actionIcons = {
    favorite: '<path class="detail-favorite-outline" d="M4.196 12.196a5.228 5.228 0 0 1 7.394-7.393l.411.411.41-.41a5.228 5.228 0 1 1 7.394 7.394L12 20.001z" stroke-width="2"/><path class="detail-favorite-filled" d="M4.196 12.196a5.228 5.228 0 0 1 7.394-7.393l.411.411.41-.41a5.228 5.228 0 1 1 7.394 7.394L12 20.001z" fill="currentColor" stroke="none"/>',
    share: '<path d="M12.5 4 22 12l-9.5 8v-5.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z" stroke-width="2"/>',
    compare: '<path d="M4 17V2.5h5.7a3.5 3.5 0 0 1 0 7H4m7.3-.5v12.5m0-5.1L19 8.8m-5.3 5.3 7.8 7.4" stroke-width="1.75" stroke-linecap="butt"/>',
    inquire: '<path d="M4.6 17.7 2 22l5.3-1.2A10 10 0 1 0 4.6 17.7ZM8 10h8m-8 4h5"/>'
  };

  function icon(name) {
    const template = document.createElement('template');
    template.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${actionIcons[name]}</svg>`;
    return template.content.firstElementChild;
  }

  document.title = title + ' · Carmall24';
  page.dataset.vehicleDetail = vehicle.condition;
  byId('detail-catalog').href = listingPage;
  byId('detail-catalog').textContent = listingLabel;
  byId('detail-make').href = listingPage + '?brand=' + encodeURIComponent(vehicle.make);
  byId('detail-make').textContent = vehicle.make;
  byId('detail-trim').textContent = title;
  byId('detail-view-makes').href = listingPage + '#make-model-filter';
  byId('detail-title').textContent = title;
  const priceAmount = byId('detail-price-amount');
  priceAmount.textContent = priceFor(vehicle).slice(1);
  byId('detail-price-label').textContent = vehicle.priceDisplay ? 'Listed Price' : 'Indicative FOB';
  if (!used) {
    const summary = byId('detail-summary');
    const traits = [typeLabels[vehicle.body], vehicle.drive, vehicle.fuel].filter(Boolean);
    summary.replaceChildren(...traits.map(trait => element('li', trait)));
    summary.hidden = traits.length === 0;
  }
  if (detail.msrp) {
    const { amount, yuanPerDollar, rateDate } = detail.msrp;
    const msrp = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
    const originalPrice = byId('detail-msrp');
    byId('detail-msrp-amount').textContent = msrp.format(amount / yuanPerDollar);
    originalPrice.title = 'Converted from CN¥' + number.format(amount) + ' using the CFETS rate on ' + rateDate;
    originalPrice.hidden = false;
    byId('detail-price-label').classList.add('visually-hidden');
  }

  const basicDetails = detail.properties || { ...fallbackParameters, Seats: vehicle.seats, 'Exterior Color': vehicle.color };
  addPairs(byId('detail-properties'), Object.entries(basicDetails));
  addPairs(byId('detail-parameters'), Object.entries(detail.parameters || fallbackParameters));
  byId('detail-spec-model').textContent = title;
  const sections = detail.specifications || [
    ['Listing Specifications', Object.entries(basicDetails)]
  ];
  for (const [heading, rows] of sections) {
    const group = element('section', undefined, 'detail-spec-group');
    const list = element('dl', undefined, 'detail-properties');
    addPairs(list, rows);
    group.append(element('h3', heading), list);
    byId('detail-spec-groups').append(group);
  }
  const source = byId('detail-spec-sources');
  if (detail.listing) {
    const siteLink = element('a', 'Carmall24 vehicle listing');
    siteLink.href = detail.listing;
    source.append('Sources ', siteLink);
    if (detail.specSource) {
      const trimLink = element('a', 'GAC Toyota Comfort trim specifications');
      trimLink.href = detail.specSource;
      source.append(' · ', trimLink);
    }
  } else {
    source.textContent = 'Specifications available in the sample inventory.';
  }
  const features = byId('detail-features');
  for (const feature of detail.features || []) features.append(element('li', feature));
  byId('detail-features-section').hidden = !features.childElementCount;
  if (used) {
    document.querySelector('.detail-inspection').hidden = false;
    const reportModel = byId('detail-inspection-model');
    reportModel.textContent = title;
    reportModel.title = title;
    if (detail.conditionNote) {
      const condition = byId('detail-condition');
      condition.textContent = detail.conditionNote;
      condition.hidden = false;
    }
  }

  const gallery = document.querySelector('.detail-gallery');
  const thumbTrack = page.querySelector('.detail-thumb-track');
  const inspectionPhotos = byId('detail-inspection-photos');
  const lightbox = byId('detail-lightbox');
  const mainPhoto = byId('detail-photo');
  let photoIndex = 0;
  let renderedPhotoIndex = -1;
  let stopPhotoTransition;
  const thumbButtons = [];

  function photoLabel(index) {
    return title + ', photo ' + (index + 1);
  }

  photos.forEach((src, index) => {
    const thumb = element('button');
    thumb.type = 'button';
    thumb.setAttribute('aria-label', 'Show photo ' + (index + 1));
    thumb.append(image(src, '', index >= 6));
    thumb.addEventListener('click', () => showPhoto(index));
    thumbTrack.append(thumb);
    thumbButtons.push(thumb);

    if (used && index < 5) {
      const preview = element('button');
      preview.type = 'button';
      preview.setAttribute('aria-label', 'Enlarge photo ' + (index + 1));
      preview.append(image(src, '', true));
      preview.addEventListener('click', () => {
        showPhoto(index);
        lightbox.showModal();
      });
      inspectionPhotos.append(preview);
    }
  });
  gallery.querySelector('.detail-thumbs').hidden = photos.length < 2;
  const photoArrows = [...document.querySelectorAll('[data-photo-step]')];
  const thumbArrows = [...gallery.querySelectorAll('[data-thumb-step]')];

  function updateThumbArrows() {
    const max = thumbTrack.scrollWidth - thumbTrack.clientWidth;
    for (const button of thumbArrows) {
      button.hidden = max < 2;
      button.disabled = Number(button.dataset.thumbStep) < 0 ? thumbTrack.scrollLeft < 2 : thumbTrack.scrollLeft > max - 2;
    }
  }

  async function updateGalleryPhoto(index) {
    if (index === renderedPhotoIndex) return;
    const next = image(photos[index], photoLabel(index));
    let canAnimate = renderedPhotoIndex >= 0 && !reduceMotion.matches;
    if (canAnimate) {
      try {
        await next.decode();
      } catch {
        canAnimate = false;
      }
      if (index !== photoIndex || index === renderedPhotoIndex) return;
    }
    stopPhotoTransition?.();
    const previous = canAnimate ? mainPhoto.cloneNode() : null;
    const direction = index > renderedPhotoIndex ? 1 : -1;
    renderedPhotoIndex = index;
    mainPhoto.src = next.src;
    mainPhoto.alt = next.alt;
    if (!previous) return;

    previous.removeAttribute('id');
    previous.alt = '';
    previous.setAttribute('aria-hidden', 'true');
    previous.classList.add('detail-photo-outgoing');
    mainPhoto.before(previous);
    const timing = { duration: 300, easing: 'ease-in-out', fill: 'both' };
    const outgoing = previous.animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(${-direction * 100}%)` }], timing
    );
    const incoming = mainPhoto.animate(
      [{ transform: `translateX(${direction * 100}%)` }, { transform: 'translateX(0)' }], timing
    );
    stopPhotoTransition = () => {
      outgoing.cancel();
      incoming.cancel();
      previous.remove();
      stopPhotoTransition = undefined;
    };
    incoming.addEventListener('finish', stopPhotoTransition, { once: true });
  }

  function showPhoto(index) {
    photoIndex = Math.min(photos.length - 1, Math.max(0, index));
    updateGalleryPhoto(photoIndex);
    const enlarged = byId('detail-lightbox-photo');
    enlarged.src = photos[photoIndex];
    enlarged.alt = photoLabel(photoIndex);
    const count = (photoIndex + 1) + ' / ' + photos.length;
    byId('detail-photo-count').textContent = count;
    byId('detail-lightbox-count').textContent = count;
    photoArrows.forEach(button => {
      button.hidden = photos.length < 2;
      button.disabled = Number(button.dataset.photoStep) < 0 ? photoIndex === 0 : photoIndex === photos.length - 1;
    });
    thumbButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === photoIndex)));
    const active = thumbButtons[photoIndex];
    if (active.offsetLeft < thumbTrack.scrollLeft || active.offsetLeft + active.offsetWidth > thumbTrack.scrollLeft + thumbTrack.clientWidth) {
      thumbTrack.scrollTo({ left: active.offsetLeft, behavior: motion() });
    }
  }

  page.querySelector('.detail-photo-open').addEventListener('click', () => lightbox.showModal());
  photoArrows.forEach(button => button.addEventListener('click', () => showPhoto(photoIndex + Number(button.dataset.photoStep))));
  thumbArrows.forEach(button => button.addEventListener('click', () => {
    thumbTrack.scrollBy({ left: Number(button.dataset.thumbStep) * thumbTrack.clientWidth, behavior: motion() });
  }));
  thumbTrack.addEventListener('scroll', updateThumbArrows, { passive: true });
  new ResizeObserver(updateThumbArrows).observe(thumbTrack);
  for (const region of [gallery, lightbox]) region.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showPhoto(photoIndex + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });

  document.querySelectorAll('[data-open-dialog]').forEach(button => {
    const dialog = byId(button.dataset.openDialog);
    button.setAttribute('aria-controls', dialog.id);
    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', () => dialog.showModal());
  });
  for (const dialog of document.querySelectorAll('dialog[id^="detail-"]')) {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
        dialog.close();
      }
    });
  }

  const favorite = byId('detail-favorite');
  const compareButton = page.querySelector('[data-open-dialog="detail-compare"]');
  favorite.dataset.detailFavorite = id;
  favorite.prepend(icon('favorite'));
  page.querySelector('[data-open-dialog="detail-share"]').prepend(icon('share'));
  compareButton.hidden = used;
  if (!used) compareButton.prepend(icon('compare'));

  const favoritesKey = 'carmall24-inventory-favorites';
  let favorites = [];
  function updateFavoriteButtons() {
    for (const button of page.querySelectorAll('[data-detail-favorite]')) {
      const pressed = favorites.includes(button.dataset.detailFavorite);
      button.setAttribute('aria-pressed', String(pressed));
    }
  }
  function readFavorites() {
    try {
      const saved = JSON.parse(localStorage.getItem(favoritesKey));
      favorites = Array.isArray(saved) ? saved : [];
    } catch {
      // Keep the current page selection when storage is unavailable.
    }
    updateFavoriteButtons();
  }
  window.addEventListener('pageshow', readFavorites);
  window.addEventListener('storage', event => {
    if (event.key === favoritesKey) readFavorites();
  });
  page.addEventListener('click', event => {
    const button = event.target.closest('[data-detail-favorite]');
    if (!button) return;
    const itemId = button.dataset.detailFavorite;
    favorites = favorites.includes(itemId) ? favorites.filter(item => item !== itemId) : [...favorites, itemId];
    updateFavoriteButtons();
    try {
      localStorage.setItem(favoritesKey, JSON.stringify(favorites));
    } catch {
      // The button still reflects the current page selection.
    }
  });

  const shareUrl = byId('detail-share-url');
  const shareStatus = byId('detail-share-status');
  shareUrl.value = location.protocol === 'file:' && detail.listing ? detail.listing : new URL(hrefFor(vehicle), location.href).href;
  byId('detail-share').addEventListener('close', () => { shareStatus.hidden = true; });
  byId('detail-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareUrl.value);
      shareStatus.textContent = 'Link copied.';
    } catch {
      shareUrl.focus();
      shareUrl.select();
      shareStatus.textContent = 'Link selected. Use your keyboard to copy it.';
    }
    shareStatus.hidden = false;
  });

  const portValue = byId('detail-port-value');
  let port = portValue.textContent.trim();
  const portForm = byId('detail-port-form');
  portForm.addEventListener('submit', event => {
    event.preventDefault();
    port = portForm.elements.port.value.trim();
    portValue.textContent = port || 'Select a Port';
    byId('detail-port-dialog').close();
  });
  byId('detail-port-dialog').addEventListener('close', () => {
    portForm.elements.port.value = port;
  });
  let quantity = 1;
  const colors = used ? {} : detail.colors || { 'Appearance Color': vehicle.color };
  if (!used) {
    for (const [label, name] of Object.entries(colors)) {
      if (!name) continue;
      const field = element('div');
      field.append(element('dt', label), element('dd', name));
      byId('detail-colors').append(field);
    }
    page.querySelector('.detail-new-options').hidden = false;
    const quantityButtons = [...page.querySelectorAll('[data-quantity-step]')];
    for (const button of quantityButtons) button.addEventListener('click', () => {
      quantity = Math.min(99, Math.max(1, quantity + Number(button.dataset.quantityStep)));
      byId('detail-quantity').value = quantity;
      quantityButtons[0].disabled = quantity === 1;
      quantityButtons[1].disabled = quantity === 99;
    });
  }

  const form = byId('detail-inquiry-form');
  const formStatus = form.querySelector('.form-status');
  const submit = form.querySelector('[type="submit"]');
  function updateInquirySubmit() {
    submit.disabled = !form.elements.name.value.trim() || !form.elements.email.validity.valid;
  }
  form.addEventListener('input', updateInquirySubmit);
  form.addEventListener('change', updateInquirySubmit);
  form.addEventListener('reset', () => queueMicrotask(updateInquirySubmit));
  window.addEventListener('pageshow', updateInquirySubmit);
  updateInquirySubmit();
  const buy = byId('detail-buy');
  if (detail.listing) {
    buy.href = detail.listing;
  } else {
    buy.dataset.inquiry = 'purchase';
  }
  const prompts = { quote: 'Please send me a quote for ', purchase: 'I would like to buy ', inspection: 'Please send me the full inspection report for ' };
  let suggestedMessage = '';
  for (const link of page.querySelectorAll('[data-inquiry]')) link.addEventListener('click', event => {
    event.preventDefault();
    const message = form.elements.message;
    if (!message.value.trim() || message.value === suggestedMessage) {
      suggestedMessage = prompts[link.dataset.inquiry] + title + '.';
      message.value = suggestedMessage;
      formStatus.hidden = true;
    }
    form.elements.name.focus({ preventScroll: true });
    byId('detail-inquiry').scrollIntoView({ block: 'start', behavior: motion() });
  });
  form.addEventListener('submit', event => {
    if (event.defaultPrevented) return;
    event.preventDefault();
    if (submit.disabled) return;
    const values = new FormData(form);
    const trade = page.querySelector('[name="trade"]:checked').value;
    const shipping = page.querySelector('[name="shipping"]:checked').value;
    const body = [
      'Vehicle: ' + title,
      detail.listing ? 'Listing: ' + detail.listing : '',
      'Name: ' + values.get('name').trim(),
      'Email: ' + values.get('email').trim(),
      values.get('province').trim() ? 'State/Province: ' + values.get('province').trim() : '',
      values.get('whatsapp').trim() ? 'WhatsApp: ' + values.get('whatsapp').trim() : '',
      'Trade method: ' + trade,
      'Shipping mode: ' + shipping,
      port ? 'Port of shipment: ' + port : '',
      !used ? 'Quantity: ' + quantity : '',
      ...Object.entries(colors).map(([label, name]) => name ? label + ': ' + name : '')
    ].filter(Boolean).join('\r\n');
    const message = values.get('message').trim();
    byId('detail-email-draft').href = 'mailto:service@carmall24.com?subject=' + encodeURIComponent('Vehicle inquiry: ' + title)
      + '&body=' + encodeURIComponent(message ? body + '\r\n\r\n' + message : body);
    formStatus.hidden = false;
  });
  for (const target of [form, page.querySelector('.detail-offer'), portForm]) {
    target.addEventListener('input', () => { formStatus.hidden = true; });
  }
  portForm.addEventListener('submit', () => { formStatus.hidden = true; });
  page.querySelector('.detail-quantity').addEventListener('click', () => { formStatus.hidden = true; });

  const related = catalog
    .filter(item => item.id !== id)
    .sort((a, b) => Number(b.model === vehicle.model) - Number(a.model === vehicle.model)
      || Number(b.body === vehicle.body) - Number(a.body === vehicle.body));
  const comparable = used ? [] : related.filter(item => item.condition === vehicle.condition);
  const compareSelect = byId('detail-compare-select');
  const relatedPrices = [];
  comparable.forEach(item => compareSelect.add(new Option(titleFor(item), item.id)));
  compareButton.disabled = !comparable.length;

  for (const condition of ['new', 'used']) {
    const items = related.filter(item => item.condition === condition);
    if (!items.length) continue;
    const section = byId('detail-related-template').content.firstElementChild.cloneNode(true);
    const heading = section.querySelector('h2');
    const track = section.querySelector('.detail-related-track');
    const arrows = [...section.querySelectorAll('[data-related-step]')];
    const sameModel = items.some(item => item.make === vehicle.make && item.model === vehicle.model);
    heading.id = 'detail-related-' + condition;
    heading.textContent = condition === 'used' ? 'Similar Used Cars' : sameModel ? 'Same Model New Cars' : 'Similar New Cars';
    section.setAttribute('aria-labelledby', heading.id);
    for (const item of items) {
      const card = byId('detail-related-card-template').content.firstElementChild.cloneNode(true);
      const link = card.querySelector('.detail-related-link');
      link.href = hrefFor(item);
      const itemTitle = titleFor(item);
      card.querySelector('.detail-related-photo').append(image(item.photo, '', true));
      card.querySelector('h3').textContent = itemTitle;
      const specs = [item.registration || item.year, number.format(item.mileage) + ' km', item.fuel];
      card.querySelector('.detail-related-specs').append(...specs.map(spec => element('li', spec)));
      card.querySelector('.detail-related-price-label').textContent = item.priceDisplay ? 'Listed Price' : 'Indicative FOB:';
      const amount = card.querySelector('.detail-related-price strong');
      amount.textContent = priceFor(item);
      relatedPrices.push({ amount, item });
      const save = card.querySelector('[data-detail-favorite]');
      save.dataset.detailFavorite = item.id;
      save.setAttribute('aria-label', 'Favorite ' + itemTitle);
      save.append(icon('favorite'));
      const inquire = card.querySelector('.detail-related-inquire');
      inquire.href = hrefFor(item) + '#detail-inquiry';
      inquire.setAttribute('aria-label', 'Inquire about ' + itemTitle);
      inquire.append(icon('inquire'));
      track.append(card);
    }
    function updateArrows() {
      const max = track.scrollWidth - track.clientWidth;
      arrows[0].disabled = track.scrollLeft < 2;
      arrows[1].disabled = track.scrollLeft > max - 2;
    }
    arrows.forEach(button => button.addEventListener('click', () => {
      track.scrollBy({ left: Number(button.dataset.relatedStep) * track.clientWidth, behavior: motion() });
    }));
    track.addEventListener('scroll', updateArrows, { passive: true });
    byId('detail-related').append(section);
    new ResizeObserver(updateArrows).observe(track);
  }
  readFavorites();

  function renderComparison() {
    const other = comparable.find(item => item.id === compareSelect.value);
    if (!other) return;
    const table = byId('detail-comparison');
    table.replaceChildren();
    const header = table.createTHead().insertRow();
    for (const heading of ['Specification', title, titleFor(other)]) {
      const cell = element('th', heading);
      cell.scope = 'col';
      header.append(cell);
    }
    const body = table.createTBody();
    for (const [label, get] of [
      ['Price', priceFor], ['Model year', item => item.year], ['Mileage', item => number.format(item.mileage) + ' km'],
      ['Fuel', item => item.fuel], ['Drive', item => item.drive], ['Transmission', item => item.transmission]
    ]) {
      const row = body.insertRow();
      const key = element('th', label);
      key.scope = 'row';
      row.append(key, element('td', get(vehicle)), element('td', get(other)));
    }
  }
  compareSelect.addEventListener('change', renderComparison);
  renderComparison();

  let priceRequest = 0;
  function renderPrices() {
    priceAmount.textContent = priceFor(vehicle).slice(1);
    for (const { amount, item } of relatedPrices) amount.textContent = priceFor(item);
    renderComparison();
  }

  // The deployed app can supply carmallAuthenticatedFetch(url, options) using its account session.
  // Dispatch carmall:sessionchange after sign-in or sign-out to refresh prices.
  async function refreshMemberPrices() {
    const request = ++priceRequest;
    if (memberPrices.size) {
      memberPrices.clear();
      renderPrices();
    }
    const onCarmall = location.protocol === 'https:' && /^(www\.)?carmall24\.com$/.test(location.hostname);
    const requestPrice = globalThis.carmallAuthenticatedFetch ?? (onCarmall ? fetch.bind(globalThis) : null);
    if (typeof requestPrice !== 'function') return;
    const gatedListings = catalog.filter(item => item.priceDisplay && detailsById[item.id]?.listingId);
    const quotes = await Promise.allSettled(gatedListings.map(async item => {
      const response = await requestPrice('/app-api/mall/' + item.condition + '-car/details', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'lang-Type': '1' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ langType: 1, id: detailsById[item.id].listingId })
      });
      if (!response.ok) return null;
      const { code, data } = await response.json();
      const dollars = String(data?.salesPrice ?? '').trim().match(/^\$?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)$/);
      if (code !== 0 || !dollars) return null;
      const amount = Number(dollars[1].replaceAll(',', ''));
      return Number.isFinite(amount) ? [item.id, memberMoney.format(amount)] : null;
    }));
    if (request !== priceRequest) return;
    for (const quote of quotes) {
      if (quote.status === 'fulfilled' && quote.value) memberPrices.set(...quote.value);
    }
    if (memberPrices.size) renderPrices();
  }

  window.addEventListener('carmall:sessionchange', refreshMemberPrices);
  window.addEventListener('pageshow', event => {
    if (event.persisted) refreshMemberPrices();
  });
  refreshMemberPrices();

  if (!used) {
    byId('detail-trends').hidden = false;
    renderPriceHistory(detail.trend);
  }

  function renderPriceHistory(trend) {
    const figure = byId('detail-price-chart');
    if (!trend) {
      figure.append(element('p', 'No price history is available for this vehicle.', 'detail-chart-empty'));
      return;
    }
    const periods = page.querySelector('.detail-periods');
    const periodButtons = [...periods.querySelectorAll('button')];
    periods.hidden = false;
    const day = 86400000;
    const earliest = Date.parse(trend.start);
    const end = Date.parse(trend.end);
    const step = 10000;
    const upper = Math.max(6 * step, Math.ceil(trend.price / step) * step + step);
    const plot = { width: 776, left: 86, right: 742, top: 22, bottom: 351 };
    const plotWidth = plot.right - plot.left;
    const rowHeight = (plot.bottom - plot.top) / 6;
    const priceY = plot.top + (upper - trend.price) / step * rowHeight;
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const tooltipDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: trend.currency, maximumFractionDigits: 0 });
    const price = currency.format(trend.price);

    function draw(days) {
      const start = Math.max(earliest, end - (days - 1) * day);
      const span = (end - start) / day;
      const xLabels = Array.from({ length: 7 }, (_, i) => formatter.format(start + Math.round(span * i / 6) * day));
      const ticks = Array.from({ length: 7 }, (_, index) => {
        const y = plot.top + index * rowHeight;
        const label = currency.format(upper - index * step);
        return `<line x1="${plot.left}" x2="${plot.right}" y1="${y}" y2="${y}"/><text x="${plot.left - 10}" y="${y}" text-anchor="end" dominant-baseline="middle">${label}</text>`;
      }).join('');
      const dates = xLabels.map((label, i) => `<text x="${plot.left + i * plotWidth / 6}" y="381" text-anchor="middle">${label}</text>`).join('');
      const range = tooltipDate.formatRange(start, end);
      figure.innerHTML = `<figcaption>
          <p>Latest tracked price</p>
          <div><strong>${price}</strong><span class="detail-chart-change">0.0%</span><span>${range}</span></div>
        </figcaption>
        <div class="detail-chart-plot">
          <svg viewBox="0 0 ${plot.width} 390" role="img" tabindex="0" aria-label="The published price was steady at ${price} from ${range}. Use the left and right arrow keys to inspect dates.">
            <g class="detail-chart-grid">${ticks}</g>
            <path class="detail-chart-line" d="M${plot.left} ${priceY}H${plot.right}"/>
            <circle class="detail-chart-end" cx="${plot.right}" cy="${priceY}" r="4"/>
            <g class="detail-chart-cursor" visibility="hidden">
              <line y1="${plot.top}" y2="${plot.bottom}"/>
              <circle cy="${priceY}" r="4"/>
            </g>
            <g class="detail-chart-dates">${dates}</g>
          </svg>
          <div class="detail-chart-tooltip" role="status" hidden><span></span><strong>${price}</strong></div>
        </div>`;
      periodButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.period) === days)));

      const svg = figure.querySelector('svg');
      const cursor = svg.querySelector('.detail-chart-cursor');
      const tooltip = figure.querySelector('.detail-chart-tooltip');
      const date = tooltip.querySelector('span');
      let selected = span;
      function showPoint(index) {
        selected = Math.max(0, Math.min(span, index));
        const x = plot.left + (span ? selected / span : 1) * plotWidth;
        cursor.setAttribute('transform', 'translate(' + x + ' 0)');
        cursor.setAttribute('visibility', 'visible');
        date.textContent = tooltipDate.format(start + selected * day);
        tooltip.style.left = x / plot.width * 100 + '%';
        tooltip.classList.toggle('is-left', x > plot.width / 2);
        tooltip.hidden = false;
      }
      function hidePoint() {
        cursor.setAttribute('visibility', 'hidden');
        tooltip.hidden = true;
      }
      svg.addEventListener('pointermove', event => {
        const bounds = svg.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width * plot.width;
        showPoint(Math.round((x - plot.left) / plotWidth * span));
      });
      svg.addEventListener('pointerleave', () => {
        if (document.activeElement !== svg) hidePoint();
      });
      svg.addEventListener('focus', () => showPoint(selected));
      svg.addEventListener('blur', hidePoint);
      svg.addEventListener('keydown', event => {
        const datesByKey = { ArrowLeft: selected - 1, ArrowRight: selected + 1, Home: 0, End: span };
        if (!(event.key in datesByKey)) return;
        event.preventDefault();
        showPoint(datesByKey[event.key]);
      });
    }
    periods.addEventListener('click', event => {
      const button = event.target.closest('[data-period]');
      if (button) draw(Number(button.dataset.period));
    });
    draw(30);
  }

  page.querySelector('.detail-breadcrumb').hidden = false;
  const layout = page.querySelector('.detail-layout');
  const sidebar = page.querySelector('.detail-sidebar');
  layout.hidden = false;
  let revealedByPage = 0;
  function revealSidebar() {
    const overflow = sidebar.scrollHeight - sidebar.clientHeight;
    const stickyTop = parseFloat(getComputedStyle(sidebar).top);
    const reveal = overflow > 0 && Number.isFinite(stickyTop)
      ? Math.min(overflow, Math.max(0, stickyTop - layout.getBoundingClientRect().top))
      : 0;
    if (reveal !== revealedByPage) sidebar.scrollTop += reveal - revealedByPage;
    revealedByPage = reveal;
  }
  // A tall panel follows the page through its controls before settling in the sticky viewport.
  window.addEventListener('scroll', revealSidebar, { passive: true });
  new ResizeObserver(revealSidebar).observe(sidebar);
  revealSidebar();
  showPhoto(0);
  updateThumbArrows();
  if (location.hash === '#detail-inquiry') {
    byId('detail-inquiry').scrollIntoView();
  }
})();
