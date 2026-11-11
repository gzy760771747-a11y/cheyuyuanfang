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

  function applyFilters() {
    const filters = new FormData(searchForm);
    const brand = filters.get('brand');
    const type = filters.get('type');
    const budget = Number(filters.get('budget'));
    let visibleCount = 0;

    vehicleCards.forEach(card => {
      const match = (!brand || card.dataset.brand === brand)
        && (!type || card.dataset.type === type)
        && (!budget || Number(card.dataset.price) <= budget);
      card.hidden = !match;
      visibleCount += Number(match);
    });
    chips.forEach(chip => {
      chip.setAttribute('aria-pressed', String(filters.get(chip.dataset.filter) === chip.dataset.value));
    });

    filterFeedback.hidden = !(brand || type || budget);
    vehicleGrid.hidden = visibleCount === 0;
    filterStatus.textContent = visibleCount
      ? 'Showing ' + visibleCount + ' matching vehicles in this preview.'
      : 'No vehicles in this preview match these filters.';
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

  function setNavigation(open) {
    navigation.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
  }

  menuToggle.addEventListener('click', () => {
    setNavigation(menuToggle.getAttribute('aria-expanded') === 'false');
  });

  document.addEventListener('click', event => {
    const target = event.target;
    menus.forEach(menu => {
      if (!menu.contains(target) || target.closest('.menu-panel a')) menu.open = false;
    });
    if (!header.contains(target) || target.closest('.main-nav a')) setNavigation(false);
  });

  header.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const openMenu = menus.find(menu => menu.open);
    if (openMenu) {
      openMenu.open = false;
      openMenu.querySelector('summary').focus();
    } else if (navigation.classList.contains('is-open')) {
      setNavigation(false);
      menuToggle.focus();
    }
  });

  document.querySelector('.header-search').addEventListener('click', event => {
    event.preventDefault();
    searchForm.elements.namedItem('brand').focus({ preventScroll: true });
    searchForm.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
  });

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
