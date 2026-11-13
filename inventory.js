(() => {
  const page = document.querySelector('[data-inventory]');
  const isUsed = page.dataset.inventory === 'used';
  const catalog = globalThis.carmallInventory.filter(vehicle => vehicle.condition === page.dataset.inventory);
  const filterForm = page.querySelector('.inventory-filter-form');
  const filters = page.querySelector('.inventory-filters');
  const filterToggle = page.querySelector('.inventory-filter-toggle');
  const categories = page.querySelector('.inventory-category-track');
  const categoryArrows = [...page.querySelectorAll('[data-category-step]')];
  const count = page.querySelector('#inventory-result-count');
  const view = page.querySelector('#inventory-view');
  const sortMenu = page.querySelector('.inventory-sort');
  const sortLabel = page.querySelector('#inventory-sort-label');
  const sortOptions = [...sortMenu.querySelectorAll('[data-sort]')];
  const applied = page.querySelector('.inventory-active-filters');
  const cards = page.querySelector('#inventory-cards');
  const empty = page.querySelector('.inventory-empty');
  const template = document.querySelector('#inventory-card-template');
  const number = new Intl.NumberFormat('en-US');
  const currency = value => '$' + number.format(value);
  const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const titleFor = vehicle => vehicle.title || [vehicle.make, vehicle.model, vehicle.year, vehicle.version].join(' ');

  const icons = {
    single: '<rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/>',
    multiple: '<path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z"/>',
    sort: '<path d="M3 5h12M3 12h9M3 19h9M18 5v14m-3-3 3 3 3-3"/>',
    favorite: '<path d="M20.8 5.9a5 5 0 0 0-7.1 0L12 7.6l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 22l8.8-9a5 5 0 0 0 0-7.1Z"/>',
    inquire: '<path d="M4.6 17.7 2 22l5.3-1.2A10 10 0 1 0 4.6 17.7ZM8 10h8m-8 4h5"/>'
  };
  const icon = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
  const chevron = '<img src="assets/filter-chevron.svg" width="16" height="16" alt="">';

  const types = [
    ['sedan', 'Sedan'], ['suv', 'SUV'],
    ['minivan', 'MPV', 'mpv'], ['hatchback', 'Hatchback'], ['wagon', 'Station Wagon', 'station-wagon'],
    ['convertible', 'Convertible'], ['sports-car', 'Sports Car'], ['van', 'VAN'],
    ['new-energy', 'New Energy'], ['truck', 'Truck', 'light-truck'],
    ['rv', 'RV'], ['pickup', 'Pickup'], ['tractor', 'Truck', 'heavy-truck'],
    ['bus', 'Bus'], ['other', 'Others', 'others']
  ];
  const typeLabels = new Map(types);
  const energyFuels = ['Plug-In Hybrid', 'Pure Electric', 'Range-Extended'];
  const choices = {
    seats: ['2 Seats', '4/5 Seats', '6 Seats', '7+ Seats'],
    fuel: ['Gasoline', 'Hybrid', 'Plug-In Hybrid', 'Pure Electric', 'Diesel Fuel', 'Range-Extended', 'Others', 'Natural Gas'],
    transmission: ['Manually', 'Automatic'],
    drive: ['Front-Wheel Drive', 'Rear-Wheel Drive', 'All-Wheel Drive', 'Others'],
    displacement: ['Below 1.0L', '1.0–1.6L', '1.7–2.0L', '2.1–3.0L', 'Above 3.0L']
  };
  const colors = [
    ['Black', '#000'], ['White', '#fff'], ['Silver', '#dfe1dc'], ['Gray', '#797979'],
    ['Brown', '#996916'], ['Red', '#fb5544'], ['Blue', '#66bff1'], ['Green', '#91e642'],
    ['Yellow', '#ffdb33'], ['Orange', '#f8aa27'], ['Champagne', '#f0d768'], ['Purple', '#d482ed'],
    ['Other', 'conic-gradient(#3abfe5, #446cff, #b545b7, #fa543d, #ffe070, #3abfe5)']
  ];
  const choiceLabels = {
    seats: 'Seats', fuel: 'Fuel Type', transmission: 'Transmission', drive: 'Drive Train',
    displacement: 'Displacement', color: 'Exterior Color'
  };
  const ranges = {
    price: { label: 'Price(Grand)', max: 50000, format: currency, ticks: [0, 10, 20, 30, 40] },
    mileage: { label: 'Mileage(Km)', max: 100000, format: value => number.format(value) + 'km', ticks: [0, 20, 40, 60, 80] }
  };
  const years = isUsed ? [['registrationYear', '1st Reg. Year'], ['year', 'Mod. Year']] : [['year', 'Mod. Year']];
  const latestYear = Math.max(new Date().getFullYear(), ...catalog.map(vehicle => vehicle.year));
  const yearOptions = Array.from({ length: latestYear - 1989 }, (_, index) => String(latestYear - index));
  const makeModels = ['make', 'model', 'version'];
  const favoritesKey = 'carmall24-inventory-favorites';
  let favorites = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(favoritesKey));
    if (Array.isArray(saved)) favorites = new Set(saved);
  } catch {
    // The current page can retain favorites when storage is unavailable.
  }

  const state = {
    types: new Set(),
    options: Object.fromEntries(Object.keys(choiceLabels).map(key => [key, new Set()])),
    fields: {},
    bounds: {},
    keyword: '',
    sort: 'featured',
    multiple: new URLSearchParams(location.search).get('view') === 'multiple'
  };
  const bandDefaults = key => [0, ranges[key].max];
  const sorters = {
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    'year-desc': (a, b) => b.year - a.year,
    'mileage-asc': (a, b) => a.mileage - b.mileage
  };

  function collapsibleFilter(label, content) {
    return `<details class="inventory-filter-group">
      <summary class="inventory-filter-heading"><span>${label}</span>${chevron}</summary>
      <div class="inventory-filter-content">${content}</div>
    </details>`;
  }

  function fixedFilter(label, content, { id, rangeLabel = '' } = {}) {
    const right = rangeLabel ? `<span class="inventory-range-label" aria-live="polite">${rangeLabel}</span>` : '';
    return `<section class="inventory-filter-group"${id ? ` id="${id}"` : ''}>
      <h3 class="inventory-filter-heading"><span>${label}</span>${right}</h3>
      <div class="inventory-filter-content">${content}</div>
    </section>`;
  }

  function select(name, label, placeholder = 'Any', labeled = false) {
    return `<label class="inventory-select">
      <span${labeled ? '' : ' class="visually-hidden"'}>${label}</span>
      <select name="${name}" data-placeholder="${placeholder}"></select>
    </label>`;
  }

  function band(key) {
    const { label, max, ticks } = ranges[key];
    return fixedFilter(label, `<div class="inventory-band" data-band="${key}">
      <div class="inventory-range-track">
        <input type="range" min="0" max="${max}" step="1000" value="0" data-bound="0" aria-label="Minimum ${key}">
        <input type="range" min="0" max="${max}" step="1000" value="${max}" data-bound="1" aria-label="Maximum ${key}">
      </div>
      <div class="inventory-range-ticks" aria-hidden="true">${ticks.map(tick => `<span>${tick}</span>`).join('')}<span>Any</span></div>
      ${key === 'price' ? `<div class="inventory-option-grid">${select('priceFrom', 'Minimum price', 'From')}${select('priceTo', 'Maximum price', 'To')}</div>` : ''}
    </div>`, { rangeLabel: 'Any' });
  }

  function renderControls() {
    filterForm.innerHTML = [
      fixedFilter('Make & Model', makeModels.map(key => select(key, key[0].toUpperCase() + key.slice(1), 'Any', true)).join(''), { id: 'make-model-filter' }),
      band('price'),
      ...years.map(([key, label]) => fixedFilter(label,
        `<div class="inventory-option-grid">${select(key + 'From', label + ' from', 'From')}${select(key + 'To', label + ' to', 'To')}</div>`
      )),
      isUsed ? band('mileage') : '',
      ...Object.entries(choices).map(([key, options]) => collapsibleFilter(choiceLabels[key],
        `<div class="inventory-option-grid">${options.map(value => `<button type="button" data-option="${key}" data-value="${value}" aria-pressed="false">${value}</button>`).join('')}</div>`
      )),
      collapsibleFilter(choiceLabels.color, `<div class="inventory-colors">${colors.map(([name, swatch]) =>
        `<button type="button" data-option="color" data-value="${name}" aria-pressed="false"><span style="background:${swatch}"></span>${name}</button>`
      ).join('')}</div>`)
    ].join('');

    categories.innerHTML = types.map(([key, label, photo = key]) => `<button class="inventory-type" type="button" data-type="${key}" aria-pressed="false">
      <img src="assets/inventory/categories/${photo}.png" width="64" height="43" alt="">
      <span>${label}</span>
    </button>`).join('');
    sortMenu.querySelector('summary').insertAdjacentHTML('beforeend', icon('sort', 16));
    for (const arrow of categoryArrows) arrow.innerHTML = chevron;
  }

  function setOptions(name, options) {
    const field = filterForm.elements[name];
    field.replaceChildren(new Option(field.dataset.placeholder, ''), ...options.map(([value, label]) => new Option(label, value)));
    field.value = state.fields[name] || '';
  }

  function catalogOptions(vehicles, field) {
    return [...new Set(vehicles.map(vehicle => vehicle[field]))].sort().map(value => [value, value]);
  }

  function updateMakeModelOptions() {
    const { make, model } = state.fields;
    const byMake = make ? catalog.filter(vehicle => vehicle.make === make) : catalog;
    const byModel = model ? byMake.filter(vehicle => vehicle.model === model) : byMake;
    const makes = catalogOptions(catalog, 'make');
    if (make && !makes.some(([value]) => value === make)) makes.push([make, make]);
    setOptions('make', makes);
    setOptions('model', catalogOptions(byMake, 'model'));
    setOptions('version', catalogOptions(byModel, 'version'));
  }

  function updateRange(key) {
    const { max, format } = ranges[key];
    const [low, high] = state.bounds[key] || bandDefaults(key);
    const bandControl = filterForm.querySelector('[data-band="' + key + '"]');
    const [lower, upper] = bandControl.querySelectorAll('input');
    lower.value = low;
    upper.value = high;
    lower.setAttribute('aria-valuetext', format(low));
    upper.setAttribute('aria-valuetext', high === max ? 'Any' : format(high));
    bandControl.style.setProperty('--range-start', 100 * low / max + '%');
    bandControl.style.setProperty('--range-end', 100 * high / max + '%');
    bandControl.closest('.inventory-filter-group').querySelector('.inventory-range-label').textContent =
      high < max ? format(low) + '–' + format(high) : low > 0 ? format(low) + '+' : 'Any';
    if (key === 'price') {
      filterForm.elements.priceFrom.value = low || '';
      filterForm.elements.priceTo.value = high === max ? '' : high;
    }
  }

  function matches(vehicle, terms) {
    const searchText = normalize([titleFor(vehicle), vehicle.make === 'Xiao Peng' ? 'XPeng' : '', typeLabels.get(vehicle.body), vehicle.fuel].join(' '));
    const typeMatch = !state.types.size || state.types.has(vehicle.body)
      || (state.types.has('new-energy') && energyFuels.includes(vehicle.fuel));
    return typeMatch && terms.every(term => searchText.includes(term))
      && Object.entries(state.options).every(([key, values]) => !values.size || values.has(vehicle[key]))
      && makeModels.every(key => !state.fields[key] || vehicle[key] === state.fields[key])
      && years.every(([key]) => {
        const value = key === 'year' ? vehicle.year : Number(vehicle.registration.split('.')[0]);
        const from = Number(state.fields[key + 'From']) || 0;
        const to = Number(state.fields[key + 'To']) || Infinity;
        return value >= from && value <= to;
      })
      && Object.entries(state.bounds).every(([key, [from, to]]) => {
        return vehicle[key] >= from && (to === ranges[key].max || vehicle[key] <= to);
      });
  }

  function renderCard(vehicle, index) {
    const card = template.content.firstElementChild.cloneNode(true);
    const title = titleFor(vehicle);
    const image = card.querySelector('img');
    const heading = card.querySelector('h2');
    const specs = card.querySelector('.inventory-card-specs');
    const favorite = card.querySelector('.inventory-favorite');
    const inquire = card.querySelector('.inventory-inquire');
    image.src = vehicle.photo;
    if (index >= 3) image.loading = 'lazy';
    heading.textContent = title;
    heading.title = title;
    for (const value of [vehicle.registration || String(vehicle.year), number.format(vehicle.mileage) + 'km', vehicle.fuel]) {
      const item = document.createElement('li');
      item.textContent = value;
      specs.append(item);
    }
    card.querySelector('.inventory-price strong').textContent = currency(vehicle.price);
    favorite.innerHTML = icon('favorite', 24);
    favorite.dataset.favorite = vehicle.id;
    favorite.setAttribute('aria-label', 'Save ' + title);
    favorite.setAttribute('aria-pressed', String(favorites.has(vehicle.id)));
    inquire.innerHTML = icon('inquire', 24);
    inquire.href = './index.html?vehicle=' + encodeURIComponent(title) + '#contact';
    inquire.setAttribute('aria-label', 'Inquire about ' + title);
    return card;
  }

  function updateResults() {
    const terms = normalize(state.keyword).split(/\s+/).filter(Boolean);
    const vehicles = catalog.filter(vehicle => matches(vehicle, terms));
    if (sorters[state.sort]) vehicles.sort(sorters[state.sort]);
    count.textContent = number.format(vehicles.length) + (vehicles.length === 1 ? ' RESULT' : ' RESULTS');
    cards.replaceChildren(...vehicles.map(renderCard));
    empty.hidden = vehicles.length > 0;
  }

  function clearMakeFields(key) {
    const index = makeModels.indexOf(key);
    for (const field of makeModels.slice(index)) delete state.fields[field];
  }

  function updateChips() {
    const chips = [];
    function add(label, remove) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'inventory-chip';
      button.setAttribute('aria-label', 'Remove ' + label);
      button.textContent = label;
      button.insertAdjacentHTML('beforeend', '<img src="assets/search-history-remove.svg" width="16" height="16" alt="">');
      button.addEventListener('click', () => {
        const index = chips.indexOf(button);
        remove();
        updateFilters();
        (applied.querySelectorAll('.inventory-chip')[index] || applied.lastElementChild || count).focus({ preventScroll: true });
      });
      chips.push(button);
    }
    for (const type of state.types) add(typeLabels.get(type), () => state.types.delete(type));
    if (state.keyword) add(state.keyword, () => { state.keyword = ''; });
    for (const key of makeModels) {
      if (!state.fields[key]) continue;
      add(state.fields[key], () => {
        clearMakeFields(key);
        updateMakeModelOptions();
      });
    }
    for (const [key, [from, to]] of Object.entries(state.bounds)) {
      const { max, format } = ranges[key];
      if (!from && to === max) continue;
      const text = to === max ? format(from) + '+' : format(from) + '–' + format(to);
      add(text, () => { delete state.bounds[key]; updateRange(key); });
    }
    for (const [key, label] of years) {
      const from = state.fields[key + 'From'];
      const to = state.fields[key + 'To'];
      if (!from && !to) continue;
      add(label + ': ' + (from || 'Any') + '–' + (to || 'Any'), () => {
        for (const name of [key + 'From', key + 'To']) {
          delete state.fields[name];
          filterForm.elements[name].value = '';
        }
      });
    }
    for (const [key, values] of Object.entries(state.options)) {
      for (const value of values) add(value, () => values.delete(value));
    }
    if (chips.length) {
      const clear = document.createElement('button');
      clear.className = 'inventory-clear';
      clear.type = 'button';
      clear.dataset.resetFilters = '';
      clear.setAttribute('aria-label', 'Clear all filters');
      clear.innerHTML = '<img src="assets/search-history-clear.svg" width="18" height="18" alt="">';
      chips.push(clear);
    }
    applied.replaceChildren(...chips);
    applied.hidden = chips.length === 0;
  }

  function updateFilters() {
    for (const button of categories.children) {
      button.setAttribute('aria-pressed', String(state.types.has(button.dataset.type)));
    }
    for (const button of filterForm.querySelectorAll('[data-option]')) {
      button.setAttribute('aria-pressed', String(state.options[button.dataset.option].has(button.dataset.value)));
    }
    updateChips();
    updateResults();
  }

  function resetFilters() {
    state.types.clear();
    for (const values of Object.values(state.options)) values.clear();
    state.fields = {};
    state.bounds = {};
    state.keyword = '';
    filterForm.reset();
    updateMakeModelOptions();
    updateRange('price');
    if (isUsed) updateRange('mileage');
  }

  function setBound(key, index, value) {
    const bounds = state.bounds[key] || bandDefaults(key);
    bounds[index] = index === 0 ? Math.min(value, bounds[1]) : Math.max(value, bounds[0]);
    state.bounds[key] = bounds;
    updateRange(key);
    updateFilters();
  }

  function updateView() {
    const mode = state.multiple ? 'multiple' : 'single';
    const label = state.multiple ? 'Multiple Columns' : 'Single Row';
    view.innerHTML = '<span>' + label + '</span>' + icon(mode, 16);
    view.setAttribute('aria-label', label + '. Switch to ' + (state.multiple ? 'Single Row' : 'Multiple Columns'));
    cards.dataset.view = mode;
  }

  function setMobileFilters(open) {
    filters.classList.toggle('is-open', open);
    filterToggle.setAttribute('aria-expanded', String(open));
  }

  function updateCategoryArrows() {
    const offset = categories.scrollLeft;
    categoryArrows[0].hidden = offset <= 2;
    categoryArrows[1].hidden = offset >= categories.scrollWidth - categories.clientWidth - 2;
  }

  renderControls();
  for (const [key] of years) {
    for (const suffix of ['From', 'To']) setOptions(key + suffix, yearOptions.map(year => [year, year]));
  }
  const priceOptions = Array.from({ length: 49 }, (_, index) => (index + 1) * 1000).map(value => [value, currency(value)]);
  setOptions('priceFrom', priceOptions);
  setOptions('priceTo', priceOptions);
  resetFilters();
  updateFilters();
  updateView();
  updateCategoryArrows();

  filterToggle.addEventListener('click', () => setMobileFilters(!filters.classList.contains('is-open')));
  page.addEventListener('click', event => {
    const reset = event.target.closest('[data-reset-filters]');
    if (!reset) return;
    resetFilters();
    updateFilters();
    if (!reset.getClientRects().length) count.focus({ preventScroll: true });
  });
  page.addEventListener('carmall24:inventory-filter', ({ detail: { filter, value } }) => {
    resetFilters();
    if (filter === 'brand') {
      state.fields.make = catalog.find(vehicle => normalize(vehicle.make) === normalize(value))?.make
        || (value === 'xpeng' ? 'Xiao Peng' : value[0].toUpperCase() + value.slice(1));
      updateMakeModelOptions();
    } else if (filter === 'type' && typeLabels.has(value)) {
      state.types.add(value);
    } else if (filter === 'budget') {
      const [from, to] = value.includes('-') ? value.split('-') : ['', value];
      state.bounds.price = [Number(from) || 0, Number(to) || ranges.price.max];
      updateRange('price');
    } else {
      state.keyword = value;
    }
    updateFilters();
    count.focus({ preventScroll: true });
    count.scrollIntoView({ block: 'nearest' });
  });

  document.querySelector('.makes-view-all[href="#make-model-filter"]').addEventListener('click', () => {
    setMobileFilters(true);
    requestAnimationFrame(() => filterForm.elements.make.focus({ preventScroll: true }));
  });

  filterForm.addEventListener('click', event => {
    const button = event.target.closest('[data-option]');
    if (!button) return;
    const values = state.options[button.dataset.option];
    if (!values.delete(button.dataset.value)) values.add(button.dataset.value);
    updateFilters();
  });
  filterForm.addEventListener('input', event => {
    if (event.target.type !== 'range') return;
    setBound(event.target.closest('[data-band]').dataset.band, Number(event.target.dataset.bound), event.target.valueAsNumber);
  });
  filterForm.addEventListener('change', ({ target: field }) => {
    if (field.tagName !== 'SELECT') return;
    const { name, value } = field;
    if (name.startsWith('price')) {
      const index = name === 'priceFrom' ? 0 : 1;
      setBound('price', index, value ? Number(value) : bandDefaults('price')[index]);
      return;
    }
    if (makeModels.includes(name)) clearMakeFields(name);
    state.fields[name] = value;
    if (makeModels.includes(name)) updateMakeModelOptions();
    const range = years.find(([key]) => name.startsWith(key));
    if (range) {
      const from = range[0] + 'From';
      const to = range[0] + 'To';
      if (state.fields[from] && state.fields[to] && Number(state.fields[from]) > Number(state.fields[to])) {
        const other = name === from ? to : from;
        state.fields[other] = value;
        filterForm.elements[other].value = value;
      }
    }
    updateFilters();
  });
  filterForm.addEventListener('submit', event => event.preventDefault());

  categories.addEventListener('click', event => {
    const button = event.target.closest('[data-type]');
    if (!button) return;
    if (!state.types.delete(button.dataset.type)) state.types.add(button.dataset.type);
    updateFilters();
  });
  for (const arrow of categoryArrows) arrow.addEventListener('click', () => {
    categories.scrollBy({
      left: 396 * Number(arrow.dataset.categoryStep),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    });
  });
  categories.addEventListener('scroll', updateCategoryArrows, { passive: true });
  new ResizeObserver(updateCategoryArrows).observe(categories);

  view.addEventListener('click', () => {
    state.multiple = !state.multiple;
    updateView();
  });
  for (const option of sortOptions) option.addEventListener('click', () => {
    state.sort = option.dataset.sort;
    for (const button of sortOptions) button.setAttribute('aria-pressed', String(button === option));
    sortLabel.textContent = state.sort === 'featured' ? 'Sort By' : option.textContent;
    sortMenu.open = false;
    sortMenu.querySelector('summary').focus({ preventScroll: true });
    updateResults();
  });
  document.addEventListener('click', event => {
    if (!sortMenu.contains(event.target)) sortMenu.open = false;
  });
  sortMenu.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !sortMenu.open) return;
    sortMenu.open = false;
    sortMenu.querySelector('summary').focus({ preventScroll: true });
  });
  cards.addEventListener('click', event => {
    const button = event.target.closest('[data-favorite]');
    if (!button) return;
    const id = button.dataset.favorite;
    if (!favorites.delete(id)) favorites.add(id);
    button.setAttribute('aria-pressed', String(favorites.has(id)));
    try {
      localStorage.setItem(favoritesKey, JSON.stringify([...favorites]));
    } catch {
      // The toggle still works without browser storage.
    }
  });
})();
