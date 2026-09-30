const { Modal, Offcanvas } = window.bootstrap;
const L = window.L;

const mapElement = document.querySelector('#vehicle-map');
const trainList = document.querySelector('#live-train-list');
const searchInput = document.querySelector('#live-search');
const refreshButton = document.querySelector('#refresh-trains');
const errorBox = document.querySelector('#map-error');
const sourceBadge = document.querySelector('#data-source');
const lastUpdate = document.querySelector('#last-update');

const statTotal = document.querySelector('#stat-total');
const statGps = document.querySelector('#stat-gps');
const statEstimated = document.querySelector('#stat-estimated');
const routePanelElement = document.querySelector('#route-panel');
const routeTitle = document.querySelector('#route-panel-title');
const routeLoading = document.querySelector('#route-loading');
const routeError = document.querySelector('#route-error');
const routeContent = document.querySelector('#route-content');
const routeNumber = document.querySelector('#route-number');
const routeOrigin = document.querySelector('#route-origin');
const routeDestination = document.querySelector('#route-destination');
const routeSource = document.querySelector('#route-source');
const routeStops = document.querySelector('#route-stops');
const stationDataElement = document.querySelector('#station-data');
const defaultStationElement = document.querySelector('#default-station');
const departureForm = document.querySelector('#departure-station-form');
const departureInput = document.querySelector('#departure-station');
const departureList = document.querySelector('#departure-list');
const departureLabel = document.querySelector('#departure-station-label');
const departureSource = document.querySelector('#departure-source');
const connectionForm = document.querySelector('#connection-form');
const connectionFrom = document.querySelector('#connection-from');
const connectionTo = document.querySelector('#connection-to');
const connectionDate = document.querySelector('#connection-date');
const connectionTime = document.querySelector('#connection-time');
const connectionSubmit = document.querySelector('#connection-submit');
const connectionResults = document.querySelector('#connection-results');
const swapStations = document.querySelector('#swap-stations');
const noticesModalElement = document.querySelector('#notices-modal');
const noticeDataElement = document.querySelector('#notice-data');
const myJourneyEmpty = document.querySelector('#my-journey-empty');
const myJourneyContent = document.querySelector('#my-journey-content');
const removeJourneyButton = document.querySelector('#remove-journey');
const savedJourneyBadge = document.querySelector('#saved-journey-badge');
const journeyState = document.querySelector('#journey-state');
const journeyFrom = document.querySelector('#journey-from');
const journeyTo = document.querySelector('#journey-to');
const journeyDate = document.querySelector('#journey-date');
const journeyTimes = document.querySelector('#journey-times');
const journeyDuration = document.querySelector('#journey-duration');
const journeyCountdown = document.querySelector('#journey-countdown');
const journeyLiveState = document.querySelector('#journey-live-state');
const journeyLegs = document.querySelector('#journey-legs');
const journeyNotices = document.querySelector('#journey-notices');
const nearestStationButton = document.querySelector('#nearest-station');
const deleteNoticeModalElement = document.querySelector('#delete-notice-modal');
const deleteNoticeId = document.querySelector('#delete-notice-id');
const deleteNoticeName = document.querySelector('#delete-notice-name');
const deleteNoticeForm = document.querySelector('#delete-notice-form');
const generateTrainNoticeButton = document.querySelector('#generate-train-notice');
const templateKind = document.querySelector('#template-kind');
const adminDataHealth = document.querySelector('#admin-data-health');
const refreshAdminHealth = document.querySelector('#refresh-admin-health');

let stations = [];
let defaultStation = null;
let notices = [];
try {
  stations = JSON.parse(stationDataElement?.textContent || '[]');
  defaultStation = JSON.parse(defaultStationElement?.textContent || 'null');
  notices = JSON.parse(noticeDataElement?.textContent || '[]');
} catch { /* dane stacji są dostępne tylko na stronie głównej */ }
const stationsByName = new Map(stations.map((station) => [String(station.name).toLocaleLowerCase('pl-PL'), station]));

let trains = [];
let hasFocusedLiveData = false;
let loading = false;
let currentDepartures = [];
let savedJourney = null;
try { savedJourney = JSON.parse(localStorage.getItem('kw_saved_journey') || 'null'); } catch { /* zapis podróży jest opcjonalny */ }

const map = mapElement
  ? L.map(mapElement, { scrollWheelZoom: false, zoomControl: false }).setView([52.4064, 16.9252], 8)
  : null;
const markerLayer = map ? L.layerGroup().addTo(map) : null;
const routeLayer = map ? L.layerGroup().addTo(map) : null;
const markers = new Map();

if (map) {
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map);
}

