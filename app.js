(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => reducedMotion.matches ? 'instant' : 'smooth';

  // Reuse the design's sample cards, with an extra news card for scrolling on desktop.
  document.querySelectorAll('[data-card-count]').forEach(grid => {
    const card = grid.firstElementChild;
    for (let index = 1; index < Number(grid.dataset.cardCount); index += 1) {
      grid.append(card.cloneNode(true));
    }
  });

  const searchForm = document.querySelector('#vehicle-search');
  const vehicleTitle = document.querySelector('#vehicles-title');
  const vehicleCards = document.querySelectorAll('.vehicle-card');
  const vehicleGrid = document.querySelector('.vehicle-grid');
  const filterFeedback = document.querySelector('.filter-feedback');
  const filterStatus = document.querySelector('#filter-status');
  const chips = document.querySelectorAll('.chips button[aria-pressed]');

  function applyFilters(keyword = '') {
    const filters = new FormData(searchForm);
    const brand = filters.get('brand');
    const type = filters.get('type');
    const budget = filters.get('budget') ?? '';
    const [minPrice, maxPrice] = budget.includes('-') ? budget.split('-').map(Number) : [0, Number(budget)];
    const terms = normalizeSearch(keyword).split(/\s+/).filter(Boolean);
    let visibleCount = 0;

    vehicleCards.forEach(card => {
      const name = terms.length ? normalizeSearch(card.querySelector('.vehicle-title').textContent) : '';
      const price = Number(card.dataset.price);
      const matchesBudget = !budget || (maxPrice ? price >= minPrice && price <= maxPrice : price > minPrice);
      const match = (!brand || card.dataset.brand === brand)
        && (!type || card.dataset.type === type)
        && matchesBudget
        && terms.every(term => name.includes(term));
      card.hidden = !match;
      visibleCount += Number(match);
    });
    chips.forEach(chip => {
      chip.setAttribute('aria-pressed', String(filters.get(chip.dataset.filter) === chip.dataset.value));
    });

    filterFeedback.hidden = !(brand || type || budget || terms.length);
    vehicleGrid.hidden = visibleCount === 0;
    filterStatus.textContent = visibleCount
      ? 'Showing ' + visibleCount + ' matching vehicles in this preview' + (keyword ? ' for “' + keyword + '”.' : '.')
      : 'No vehicles in this preview match ' + (keyword ? '“' + keyword + '”.' : 'these filters.');
    vehicleTitle.focus({ preventScroll: true });
    vehicleTitle.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  }

  searchForm.addEventListener('submit', event => {
    event.preventDefault();
    applyFilters();
  });

  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.filter === 'all') {
        searchForm.reset();
      } else {
        const select = searchForm.elements.namedItem(button.dataset.filter);
        select.value = select.value === button.dataset.value ? '' : button.dataset.value;
      }
      applyFilters();
    });
  });

  const header = document.querySelector('.site-header');
  const navigation = document.querySelector('#main-navigation');
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const menus = [...header.querySelectorAll('details')];
  const makesMenu = header.querySelector('.makes-menu');
  const makesTrigger = makesMenu.querySelector('.makes-trigger');
  const makesPanel = makesMenu.querySelector('.makes-panel');
  let makesCloseTimer;

  function setMakesPanel(open) {
    clearTimeout(makesCloseTimer);
    if (open === !makesPanel.hidden) return;
    makesPanel.hidden = !open;
    makesTrigger.setAttribute('aria-expanded', String(open));
    if (open) {
      menus.forEach(menu => { menu.open = false; });
      makesPanel.scrollTop = 0;
    }
  }

  function setNavigation(open) {
    navigation.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    if (!open) setMakesPanel(false);
  }

  matchMedia('(max-width: 1360px)').addEventListener('change', () => setNavigation(false));

  makesTrigger.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') setMakesPanel(true);
  });

  makesMenu.addEventListener('pointerenter', () => clearTimeout(makesCloseTimer));

  makesMenu.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'mouse' || makesPanel.hidden) return;
    // Keep the list open while the pointer crosses the header into the panel.
    makesCloseTimer = setTimeout(() => {
      if (!makesMenu.querySelector(':focus-visible')) setMakesPanel(false);
    }, 180);
  });

  makesTrigger.addEventListener('click', () => setMakesPanel(makesPanel.hidden));

  makesMenu.addEventListener('focusout', event => {
    if (event.relatedTarget && !makesMenu.contains(event.relatedTarget)) setMakesPanel(false);
  });

  makesPanel.querySelectorAll('[data-makes-filter]').forEach(list => {
    const select = searchForm.elements.namedItem(list.dataset.makesFilter);
    if (!select) return;
    list.querySelectorAll('button[data-value]').forEach(button => {
      const value = button.dataset.value;
      if (![...select.options].some(option => option.value === value)) {
        select.add(new Option(button.textContent, value));
      }
    });
  });

  makesPanel.addEventListener('click', event => {
    const button = event.target.closest('button[data-value]');
    if (!button) return;
    const filter = button.closest('[data-makes-filter]').dataset.makesFilter;
    const select = searchForm.elements.namedItem(filter);
    searchForm.reset();
    if (select) select.value = button.dataset.value;
    setNavigation(false);
    applyFilters(filter === 'model' ? button.dataset.value : '');
  });

  menuToggle.addEventListener('click', () => {
    setNavigation(menuToggle.getAttribute('aria-expanded') === 'false');
  });

  document.addEventListener('click', event => {
    const target = event.target;
    menus.forEach(menu => {
      if (!menu.contains(target) || target.closest('.menu-panel a')) menu.open = false;
    });
    if (!header.contains(target) || target === header || target.closest('.main-nav a')) {
      setNavigation(false);
    } else if (!makesMenu.contains(target)) {
      setMakesPanel(false);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!makesPanel.hidden) {
      if (makesMenu.contains(document.activeElement)) makesTrigger.focus({ preventScroll: true });
      setMakesPanel(false);
      return;
    }
    if (!header.contains(event.target)) return;
    const openMenu = menus.find(menu => menu.open);
    if (openMenu) {
      openMenu.open = false;
      openMenu.querySelector('summary').focus();
    } else if (navigation.classList.contains('is-open')) {
      setNavigation(false);
      menuToggle.focus();
    }
  });

  header.querySelectorAll('a[href="#vehicle-search"]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      setNavigation(false);
      searchForm.elements.namedItem('brand').focus({ preventScroll: true });
      searchForm.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
    });
  });

  const headerSearchDialog = document.querySelector('#header-search-dialog');
  const headerSearchTriggers = [...header.querySelectorAll('[aria-controls="header-search-dialog"]')];
  const headerSearchForm = document.querySelector('#header-search-form');
  const headerSearchInput = document.querySelector('#header-search-input');
  const historyItems = document.querySelector('#search-history-items');
  const historyToggle = document.querySelector('#search-history-toggle');
  const historyEmpty = document.querySelector('#search-history-empty');
  const historyClear = document.querySelector('#search-history-clear');
  const recommendations = document.querySelector('#search-recommendations');
  const recommendationGroups = [
    ['GAC Trumpchi', 'Volkswagen', 'Geely Auto', 'Roewe', 'Hyundai', 'Beijing Auto', 'Great Wall', "Chang'an"],
    ['Toyota', 'BYD', 'Xiao Peng', 'NIO', 'RAV4', 'Chery', 'MG', 'Jetour']
  ];
  const searchHistoryKey = 'carmall24-search-history';
  const historyLimit = 20;
  const collapsedHistoryCount = 3;
  let searchHistory = [
    'Volkswagen Passat Lingyu', 'Jetour X70', '帕萨特', 'rav4', 'rav4', '名爵2025',
    'mg', 'byd sealion', '2027', 'byd dolphin', '荣威', '卡罗拉', '理想'
  ];
  let historyExpanded = true;
  let recommendationGroup = 0;
  let activeSearchTrigger = headerSearchTriggers[0];

  try {
    const savedHistory = JSON.parse(localStorage.getItem(searchHistoryKey));
    if (Array.isArray(savedHistory)) {
      searchHistory = savedHistory
        .filter(query => typeof query === 'string' && query.trim())
        .slice(0, historyLimit)
        .map(query => query.trim().slice(0, headerSearchInput.maxLength));
    }
  } catch {
    // The panel also works when browser storage is unavailable.
  }

  function saveSearchHistory(queries) {
    searchHistory = queries;
    try {
      localStorage.setItem(searchHistoryKey, JSON.stringify(queries));
    } catch {
      // Keep the history for the current page session.
    }
  }

  function searchVehicles(query) {
    const keyword = query.trim();
    if (!keyword) {
      headerSearchInput.focus();
      return;
    }
    const previousSearches = searchHistory.filter(item => normalizeSearch(item) !== normalizeSearch(keyword));
    saveSearchHistory([keyword, ...previousSearches].slice(0, historyLimit));
    headerSearchDialog.close('search');
    searchForm.reset();
    applyFilters(keyword);
  }

  function renderSearchHistory() {
    const visibleHistory = historyExpanded ? searchHistory : searchHistory.slice(0, collapsedHistoryCount);
    historyItems.replaceChildren(...visibleHistory.map((query, index) => {
      const chip = document.createElement('div');
      chip.className = 'search-history-chip';
      const search = document.createElement('button');
      search.type = 'button';
      search.className = 'search-history-query';
      search.textContent = query;
      search.title = query;
      search.addEventListener('click', () => searchVehicles(query));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'search-history-remove';
      remove.setAttribute('aria-label', 'Remove “' + query + '” from search history');
      remove.addEventListener('click', () => {
        saveSearchHistory(searchHistory.filter((_, itemIndex) => itemIndex !== index));
        renderSearchHistory();
        const buttons = historyItems.querySelectorAll('.search-history-remove');
        (buttons[Math.min(index, buttons.length - 1)] ?? headerSearchInput).focus({ preventScroll: true });
      });
      chip.append(search, remove);
      return chip;
    }));
    historyClear.disabled = searchHistory.length === 0;
    historyEmpty.hidden = searchHistory.length > 0;
    historyToggle.hidden = searchHistory.length <= collapsedHistoryCount;
    historyToggle.setAttribute('aria-expanded', String(historyExpanded));
    historyToggle.setAttribute('aria-label', historyExpanded ? 'Collapse search history' : 'Expand search history');
  }

  function renderRecommendations() {
    recommendations.replaceChildren(...recommendationGroups[recommendationGroup].map(query => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = query;
      button.addEventListener('click', () => searchVehicles(query));
      return button;
    }));
  }

  headerSearchTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      activeSearchTrigger = trigger;
      setNavigation(false);
      headerSearchInput.value = '';
      historyExpanded = true;
      renderSearchHistory();
      renderRecommendations();
      headerSearchDialog.returnValue = '';
      headerSearchDialog.showModal();
      headerSearchDialog.scrollTop = 0;
      trigger.setAttribute('aria-expanded', 'true');
    });
  });

  headerSearchForm.addEventListener('submit', event => {
    event.preventDefault();
    searchVehicles(headerSearchInput.value);
  });
  historyToggle.addEventListener('click', () => {
    historyExpanded = !historyExpanded;
    renderSearchHistory();
  });
  historyClear.addEventListener('click', () => {
    saveSearchHistory([]);
    renderSearchHistory();
    headerSearchInput.focus({ preventScroll: true });
  });
  document.querySelector('#search-recommendations-refresh').addEventListener('click', () => {
    recommendationGroup = (recommendationGroup + 1) % recommendationGroups.length;
    renderRecommendations();
  });
  headerSearchDialog.querySelector('.header-search-cancel').addEventListener('click', () => headerSearchDialog.close());
  headerSearchDialog.addEventListener('click', event => {
    if (event.target === headerSearchDialog) headerSearchDialog.close();
  });
  headerSearchDialog.addEventListener('close', () => {
    activeSearchTrigger.setAttribute('aria-expanded', 'false');
    if (headerSearchDialog.returnValue === 'search') return;
    const focusTarget = [activeSearchTrigger, ...headerSearchTriggers, menuToggle].find(button => button.getClientRects().length > 0);
    focusTarget?.focus({ preventScroll: true });
  });

  const countryGroups = {
    Africa: [
      ['DZ', 'Algeria'], ['AO', 'Angola'], ['CM', 'Cameroon'], ['CI', 'Côte d’Ivoire'],
      ['CD', 'DR Congo'], ['EG', 'Egypt'], ['ET', 'Ethiopia'], ['GH', 'Ghana'], ['KE', 'Kenya'],
      ['MA', 'Morocco'], ['NG', 'Nigeria'], ['RW', 'Rwanda'], ['SN', 'Senegal'],
      ['ZA', 'South Africa'], ['TZ', 'Tanzania'], ['UG', 'Uganda'], ['ZM', 'Zambia'], ['ZW', 'Zimbabwe']
    ],
    Asia: [
      ['BH', 'Bahrain'], ['KH', 'Cambodia'], ['CN', 'China'], ['GE', 'Georgia'], ['JP', 'Japan'],
      ['KZ', 'Kazakhstan'], ['KW', 'Kuwait'], ['LA', 'Laos'], ['MY', 'Malaysia'], ['MN', 'Mongolia'],
      ['NP', 'Nepal'], ['OM', 'Oman'], ['PK', 'Pakistan'], ['QA', 'Qatar'], ['SA', 'Saudi Arabia'],
      ['AE', 'United Arab Emirates'], ['UZ', 'Uzbekistan'], ['VN', 'Vietnam']
    ],
    Europe: [
      ['BE', 'Belgium'], ['FR', 'France'], ['DE', 'Germany'], ['NL', 'Netherlands'],
      ['PL', 'Poland'], ['RU', 'Russia'], ['ES', 'Spain'], ['GB', 'United Kingdom']
    ],
    'North America': [['CA', 'Canada'], ['MX', 'Mexico'], ['US', 'United States']],
    'South America': [['AR', 'Argentina'], ['BR', 'Brazil'], ['CL', 'Chile'], ['CO', 'Colombia'], ['PE', 'Peru']],
    Oceania: [['AU', 'Australia'], ['FJ', 'Fiji'], ['NZ', 'New Zealand']]
  };

  // Sample markets for the regional settings preview.
  const regionalCountries = [
    { code: 'global', name: 'Global', continent: '' },
    ...Object.entries(countryGroups)
      .flatMap(([continent, countries]) => countries.map(([code, name]) => ({ code, name, continent })))
      .sort((first, second) => first.name.localeCompare(second.name, 'en'))
  ];
  const countriesByCode = new Map(regionalCountries.map(country => [country.code, country]));
  const localeDialog = document.querySelector('#regional-settings');
  const localeTrigger = document.querySelector('.locale-trigger');
  const siteRegionIcon = document.querySelector('#site-region-icon');
  const siteRegionName = document.querySelector('#site-region-name');
  const siteLanguageName = document.querySelector('#site-language-name');
  const localeSearch = document.querySelector('#locale-country-search');
  const countryCount = document.querySelector('#locale-country-count');
  const countryGrid = document.querySelector('#locale-country-options');
  const countryScroll = countryGrid.parentElement;
  const noCountries = document.querySelector('#locale-no-results');
  const continentButtons = [...localeDialog.querySelectorAll('[data-continent]')];
  const languageButtons = [...localeDialog.querySelectorAll('[data-language]')];
  const languages = new Map(languageButtons.map(button => [button.dataset.language, button.textContent.trim()]));
  const settingsKey = 'carmall24-regional-settings';
  let savedSettings = { country: 'global', language: 'en' };
  let draftSettings = { ...savedSettings };
  let activeContinent = 'All';

  try {
    const storedSettings = JSON.parse(localStorage.getItem(settingsKey));
    if (countriesByCode.has(storedSettings?.country)) savedSettings.country = storedSettings.country;
    if (languages.has(storedSettings?.language)) savedSettings.language = storedSettings.language;
  } catch {
    // The preview also works when browser storage is unavailable.
  }

  function updateLocaleTrigger() {
    const country = countriesByCode.get(savedSettings.country);
    const languageName = languages.get(savedSettings.language);
    siteRegionIcon.replaceChildren(createCountryFlag(country.code, 'assets/globe.svg'));
    siteRegionName.textContent = country.code === 'global' ? country.name : country.code;
    siteLanguageName.textContent = languageName;
    siteLanguageName.lang = savedSettings.language;
    localeTrigger.setAttribute('aria-label', 'Regional settings, ' + country.name + ', ' + languageName);
  }

  function updateLocaleSelections() {
    localeDialog.querySelectorAll('[data-country]').forEach(option => {
      option.setAttribute('aria-pressed', String(option.dataset.country === draftSettings.country));
    });
    languageButtons.forEach(option => {
      option.setAttribute('aria-pressed', String(option.dataset.language === draftSettings.language));
    });
  }

  function createCountryFlag(code, globeImage = 'assets/regional-globe.svg') {
    const imagePath = { global: globeImage, GH: 'assets/regional-ghana.png' }[code];
    const flag = document.createElement(imagePath ? 'img' : 'span');
    if (imagePath) {
      flag.src = imagePath;
      flag.alt = '';
      if (code === 'GH') {
        flag.width = 20;
        flag.height = 13;
      }
    } else {
      flag.className = 'locale-flag';
      flag.setAttribute('aria-hidden', 'true');
      flag.textContent = String.fromCodePoint(...[...code].map(letter => letter.charCodeAt(0) + 127397));
    }
    return flag;
  }

  function createCountryButton(country) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'locale-option';
    button.dataset.country = country.code;
    button.title = country.name;
    const name = document.createElement('span');
    name.className = 'locale-option-name';
    name.textContent = country.name;
    button.append(createCountryFlag(country.code), name);
    button.addEventListener('click', () => {
      draftSettings.country = country.code;
      updateLocaleSelections();
    });
    return button;
  }

  function setCurrentLetter(letter) {
    letterButtons.forEach(button => {
      button.setAttribute('aria-current', String(button.textContent === letter));
    });
  }

  const letters = [...new Set(regionalCountries.slice(1).map(country => country.name[0]))];
  const letterButtons = letters.map(letter => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = letter;
    button.setAttribute('aria-label', 'Go to countries beginning with ' + letter);
    button.addEventListener('click', () => {
      const first = [...countryGrid.children].find(option => {
        const country = countriesByCode.get(option.dataset.country);
        return country.code !== 'global' && country.name.startsWith(letter);
      });
      if (!first) return;
      setCurrentLetter(letter);
      const top = first.getBoundingClientRect().top - countryScroll.getBoundingClientRect().top;
      countryScroll.scrollTo({ top: countryScroll.scrollTop + top, behavior: scrollBehavior() });
    });
    return button;
  });
  document.querySelector('#locale-letters').append(...letterButtons);
  document.querySelector('#locale-popular-options').append(
    ...['global', 'GH', 'DZ', 'GE', 'NG', 'KE'].map(code => createCountryButton(countriesByCode.get(code)))
  );

  function normalizeSearch(text) {
    return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  }

  function renderCountryDirectory() {
    const query = normalizeSearch(localeSearch.value.trim());
    const matchingCountries = regionalCountries.filter(country => {
      const matchesContinent = activeContinent === 'All' || country.continent === activeContinent;
      return matchesContinent && (normalizeSearch(country.name).includes(query) || country.code.toLowerCase() === query);
    });
    countryGrid.replaceChildren(...matchingCountries.map(createCountryButton));
    countryCount.textContent = matchingCountries.length + (matchingCountries.length === 1 ? ' Country / Region' : ' Countries / Regions');
    noCountries.hidden = matchingCountries.length > 0;
    continentButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.continent === activeContinent));
    });
    const availableLetters = new Set(matchingCountries.filter(country => country.code !== 'global').map(country => country.name[0]));
    letterButtons.forEach(button => {
      button.disabled = !availableLetters.has(button.textContent);
    });
    setCurrentLetter(availableLetters.values().next().value);
    countryScroll.scrollTop = 0;
    updateLocaleSelections();
  }

  localeSearch.addEventListener('input', renderCountryDirectory);
  continentButtons.forEach(button => {
    button.addEventListener('click', () => {
      activeContinent = button.dataset.continent;
      renderCountryDirectory();
    });
  });
  languageButtons.forEach(button => {
    button.addEventListener('click', () => {
      draftSettings.language = button.dataset.language;
      updateLocaleSelections();
    });
  });

  localeTrigger.addEventListener('click', () => {
    draftSettings = { ...savedSettings };
    activeContinent = 'All';
    localeSearch.value = '';
    setNavigation(false);
    localeDialog.showModal();
    localeTrigger.setAttribute('aria-expanded', 'true');
    renderCountryDirectory();
    localeDialog.querySelector('.locale-dialog-content').scrollTop = 0;
  });

  localeDialog.querySelector('.locale-apply').addEventListener('click', () => {
    savedSettings = { ...draftSettings };
    try {
      localStorage.setItem(settingsKey, JSON.stringify(savedSettings));
    } catch {
      // Keep the selected preferences for the current page session.
    }
    updateLocaleTrigger();
    localeDialog.close();
  });

  localeDialog.querySelectorAll('[data-locale-close]').forEach(button => {
    button.addEventListener('click', () => localeDialog.close());
  });
  localeDialog.addEventListener('click', event => {
    if (event.target === localeDialog) localeDialog.close();
  });
  localeDialog.addEventListener('close', () => {
    localeTrigger.setAttribute('aria-expanded', 'false');
    localeTrigger.focus({ preventScroll: true });
  });
  updateLocaleTrigger();

  const vehicleDialog = document.querySelector('#vehicle-dialog');
  vehicleGrid.addEventListener('click', event => {
    if (!event.target.closest('.vehicle-link') || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (typeof vehicleDialog.showModal !== 'function') return;
    event.preventDefault();
    vehicleDialog.showModal();
  });
  vehicleDialog.querySelector('a').addEventListener('click', () => vehicleDialog.close());
  vehicleDialog.addEventListener('click', event => {
    if (event.target === vehicleDialog) vehicleDialog.close();
  });

  const newsTrack = document.querySelector('#news-track');
  const newsStatus = document.querySelector('#news-status');
  const previousNews = document.querySelector('.news-arrow-prev');
  const nextNews = document.querySelector('.news-arrow-next');

  function updateNewsArrows() {
    const lastOffset = newsTrack.scrollWidth - newsTrack.clientWidth;
    previousNews.disabled = newsTrack.scrollLeft <= 1;
    nextNews.disabled = newsTrack.scrollLeft >= lastOffset - 1;
  }

  function moveNews(direction) {
    const lastOffset = newsTrack.scrollWidth - newsTrack.clientWidth;
    const firstLeft = newsTrack.firstElementChild.getBoundingClientRect().left;
    const stops = Array.from(newsTrack.children, card => {
      return Math.min(lastOffset, card.getBoundingClientRect().left - firstLeft);
    });
    const currentOffset = newsTrack.scrollLeft;
    const targetOffset = direction > 0
      ? stops.find(offset => offset > currentOffset + 1)
      : stops.findLast(offset => offset < currentOffset - 1);

    if (targetOffset === undefined) return;
    newsTrack.scrollTo({ left: targetOffset, behavior: scrollBehavior() });
    newsStatus.textContent = 'Showing news from item ' + (stops.indexOf(targetOffset) + 1) + ' of ' + stops.length + '.';
  }

  previousNews.addEventListener('click', () => moveNews(-1));
  nextNews.addEventListener('click', () => moveNews(1));
  newsTrack.addEventListener('scroll', updateNewsArrows, { passive: true });
  new ResizeObserver(updateNewsArrows).observe(newsTrack);
  updateNewsArrows();

  const contactForm = document.querySelector('#contact-form');
  const emailDraft = document.querySelector('#email-draft');
  const formStatus = document.querySelector('.form-status');

  contactForm.addEventListener('submit', event => {
    event.preventDefault();
    const inquiry = new FormData(contactForm);
    const message = [
      'Name: ' + inquiry.get('name').trim(),
      'Email: ' + inquiry.get('email').trim(),
      'State/Province: ' + inquiry.get('province').trim(),
      'WhatsApp: ' + inquiry.get('whatsapp').trim(),
      '',
      inquiry.get('message').trim()
    ].join('\r\n');
    emailDraft.href = 'mailto:service@carmall24.com?subject=Vehicle%20inquiry&body=' + encodeURIComponent(message);
    formStatus.hidden = false;
  });

  contactForm.addEventListener('input', () => {
    formStatus.hidden = true;
  });
})();