function markerIcon(train) {
  const state = train.source === 'estimated' ? ' is-estimated' : train.stale ? ' is-stale' : train.delay > 0 ? ' is-delayed' : '';
  return L.divIcon({
    className: 'kw-marker-wrap',
    html: `<span class="kw-marker${state}"><b>KW</b>${escapeHtml(train.number)}</span>`,
    iconSize: [86, 30],
    iconAnchor: [43, 15]
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function resolveStation(value) {
  return stationsByName.get(String(value || '').trim().toLocaleLowerCase('pl-PL')) || null;
}

function initializeStationAutocomplete(input) {
  const panel = document.querySelector(`#${CSS.escape(input.getAttribute('aria-controls') || '')}`);
  if (!panel) return;
  let matches = [];
  let activeIndex = -1;

  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pl-PL').trim();
  const close = () => {
    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;
  };
  const choose = (station) => {
    input.value = station.name;
    input.setCustomValidity('');
    close();
    input.focus();
  };
  const highlight = (nextIndex) => {
    const options = [...panel.querySelectorAll('.station-suggestion')];
    if (!options.length) return;
    activeIndex = (nextIndex + options.length) % options.length;
    options.forEach((option, index) => option.classList.toggle('is-active', index === activeIndex));
    input.setAttribute('aria-activedescendant', options[activeIndex].id);
    options[activeIndex].scrollIntoView({ block: 'nearest' });
  };
  const render = (rawQuery = '') => {
    const query = normalize(rawQuery);
    const ranked = [...stations].sort((left, right) => {
      if (!query) return Number(right.services || 0) - Number(left.services || 0) || left.name.localeCompare(right.name, 'pl');
      const leftName = normalize(left.name);
      const rightName = normalize(right.name);
      const leftRank = leftName.startsWith(query) ? 0 : leftName.split(/\s+/).some((part) => part.startsWith(query)) ? 1 : 2;
      const rightRank = rightName.startsWith(query) ? 0 : rightName.split(/\s+/).some((part) => part.startsWith(query)) ? 1 : 2;
      return leftRank - rightRank || left.name.localeCompare(right.name, 'pl');
    });
    matches = ranked.filter((station) => !query || normalize(station.name).includes(query)).slice(0, 8);
    activeIndex = -1;
    panel.replaceChildren();

    const hint = document.createElement('div');
    hint.className = 'station-suggestions__hint';
    hint.textContent = query ? 'Pasujące stacje' : 'Popularne stacje';
    panel.append(hint);
    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'station-suggestions__empty';
      empty.textContent = 'Nie znaleziono stacji. Spróbuj wpisać inną nazwę.';
      panel.append(empty);
    }
    matches.forEach((station, index) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'station-suggestion';
      option.id = `${input.id}-option-${index}`;
      option.setAttribute('role', 'option');
      option.innerHTML = `<span class="station-suggestion__icon"><i class="bi bi-signpost-2" aria-hidden="true"></i></span><span class="station-suggestion__name"><strong>${escapeHtml(station.name)}</strong><small>${escapeHtml(station.services || 0)} kursów KW w bazie</small></span><i class="bi bi-arrow-return-left text-secondary" aria-hidden="true"></i>`;
      option.addEventListener('mousedown', (event) => event.preventDefault());
      option.addEventListener('click', () => choose(station));
      panel.append(option);
    });
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('focus', () => render(resolveStation(input.value) ? '' : input.value));
  input.addEventListener('input', () => {
    input.setCustomValidity('');
    render(input.value);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (panel.hidden) render(resolveStation(input.value) ? '' : input.value);
      highlight(activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Enter' && activeIndex >= 0 && matches[activeIndex]) {
      event.preventDefault();
      choose(matches[activeIndex]);
    } else if (event.key === 'Escape') {
      close();
    }
  });
  input.addEventListener('blur', () => window.setTimeout(close, 120));
}

function formatClock(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(minutes) {
  const hours = Math.floor(Number(minutes) / 60);
  const rest = Number(minutes) % 60;
  return hours > 0 ? `${hours} godz. ${rest} min` : `${rest} min`;
}

function relativeMinutes(minutes) {
  const rounded = Math.max(0, Math.ceil(minutes));
  if (rounded < 1) return 'mniej niż minutę';
  if (rounded === 1) return '1 minutę';
  if (rounded < 5) return `${rounded} minuty`;
  return `${rounded} minut`;
}

function trainForLeg(leg) {
  return trains.find((train) => String(train.number) === String(leg.number)) || null;
}

function relevantNotices(journey) {
  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pl-PL');
  const stationNames = [journey.from, journey.to, ...(journey.legs || []).flatMap((leg) => [leg.from, leg.to])];
  const trainNumbers = (journey.legs || []).map((leg) => String(leg.number));
  const terms = new Set(stationNames.flatMap((name) => {
    const normalized = normalize(name);
    return [normalized, ...normalized.split(/\s+/).filter((part) => part.length >= 5)];
  }));
  return notices.filter((notice) => {
    if (!['warning', 'danger'].includes(String(notice.severity))) return false;
    const scope = normalize(`${notice.line} ${notice.title} ${notice.body}`);
    return trainNumbers.some((number) => scope.includes(number))
      || normalize(notice.line).includes('cala siec')
      || [...terms].some((term) => scope.includes(term));
  });
}

function renderSavedJourney() {
  if (!myJourneyEmpty || !myJourneyContent) return;
  const hasJourney = savedJourney && Array.isArray(savedJourney.legs) && savedJourney.legs.length > 0;
  myJourneyEmpty.hidden = hasJourney;
  myJourneyContent.hidden = !hasJourney;
  removeJourneyButton.hidden = !hasJourney;
  savedJourneyBadge.hidden = !hasJourney;
  if (!hasJourney) return;

  const firstLeg = savedJourney.legs[0];
  const lastLeg = savedJourney.legs.at(-1);
  const firstTrain = trainForLeg(firstLeg);
  const firstDelay = firstTrain?.source === 'gps' ? Number(firstTrain.delay || 0) : 0;
  const scheduledDeparture = new Date(firstLeg.departure);
  const expectedDeparture = new Date(scheduledDeparture.getTime() + firstDelay * 60_000);
  const scheduledArrival = new Date(lastLeg.arrival);
  const lastTrain = trainForLeg(lastLeg);
  const lastDelay = lastTrain?.source === 'gps' ? Number(lastTrain.delay || 0) : 0;
  const expectedArrival = new Date(scheduledArrival.getTime() + lastDelay * 60_000);
  const now = new Date();

  journeyFrom.textContent = savedJourney.from;
  journeyTo.textContent = savedJourney.to;
  journeyDate.textContent = scheduledDeparture.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long' });
  journeyTimes.textContent = `${formatClock(expectedDeparture)}–${formatClock(expectedArrival)}`;
  journeyDuration.textContent = formatDuration(savedJourney.durationMinutes + Math.max(0, lastDelay - firstDelay));

  if (now < expectedDeparture) {
    journeyState.textContent = 'Zaplanowana podróż';
    journeyCountdown.textContent = `Odjazd za ${relativeMinutes((expectedDeparture - now) / 60_000)}`;
  } else if (now <= expectedArrival) {
    journeyState.textContent = 'Podróż w toku';
    journeyCountdown.textContent = `Przyjazd za ${relativeMinutes((expectedArrival - now) / 60_000)}`;
  } else {
    journeyState.textContent = 'Podróż zakończona';
    journeyCountdown.textContent = `Przyjazd ${formatClock(expectedArrival)}`;
  }

  journeyLiveState.textContent = firstTrain
    ? firstTrain.source === 'gps'
      ? firstDelay > 0 ? `GPS · opóźnienie ${firstDelay} min` : 'GPS · kursuje planowo'
      : 'Pozycja estymowana z rozkładu'
    : 'Brak bieżącej pozycji pociągu';

  journeyLegs.replaceChildren();
  savedJourney.legs.forEach((leg, index) => {
    const train = trainForLeg(leg);
    const delay = train?.source === 'gps' ? Number(train.delay || 0) : 0;
    const expectedLegDeparture = new Date(new Date(leg.departure).getTime() + delay * 60_000);
    const item = document.createElement('div');
    item.className = 'list-group-item py-3';
    const status = train
      ? train.source === 'gps'
        ? delay > 0 ? `<span class="badge text-bg-warning">+${delay} min · GPS</span>` : '<span class="badge text-bg-success">Planowo · GPS</span>'
        : '<span class="badge text-bg-info">Pozycja estymowana</span>'
      : '<span class="badge text-bg-light border">Tylko rozkład</span>';
    item.innerHTML = `
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div><span class="badge text-bg-danger me-2">KW ${escapeHtml(leg.number)}</span><strong>${escapeHtml(leg.from)} → ${escapeHtml(leg.to)}</strong><small class="d-block text-secondary mt-1">Odjazd ${escapeHtml(formatClock(expectedLegDeparture))}${leg.platform ? ` · peron ${escapeHtml(leg.platform)}` : ''}${index > 0 ? ' · przesiadka' : ''}</small></div>
        <div class="d-flex align-items-center gap-2">${status}<button class="btn btn-sm btn-outline-secondary journey-route" type="button">Trasa</button></div>
      </div>`;
    item.querySelector('.journey-route')?.addEventListener('click', () => loadRoute(String(leg.number)));
    journeyLegs.append(item);
  });

  const matchingNotices = relevantNotices(savedJourney);
  journeyNotices.hidden = matchingNotices.length === 0;
  if (matchingNotices.length > 0) {
    journeyNotices.innerHTML = `<div class="d-flex align-items-start gap-2"><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i><div><strong>${matchingNotices.length === 1 ? 'Komunikat może dotyczyć tej podróży' : `${matchingNotices.length} komunikaty mogą dotyczyć tej podróży`}</strong><div class="small">${matchingNotices.map((notice) => escapeHtml(notice.title)).join(' · ')}</div><button class="btn btn-link link-danger p-0 mt-1 small fw-semibold" type="button" data-bs-toggle="modal" data-bs-target="#notices-modal">Zobacz komunikaty</button></div></div>`;
  }
}

function saveJourney(connection, payload) {
  savedJourney = {
    version: 1,
    from: payload.from.name,
    to: payload.to.name,
    departure: connection.departure,
    arrival: connection.arrival,
    durationMinutes: Number(connection.durationMinutes),
    transfers: Number(connection.transfers),
    legs: connection.legs
  };
  try { localStorage.setItem('kw_saved_journey', JSON.stringify(savedJourney)); } catch { /* zapis jest opcjonalny */ }
  renderSavedJourney();
  document.querySelector('#my-journey')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderDepartures() {
  if (!departureList) return;
  departureList.replaceChildren();
  if (!currentDepartures.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5" class="text-center text-secondary py-4">Brak kolejnych odjazdów KW z tej stacji.</td>';
    departureList.append(row);
    return;
  }

  const gpsByNumber = new Map(trains.filter((train) => train.source === 'gps').map((train) => [String(train.number), train]));
  currentDepartures.forEach((departure) => {
    const gps = gpsByNumber.get(String(departure.number));
    const delay = Number(gps?.delay || 0);
    const scheduled = new Date(departure.scheduledAt);
    const expected = new Date(scheduled.getTime() + delay * 60_000);
    const status = gps
      ? delay > 0
        ? `<span class="text-warning-emphasis fw-semibold">+${delay} min</span><small class="d-block text-secondary">GPS</small>`
        : '<span class="text-success fw-semibold">Planowo</span><small class="d-block text-secondary">GPS</small>'
      : '<span class="text-secondary fw-semibold">Rozkład</span>';
    const time = delay > 0
      ? `<span class="text-decoration-line-through text-secondary small">${escapeHtml(departure.time)}</span><strong class="d-block">${escapeHtml(formatClock(expected))}</strong>`
      : `<strong>${escapeHtml(departure.time)}</strong>`;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="departure-time">${time}</td>
      <td><button class="btn btn-link link-danger fw-semibold text-decoration-none p-0 departure-route" type="button"><span class="badge text-bg-danger me-1">KW</span>${escapeHtml(departure.number)}</button></td>
      <td class="fw-semibold">${escapeHtml(departure.destination)}</td>
      <td class="text-center"><span class="platform-box">${escapeHtml(departure.platform || '—')}</span></td>
      <td>${status}</td>`;
    row.querySelector('.departure-route')?.addEventListener('click', () => loadRoute(String(departure.number)));
    departureList.append(row);
  });
}

async function loadDepartures(station) {
  if (!departureList || !station) return;
  departureList.innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-4"><span class="spinner-border spinner-border-sm text-danger me-2"></span>Pobieranie odjazdów…</td></tr>';
  if (departureLabel) departureLabel.textContent = `${station.name} · rozkład KW`;
  try {
    const payload = await fetchPayload(`/api/departures.php?station=${encodeURIComponent(station.id)}&limit=10`);
    currentDepartures = Array.isArray(payload.departures) ? payload.departures : [];
    renderDepartures();
    if (departureSource) departureSource.textContent = `${payload.source} · ważność danych do ${payload.feedValidUntil || 'nieokreślona'}`;
    try { localStorage.setItem('kw_departure_station', String(station.id)); } catch { /* preferencja jest opcjonalna */ }
  } catch (error) {
    currentDepartures = [];
    departureList.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">${escapeHtml(error instanceof Error ? error.message : 'Nie udało się pobrać odjazdów.')}</td></tr>`;
  }
}

function renderConnections(payload) {
  if (!connectionResults) return;
  connectionResults.replaceChildren();
  connectionResults.hidden = false;
  const header = document.createElement('div');
  header.className = 'px-3 py-2 border-bottom bg-light small';
  header.innerHTML = `<strong>${escapeHtml(payload.from.name)} → ${escapeHtml(payload.to.name)}</strong><span class="text-secondary ms-2">${payload.connections.length} wyników</span>`;
  connectionResults.append(header);

  if (!payload.connections.length) {
    const empty = document.createElement('div');
    empty.className = 'p-4 text-center text-secondary';
    empty.textContent = 'Brak połączeń KW spełniających podane kryteria.';
    connectionResults.append(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'list-group list-group-flush connection-list';
  payload.connections.forEach((connection) => {
    const item = document.createElement('article');
    item.className = 'list-group-item connection-result p-3';
    const legs = connection.legs.map((leg) => `
      <div class="connection-leg">
        <span class="connection-leg__time">${escapeHtml(formatClock(leg.departure))}<small>${escapeHtml(formatClock(leg.arrival))}</small></span>
        <span class="connection-leg__line"><i></i></span>
        <span class="connection-leg__route"><strong>${escapeHtml(leg.from)} → ${escapeHtml(leg.to)}</strong><small><button class="btn btn-link link-danger p-0 train-route-from-search" type="button" data-train="${escapeHtml(leg.number)}">KW ${escapeHtml(leg.number)}</button>${leg.platform ? ` · peron ${escapeHtml(leg.platform)}` : ''}</small></span>
      </div>`).join('');
    item.innerHTML = `
      <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
        <div><span class="connection-clock">${escapeHtml(formatClock(connection.departure))}</span><i class="bi bi-arrow-right mx-2 text-secondary"></i><span class="connection-clock">${escapeHtml(formatClock(connection.arrival))}</span></div>
        <div class="text-end"><strong>${escapeHtml(formatDuration(connection.durationMinutes))}</strong><small class="d-block text-secondary">${connection.transfers === 0 ? 'Bezpośrednio' : `1 przesiadka · ${escapeHtml(connection.transferStation)}`}</small></div>
      </div>${legs}
      <div class="d-flex justify-content-end mt-3"><button class="btn btn-sm btn-outline-danger save-journey" type="button"><i class="bi bi-bookmark-plus me-1"></i>Obserwuj podróż</button></div>`;
    item.querySelectorAll('.train-route-from-search').forEach((button) => button.addEventListener('click', () => loadRoute(button.dataset.train)));
    item.querySelector('.save-journey')?.addEventListener('click', () => saveJourney(connection, payload));
    list.append(item);
  });
  connectionResults.append(list);
}

async function searchConnections(event) {
  event.preventDefault();
  const from = resolveStation(connectionFrom?.value);
  const to = resolveStation(connectionTo?.value);
  if (!from || !to) {
    if (connectionResults) {
      connectionResults.hidden = false;
      connectionResults.innerHTML = '<div class="alert alert-danger m-3">Wybierz obie stacje z podpowiedzi.</div>';
    }
    return;
  }

  connectionSubmit?.setAttribute('disabled', '');
  if (connectionResults) {
    connectionResults.hidden = false;
    connectionResults.innerHTML = '<div class="p-4 text-center text-secondary"><span class="spinner-border spinner-border-sm text-danger me-2"></span>Wyszukiwanie połączeń…</div>';
  }
  try {
    const params = new URLSearchParams({ from: from.id, to: to.id, date: connectionDate.value, time: connectionTime.value });
    renderConnections(await fetchPayload(`/api/connections.php?${params}`));
  } catch (error) {
    if (connectionResults) connectionResults.innerHTML = `<div class="alert alert-danger m-3">${escapeHtml(error instanceof Error ? error.message : 'Nie udało się wyszukać połączeń.')}</div>`;
  } finally {
    connectionSubmit?.removeAttribute('disabled');
  }
}

function formatObservation(train) {
  if (train.source === 'estimated') return 'pozycja według rozkładu';
  const date = new Date(train.observedAt);
  if (Number.isNaN(date.getTime())) return 'brak czasu pomiaru';
  return `pomiar ${date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
}

function trainStatus(train) {
  if (train.source === 'estimated') return { label: 'estymowana', className: 'text-bg-info' };
  if (train.stale) return { label: 'stara pozycja', className: 'text-bg-secondary' };
  if (train.delay > 0) return { label: `+${train.delay} min`, className: 'text-bg-warning' };
  return { label: 'planowo', className: 'text-bg-success' };
}

function renderList() {
  if (!trainList) return;
  const query = String(searchInput?.value || '').trim().toLowerCase();
  const visible = trains.filter((train) => !query || train.number.toLowerCase().includes(query));
  trainList.replaceChildren();

  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'p-4 text-center text-secondary small';
    empty.textContent = query ? 'Nie znaleziono pociągu o tym numerze.' : 'Brak aktualnych pozycji pociągów.';
    trainList.append(empty);
    return;
  }

  visible.forEach((train) => {
    const status = trainStatus(train);
    const primaryDetail = train.source === 'estimated'
      ? `${train.segmentFrom || 'trasa'} → ${train.segmentTo || train.destination || 'cel'}`
      : `${train.speed ?? 0} km/h`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'list-group-item list-group-item-action train-row';
    button.dataset.trainNumber = train.number;
    button.innerHTML = `
      <span class="train-row__number"><span class="badge text-bg-danger">KW</span><strong>${escapeHtml(train.number)}</strong></span>
      <span class="train-row__details"><span>${escapeHtml(primaryDetail)}</span><small>${escapeHtml(formatObservation(train))}</small></span>
      <span class="badge ${status.className}">${escapeHtml(status.label)}</span>`;
    button.addEventListener('click', () => focusTrain(train));
    trainList.append(button);
  });
}

function renderMap() {
  if (!map || !markerLayer) return;
  markerLayer.clearLayers();
  markers.clear();

  trains.forEach((train) => {
    const status = train.source === 'estimated'
      ? `Estymowana między ${train.segmentFrom || 'stacjami'} a ${train.segmentTo || 'kolejnym postojem'}`
      : train.delay > 0 ? `Opóźnienie: ${train.delay} min` : 'Planowo';
    const movement = train.source === 'estimated' ? 'Pozycja według rozkładu' : `Prędkość: ${train.speed ?? 0} km/h`;
    const marker = L.marker([train.lat, train.lon], { icon: markerIcon(train) })
      .bindPopup(`<strong>KW ${escapeHtml(train.number)}</strong><br>${escapeHtml(status)}<br>${escapeHtml(movement)}<br><small>${escapeHtml(formatObservation(train))}</small>`)
      .addTo(markerLayer);
    markers.set(train.number, marker);
  });

  if (!hasFocusedLiveData && trains.length) {
    const bounds = L.latLngBounds(trains.map((train) => [train.lat, train.lon]));
    map.fitBounds(bounds, { padding: [34, 34], maxZoom: 9 });
    hasFocusedLiveData = true;
  }
}

function focusTrain(train) {
  if (!map) return;
  map.setView([train.lat, train.lon], Math.max(map.getZoom(), 12));
  markers.get(train.number)?.openPopup();
  void loadRoute(train.number, train.lat, train.lon);
}

function routeTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function drawRoute(route) {
  if (!map || !routeLayer) return;
  routeLayer.clearLayers();
  const points = Array.isArray(route.path)
    ? route.path.filter((point) => Array.isArray(point) && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1])))
    : [];

  if (points.length > 1) {
    L.polyline(points, { color: '#ffffff', weight: 8, opacity: 1, interactive: false }).addTo(routeLayer);
    L.polyline(points, { color: '#c8102e', weight: 4, opacity: 1, interactive: false }).addTo(routeLayer);
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 11 });
  }

  (route.stops || []).forEach((stop, index) => {
    if (!Number.isFinite(Number(stop.lat)) || !Number.isFinite(Number(stop.lon))) return;
    L.circleMarker([stop.lat, stop.lon], {
      radius: index === 0 || index === route.stops.length - 1 ? 6 : 4,
      color: '#c8102e',
      weight: 2,
      fillColor: '#ffffff',
      fillOpacity: 1
    }).bindTooltip(stop.name).addTo(routeLayer);
  });
}

function renderRoute(route) {
  if (!routeStops) return;
  routeNumber.textContent = route.number;
  routeTitle.textContent = `KW ${route.number}`;
  routeOrigin.textContent = route.origin;
  routeDestination.textContent = route.destination;
  routeSource.textContent = route.source;
  routeStops.replaceChildren();

  (route.stops || []).forEach((stop, index) => {
    const row = document.createElement('a');
    row.className = 'route-stop';
    row.href = `/station.php?id=${encodeURIComponent(stop.stationId)}`;
    const time = stop.departure || stop.arrival;
    row.innerHTML = `
      <span class="route-stop__time">${escapeHtml(routeTime(time))}</span>
      <span class="route-stop__line"><i></i></span>
      <span class="route-stop__name"><strong>${escapeHtml(stop.name)}</strong><small>${stop.platform ? `Peron ${escapeHtml(stop.platform)}` : 'Zobacz stację'}</small></span>
      <i class="bi bi-chevron-right text-secondary"></i>`;
    if (index === 0) row.classList.add('is-first');
    if (index === route.stops.length - 1) row.classList.add('is-last');
    routeStops.append(row);
  });
  drawRoute(route);
}

async function loadRoute(number, lat = null, lon = null) {
  if (!routePanelElement) return;
  Offcanvas.getOrCreateInstance(routePanelElement).show();
  routeTitle.textContent = `KW ${number}`;
  routeLoading.hidden = false;
  routeError.hidden = true;
  routeContent.hidden = true;

  try {
    const params = new URLSearchParams({ train: number });
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))) {
      params.set('lat', String(lat));
      params.set('lon', String(lon));
    }
    const response = await fetch(`/api/route.php?${params}`, { headers: { Accept: 'application/json' } });
    const route = await response.json();
    if (!response.ok) throw new Error(route.error || `HTTP ${response.status}`);
    renderRoute(route);
    routeContent.hidden = false;
  } catch (error) {
    routeError.textContent = error instanceof Error ? error.message : 'Nie udało się pobrać trasy.';
    routeError.hidden = false;
  } finally {
    routeLoading.hidden = true;
  }
}

function applyStats() {
  if (statTotal) statTotal.textContent = String(trains.length);
  if (statGps) statGps.textContent = String(trains.filter((train) => train.source === 'gps').length);
  if (statEstimated) statEstimated.textContent = String(trains.filter((train) => train.source === 'estimated').length);
}

function distanceInKm(lat1, lon1, lat2, lon2) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const deltaLat = radians(lat2 - lat1);
  const deltaLon = radians(lon2 - lon1);
  const value = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function selectNearestStation() {
  if (!nearestStationButton || !departureInput) return;
  if (!navigator.geolocation) {
    if (departureSource) departureSource.textContent = 'Ta przeglądarka nie udostępnia lokalizacji.';
    return;
  }
  const original = nearestStationButton.innerHTML;
  nearestStationButton.disabled = true;
  nearestStationButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Szukam…';
  navigator.geolocation.getCurrentPosition((position) => {
    const available = stations.filter((station) => Number.isFinite(Number(station.lat)) && Number.isFinite(Number(station.lon)));
    const nearest = available.reduce((best, station) => {
      const distance = distanceInKm(position.coords.latitude, position.coords.longitude, Number(station.lat), Number(station.lon));
      return !best || distance < best.distance ? { station, distance } : best;
    }, null);
    if (nearest) {
      departureInput.value = nearest.station.name;
      void loadDepartures(nearest.station);
    }
    nearestStationButton.disabled = false;
    nearestStationButton.innerHTML = original;
  }, (error) => {
    if (departureSource) departureSource.textContent = error.code === 1
      ? 'Aby znaleźć najbliższą stację, zezwól na dostęp do lokalizacji.'
      : 'Nie udało się ustalić lokalizacji. Wybierz stację ręcznie.';
    nearestStationButton.disabled = false;
    nearestStationButton.innerHTML = original;
  }, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 });
}

async function fetchPayload(url) {
  const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

function updateTemplateFields() {
  if (!templateKind) return;
  document.querySelectorAll('[data-template-for]').forEach((element) => {
    element.hidden = !String(element.dataset.templateFor || '').split(/\s+/).includes(templateKind.value);
  });
}

async function loadAdminHealth() {
  if (!adminDataHealth) return;
  adminDataHealth.innerHTML = '<div class="col-12 text-center text-secondary small py-2"><span class="spinner-border spinner-border-sm text-danger me-2"></span>Sprawdzanie źródeł danych…</div>';
  refreshAdminHealth?.setAttribute('disabled', '');
  try {
    const payload = await fetchPayload('/api/health.php');
    adminDataHealth.replaceChildren();
    Object.values(payload.checks || {}).forEach((check) => {
      const column = document.createElement('div');
      column.className = 'col-sm-6 col-xl-3';
      const state = !check.ok ? check.warning ? 'warning' : 'danger' : check.warning ? 'warning' : 'success';
      const icon = state === 'success' ? 'bi-check-lg' : state === 'warning' ? 'bi-exclamation-triangle' : 'bi-x-lg';
      column.innerHTML = `<div class="admin-health admin-health--${state}"><span class="admin-health__icon"><i class="bi ${icon}" aria-hidden="true"></i></span><span><strong>${escapeHtml(check.label)}</strong><small>${escapeHtml(check.detail)}</small></span></div>`;
      adminDataHealth.append(column);
    });
  } catch (error) {
    adminDataHealth.innerHTML = `<div class="col-12"><div class="alert alert-warning mb-0">Nie udało się sprawdzić źródeł danych: ${escapeHtml(error instanceof Error ? error.message : 'nieznany błąd')}</div></div>`;
  } finally {
    refreshAdminHealth?.removeAttribute('disabled');
  }
}

async function loadTrains() {
  if (!mapElement || !trainList) return;
  if (loading) return;
  loading = true;
  refreshButton?.setAttribute('disabled', '');
  refreshButton?.querySelector('i')?.classList.add('spin');
  if (errorBox) errorBox.hidden = true;

  try {
    const [gpsResult, estimatedResult] = await Promise.allSettled([
      fetchPayload('/api/trains.php'),
      fetchPayload('/api/estimated-trains.php')
    ]);

    if (gpsResult.status === 'rejected' && estimatedResult.status === 'rejected') {
      throw new Error('Brak odpowiedzi GPS i lokalnego rozkładu.');
    }

    const gpsTrains = gpsResult.status === 'fulfilled' && Array.isArray(gpsResult.value.trains) ? gpsResult.value.trains : [];
    const estimatedTrains = estimatedResult.status === 'fulfilled' && Array.isArray(estimatedResult.value.trains) ? estimatedResult.value.trains : [];
    const gpsAvailable = gpsResult.status === 'fulfilled' && gpsTrains.length > 0;
    if (!gpsTrains.length && !estimatedTrains.length) {
      throw new Error('Oba źródła zwróciły pustą listę pociągów.');
    }
    const merged = new Map(estimatedTrains.map((train) => [String(train.number), { ...train, source: 'estimated', estimated: true }]));
    gpsTrains.forEach((train) => merged.set(String(train.number), { ...train, source: 'gps', estimated: false }));
    trains = [...merged.values()].sort((left, right) => String(left.number).localeCompare(String(right.number), 'pl', { numeric: true }));

    applyStats();
    renderMap();
    renderList();
    renderDepartures();
    renderSavedJourney();
    if (sourceBadge) {
      sourceBadge.className = `badge ${gpsAvailable ? 'text-bg-success' : 'text-bg-info'}`;
      sourceBadge.textContent = gpsAvailable
        ? `GPS ${gpsTrains.length} · estymowane ${trains.filter((train) => train.source === 'estimated').length}`
        : `GPS niedostępny · estymowane ${estimatedTrains.length}`;
    }
    if (!gpsAvailable && estimatedTrains.length > 0 && errorBox) {
      errorBox.textContent = 'Pozycje GPS są chwilowo niedostępne. Mapa pokazuje pozycje estymowane według rozkładu.';
      errorBox.className = 'map-message alert alert-info m-3';
      errorBox.hidden = false;
    }
    const updatedAt = gpsResult.status === 'fulfilled' ? gpsResult.value.fetchedAt : estimatedResult.value.generatedAt;
    if (lastUpdate) lastUpdate.textContent = `Ostatnia aktualizacja: ${new Date(updatedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
  } catch (error) {
    if (!trains.length) {
      trains = [];
    } else {
      trains = trains.map((train) => train.source === 'gps' ? { ...train, stale: true } : train);
    }
    applyStats();
    renderMap();
    renderList();
    renderDepartures();
    renderSavedJourney();
    if (sourceBadge) {
      sourceBadge.className = 'badge text-bg-warning';
      sourceBadge.textContent = 'Ostatnie dostępne dane';
    }
    if (errorBox) {
      errorBox.textContent = `Nie udało się pobrać danych na żywo: ${error instanceof Error ? error.message : 'nieznany błąd'}`;
      errorBox.className = 'map-message alert alert-warning m-3';
      errorBox.hidden = false;
    }
  } finally {
    loading = false;
    refreshButton?.removeAttribute('disabled');
    refreshButton?.querySelector('i')?.classList.remove('spin');
  }
}

searchInput?.addEventListener('input', renderList);
refreshButton?.addEventListener('click', loadTrains);
connectionForm?.addEventListener('submit', searchConnections);
nearestStationButton?.addEventListener('click', selectNearestStation);
removeJourneyButton?.addEventListener('click', () => {
  savedJourney = null;
  try { localStorage.removeItem('kw_saved_journey'); } catch { /* zapis jest opcjonalny */ }
  renderSavedJourney();
});
swapStations?.addEventListener('click', () => {
  const previousFrom = connectionFrom.value;
  connectionFrom.value = connectionTo.value;
  connectionTo.value = previousFrom;
});
departureForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const station = resolveStation(departureInput.value);
  if (!station) {
    departureInput.setCustomValidity('Wybierz stację z podpowiedzi.');
    departureInput.reportValidity();
    return;
  }
  departureInput.setCustomValidity('');
  void loadDepartures(station);
});

function initializeDepartureBoard() {
  if (!departureInput || !defaultStation) return;
  let selected = defaultStation;
  try {
    const savedId = localStorage.getItem('kw_departure_station');
    selected = stations.find((station) => String(station.id) === savedId) || defaultStation;
  } catch { /* preferencja jest opcjonalna */ }
  departureInput.value = selected.name;
  void loadDepartures(selected);
}

if (noticesModalElement?.dataset.autoOpen === 'true') {
  const version = noticesModalElement.dataset.noticeVersion || '';
  let alreadySeen = false;
  try { alreadySeen = sessionStorage.getItem('kw_seen_notices') === version; } catch { /* preferencja jest opcjonalna */ }
  if (!alreadySeen) {
    window.setTimeout(() => {
      Modal.getOrCreateInstance(noticesModalElement).show();
      try { sessionStorage.setItem('kw_seen_notices', version); } catch { /* preferencja jest opcjonalna */ }
    }, 650);
  }
}

const stationSearch = document.querySelector('#station-search');
const stationRows = [...document.querySelectorAll('.station-row')];
const stationEmpty = document.querySelector('#station-empty');
stationSearch?.addEventListener('input', () => {
  const query = stationSearch.value.trim().toLocaleLowerCase('pl-PL');
  let visible = 0;
  stationRows.forEach((row) => {
    const matches = !query || row.dataset.stationName.includes(query);
    row.hidden = !matches;
    if (matches) visible += 1;
  });
  if (stationEmpty) stationEmpty.hidden = visible !== 0;
});

const requestedTrain = new URLSearchParams(window.location.search).get('train');
document.querySelectorAll('.delete-notice').forEach((button) => button.addEventListener('click', () => {
  if (!deleteNoticeModalElement || !deleteNoticeId || !deleteNoticeName) return;
  deleteNoticeId.value = button.dataset.noticeId || '';
  deleteNoticeName.textContent = `„${button.dataset.noticeTitle || 'bez tytułu'}”`;
  Modal.getOrCreateInstance(deleteNoticeModalElement).show();
}));
deleteNoticeForm?.addEventListener('submit', () => {
  const submit = deleteNoticeForm.querySelector('button[type="submit"]');
  submit?.setAttribute('disabled', '');
  if (submit) submit.innerHTML = '<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Usuwanie…';
});
generateTrainNoticeButton?.addEventListener('click', () => {
  const fields = {
    kind: document.querySelector('#template-kind'),
    train: document.querySelector('#template-train'),
    delay: document.querySelector('#template-delay'),
    origin: document.querySelector('#template-origin'),
    departure: document.querySelector('#template-departure'),
    destination: document.querySelector('#template-destination'),
    arrival: document.querySelector('#template-arrival'),
    newDestination: document.querySelector('#template-new-destination'),
    station: document.querySelector('#template-station'),
    eventTime: document.querySelector('#template-event-time'),
    platform: document.querySelector('#template-platform'),
    track: document.querySelector('#template-track'),
    reason: document.querySelector('#template-reason'),
    replacement: document.querySelector('#template-replacement'),
    title: document.querySelector('#title'),
    body: document.querySelector('#body'),
    line: document.querySelector('#line'),
    severity: document.querySelector('#severity'),
    status: document.querySelector('#template-status')
  };
  const kind = fields.kind.value;
  const routeFields = [fields.train, fields.origin, fields.departure, fields.destination, fields.arrival];
  const required = kind === 'platform'
    ? [fields.train, fields.station, fields.eventTime, fields.platform]
    : kind === 'delay'
      ? [...routeFields, fields.delay]
      : kind === 'shortened'
        ? [...routeFields, fields.newDestination]
        : routeFields;
  const missing = required.find((field) => !String(field?.value || '').trim());
  if (missing) {
    fields.status.textContent = 'Uzupełnij wszystkie dane potrzebne do tego komunikatu.';
    fields.status.className = 'small text-danger fw-semibold';
    missing.focus();
    return;
  }
  const train = fields.train.value.trim();
  const reason = String(fields.reason?.value || '').trim();
  const origin = fields.origin?.value.trim();
  const destination = fields.destination?.value.trim();
  const relation = `${origin} – ${destination}`;

  if (kind === 'delay') {
    const delay = Math.max(1, Number.parseInt(fields.delay.value, 10));
    const lastTwo = delay % 100;
    const lastOne = delay % 10;
    const delayText = `${delay} ${delay === 1 ? 'minutę' : lastTwo >= 12 && lastTwo <= 14 ? 'minut' : lastOne >= 2 && lastOne <= 4 ? 'minuty' : 'minut'}`;
    fields.title.value = `Pociąg ${train} opóźniony o około ${delayText}`;
    fields.line.value = relation;
    fields.body.value = `Pociąg ${train} relacji ${origin} (${fields.departure.value}) – ${destination} (${fields.arrival.value}) jest opóźniony o około ${delayText}${reason ? ` ${reason}` : ''}.${fields.replacement.checked ? ' Do obsługi połączenia został podstawiony skład zastępczy.' : ''}`;
    fields.severity.value = 'warning';
  } else if (kind === 'cancellation') {
    fields.title.value = `Pociąg ${train} został odwołany`;
    fields.line.value = relation;
    fields.body.value = `Pociąg ${train} relacji ${origin} (${fields.departure.value}) – ${destination} (${fields.arrival.value}) został odwołany${reason ? ` ${reason}` : ''}.${fields.replacement.checked ? ' Dla pasażerów uruchomiono transport zastępczy.' : ''}`;
    fields.severity.value = 'danger';
  } else if (kind === 'bus') {
    fields.title.value = `Komunikacja zastępcza za pociąg ${train}`;
    fields.line.value = relation;
    fields.body.value = `Za pociąg ${train} relacji ${origin} (${fields.departure.value}) – ${destination} (${fields.arrival.value}) została uruchomiona zastępcza komunikacja autobusowa${reason ? ` ${reason}` : ''}. Prosimy zwracać uwagę na oznaczenia przystanków zastępczych.`;
    fields.severity.value = 'warning';
  } else if (kind === 'platform') {
    const trackText = fields.track.value.trim() ? `, tor ${fields.track.value.trim()}` : '';
    fields.title.value = `Zmiana peronu dla pociągu ${train}`;
    fields.line.value = fields.station.value.trim();
    fields.body.value = `Pociąg ${train} odjedzie ze stacji ${fields.station.value.trim()} o ${fields.eventTime.value} z peronu ${fields.platform.value.trim()}${trackText}. Prosimy o zwracanie uwagi na zapowiedzi i wyświetlacze.`;
    fields.severity.value = 'warning';
  } else if (kind === 'shortened') {
    const newDestination = fields.newDestination.value.trim();
    fields.title.value = `Skrócona relacja pociągu ${train}`;
    fields.line.value = `${origin} – ${newDestination}`;
    fields.body.value = `Pociąg ${train} planowej relacji ${origin} (${fields.departure.value}) – ${destination} (${fields.arrival.value}) pojedzie w skróconej relacji do stacji ${newDestination}${reason ? ` ${reason}` : ''}. Pociąg nie obsłuży odcinka ${newDestination} – ${destination}.`;
    fields.severity.value = 'warning';
  }
  fields.status.textContent = 'Gotowe — sprawdź treść poniżej i opublikuj komunikat.';
  fields.status.className = 'small text-success fw-semibold';
  fields.title.focus();
});
templateKind?.addEventListener('change', updateTemplateFields);
refreshAdminHealth?.addEventListener('click', loadAdminHealth);
updateTemplateFields();
void loadAdminHealth();
document.querySelectorAll('.station-autocomplete').forEach(initializeStationAutocomplete);
renderSavedJourney();
initializeDepartureBoard();
loadTrains().then(() => {
  if (requestedTrain && /^\d{3,6}$/.test(requestedTrain)) void loadRoute(requestedTrain);
});
window.setInterval(loadTrains, 60_000);
