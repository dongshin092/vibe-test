(() => {
  'use strict';

  const API_BASE = 'https://api.openweathermap.org/data/2.5';
  const ICON_URL = (icon) => `https://openweathermap.org/img/wn/${icon}@2x.png`;
  const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  const DEFAULT_CITY_ID = 'seoul';
  const WORLD_VIEW = { center: [25, 10], zoom: 2 };
  const CACHE_TTL_MS = 10 * 60 * 1000;
  const FORECAST_COUNT = 8; // 3시간 × 8 = 24시간
  const PLACEHOLDER_KEY = 'YOUR_OPENWEATHER_API_KEY';

  const WIND_DIRECTIONS = [
    '북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동',
    '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서',
  ];

  const CONTINENTS = window.CONTINENTS || [];
  const CITIES = window.CITIES || [];

  const state = {
    continent: 'all',
    cityId: null,
    requestSeq: 0,
  };

  const cache = new Map(); // cityId → { data, savedAt }
  const markers = new Map(); // cityId → L.Marker
  const el = {};
  let map;

  // ===== 초기화 =====
  function init() {
    el.chips = document.getElementById('continentChips');
    el.dashboard = document.getElementById('dashboard');
    el.weatherIcon = document.getElementById('weatherIcon');
    el.weatherIconSkeleton = document.getElementById('weatherIconSkeleton');
    el.cityName = document.getElementById('cityName');
    el.cityDesc = document.getElementById('cityDesc');
    el.heroTemp = document.getElementById('heroTemp');
    el.localTime = document.getElementById('localTime');
    el.spinner = document.getElementById('loadingSpinner');
    el.windArrow = document.getElementById('windArrow');
    el.humidityBar = document.getElementById('humidityBar');
    el.notice = document.getElementById('notice');
    el.noticeTitle = document.getElementById('noticeTitle');
    el.noticeText = document.getElementById('noticeText');
    el.retryBtn = document.getElementById('retryBtn');
    el.fields = {};
    document.querySelectorAll('[data-field]').forEach((node) => {
      el.fields[node.dataset.field] = node;
    });

    el.retryBtn.addEventListener('click', () => {
      const city = getCity(state.cityId);
      if (city) loadWeather(city);
    });

    buildChips();
    buildMap();
    selectCity(DEFAULT_CITY_ID);
  }

  function getApiKey() {
    const key = window.WEATHER_CONFIG && window.WEATHER_CONFIG.API_KEY;
    return key && key !== PLACEHOLDER_KEY ? key : null;
  }

  function getCity(id) {
    return CITIES.find((city) => city.id === id);
  }

  // ===== 대륙 칩 =====
  function buildChips() {
    CONTINENTS.forEach((continent) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.dataset.continent = continent.id;
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = `<i class="fa-solid ${continent.icon}" aria-hidden="true"></i> ${continent.name}`;
      el.chips.appendChild(btn);
    });

    el.chips.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (btn) selectContinent(btn.dataset.continent);
    });
  }

  function renderChips() {
    el.chips.querySelectorAll('.chip').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.continent === state.continent));
    });
  }

  // ===== 지도 =====
  function buildMap() {
    map = L.map('map', {
      center: WORLD_VIEW.center,
      zoom: WORLD_VIEW.zoom,
      minZoom: 2,
      maxZoom: 8,
      scrollWheelZoom: false,
      worldCopyJump: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    CITIES.forEach((city) => {
      const marker = L.marker([city.lat, city.lon], {
        icon: L.divIcon({
          className: 'city-marker',
          html: '<span class="dot"></span>',
          iconSize: [22, 22],
        }),
        title: city.name,
        alt: city.name,
        keyboard: true,
      })
        .bindTooltip(city.name, { direction: 'top', offset: [0, -12], className: 'city-tooltip' })
        .on('click', () => selectCity(city.id, { fromMarker: true }))
        .addTo(map);
      markers.set(city.id, marker);
    });
  }

  function renderMarkers() {
    markers.forEach((marker, cityId) => {
      const node = marker.getElement();
      if (!node) return;
      const city = getCity(cityId);
      const isSelected = cityId === state.cityId;
      node.classList.toggle('is-selected', isSelected);
      node.classList.toggle('is-dim', state.continent !== 'all' && city.continent !== state.continent);
      marker.setZIndexOffset(isSelected ? 1000 : 0);
    });
  }

  function flyToContinent(continentId) {
    if (continentId === 'all') {
      map.flyTo(WORLD_VIEW.center, WORLD_VIEW.zoom, { duration: 0.8 });
      return;
    }
    const points = CITIES.filter((c) => c.continent === continentId).map((c) => [c.lat, c.lon]);
    if (points.length) {
      map.flyToBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 5, duration: 0.8 });
    }
  }

  // ===== 선택 =====
  function selectContinent(continentId) {
    state.continent = continentId;
    renderChips();
    flyToContinent(continentId);

    const current = getCity(state.cityId);
    if (continentId !== 'all' && (!current || current.continent !== continentId)) {
      const first = CITIES.find((c) => c.continent === continentId);
      if (first) {
        selectCity(first.id);
        return;
      }
    }
    renderMarkers();
  }

  function selectCity(cityId, { fromMarker = false } = {}) {
    const city = getCity(cityId);
    if (!city) return;

    state.cityId = cityId;
    if (fromMarker && state.continent !== 'all' && city.continent !== state.continent) {
      state.continent = city.continent;
    }
    renderChips();
    renderMarkers();
    loadWeather(city);
  }

  // ===== 날씨 조회 =====
  async function loadWeather(city) {
    const apiKey = getApiKey();
    if (!apiKey) {
      showNotice({
        title: 'API 키를 설정해주세요',
        html: '<code>js/config.example.js</code>를 <code>js/config.js</code>로 복사하고 OpenWeather API 키를 넣어주세요.',
        icon: 'fa-key',
      });
      return;
    }

    const cached = cache.get(city.id);
    if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
      renderWeather(city, cached.data);
      return;
    }

    const seq = ++state.requestSeq;
    setLoading(city);

    const params = `lat=${city.lat}&lon=${city.lon}&appid=${encodeURIComponent(apiKey)}&units=metric`;
    try {
      const [current, forecast] = await Promise.all([
        fetchJson(`${API_BASE}/weather?${params}&lang=kr`),
        fetchJson(`${API_BASE}/forecast?${params}&cnt=${FORECAST_COUNT}`).catch(() => null),
      ]);
      if (seq !== state.requestSeq) return;

      const data = { current, forecast };
      cache.set(city.id, { data, savedAt: Date.now() });
      renderWeather(city, data);
    } catch (err) {
      if (seq !== state.requestSeq) return;
      showError(err);
    }
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
      const error = new Error(`HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return res.json();
  }

  // ===== 렌더링 =====
  function setLoading(city) {
    hideNotice();
    el.dashboard.hidden = false;
    el.dashboard.classList.add('is-loading');

    el.cityName.textContent = city.name;
    el.cityDesc.textContent = `${city.country} · 불러오는 중…`;
    el.heroTemp.textContent = '--°';
    el.weatherIcon.hidden = true;
    el.weatherIconSkeleton.hidden = false;
    el.spinner.hidden = false;
    el.localTime.textContent = '';

    Object.values(el.fields).forEach((node) => {
      node.innerHTML = '<span class="skeleton skeleton-text"></span>';
    });
    el.humidityBar.style.width = '0';
  }

  function renderWeather(city, { current, forecast }) {
    hideNotice();
    el.dashboard.hidden = false;
    el.dashboard.classList.remove('is-loading');
    el.spinner.hidden = true;

    const { main, wind = {}, weather = [], timezone = 0 } = current;
    const sky = weather[0] || {};
    const temp = Math.round(main.temp);
    const { high, low } = getHighLow(current, forecast);
    const windSpeed = Number(wind.speed || 0);
    const windDeg = Math.round(wind.deg || 0);

    el.cityName.textContent = city.name;
    el.cityDesc.textContent = sky.description ? `${city.country} · ${sky.description}` : city.country;
    el.heroTemp.textContent = `${temp}°`;
    el.localTime.textContent = `현지 ${formatLocalTime(timezone)}`;

    if (sky.icon) {
      el.weatherIcon.src = ICON_URL(sky.icon);
      el.weatherIcon.alt = sky.description || '';
      el.weatherIcon.hidden = false;
      el.weatherIconSkeleton.hidden = true;
    }

    el.fields.temp.innerHTML = `${temp}<span class="unit">°C</span>`;
    el.fields.feels.textContent = `체감 ${Math.round(main.feels_like)}°C`;
    el.fields.range.innerHTML =
      `<span class="hi">${high}°</span><span class="slash"> / </span><span class="lo">${low}°</span>`;
    el.fields.windSpeed.innerHTML = `${windSpeed.toFixed(1)}<span class="unit"> m/s</span>`;
    el.fields.windLevel.textContent = getWindLevel(windSpeed);
    el.fields.windDir.textContent = `${getWindDirection(windDeg)}풍`;
    el.fields.windDeg.textContent = `${windDeg}°`;
    el.fields.humidity.innerHTML = `${main.humidity}<span class="unit">%</span>`;

    el.windArrow.style.transform = `rotate(${(windDeg + 180) % 360}deg)`;
    el.humidityBar.style.width = `${main.humidity}%`;
  }

  function getHighLow(current, forecast) {
    const temps = [current.main.temp];
    if (forecast && Array.isArray(forecast.list) && forecast.list.length) {
      forecast.list.forEach((item) => temps.push(item.main.temp_max, item.main.temp_min));
    } else {
      temps.push(current.main.temp_max, current.main.temp_min);
    }
    return {
      high: Math.round(Math.max(...temps)),
      low: Math.round(Math.min(...temps)),
    };
  }

  function getWindDirection(deg) {
    return WIND_DIRECTIONS[Math.round(deg / 22.5) % 16];
  }

  function getWindLevel(speed) {
    if (speed < 0.5) return '고요';
    if (speed < 3.4) return '약한 바람';
    if (speed < 8.0) return '약간 강한 바람';
    if (speed < 13.9) return '강한 바람';
    return '매우 강한 바람';
  }

  function formatLocalTime(timezoneSeconds) {
    const local = new Date(Date.now() + timezoneSeconds * 1000);
    const hh = String(local.getUTCHours()).padStart(2, '0');
    const mm = String(local.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // ===== 안내 / 에러 =====
  function showError(err) {
    if (err.status === 401) {
      showNotice({
        title: 'API 키가 올바르지 않아요',
        html: '새로 발급한 키는 활성화까지 최대 2시간 걸릴 수 있어요.',
        icon: 'fa-key',
        retry: true,
      });
    } else if (err.status === 429) {
      showNotice({
        title: '요청이 너무 많아요',
        html: '잠시 후 다시 시도해주세요.',
        icon: 'fa-hourglass-half',
        retry: true,
      });
    } else {
      showNotice({
        title: '날씨를 불러오지 못했어요',
        html: '인터넷 연결을 확인하고 다시 시도해주세요.',
        icon: 'fa-cloud-bolt',
        retry: true,
      });
    }
  }

  function showNotice({ title, html, icon = 'fa-circle-exclamation', retry = false }) {
    el.dashboard.hidden = true;
    el.spinner.hidden = true;
    el.notice.hidden = false;
    el.notice.querySelector('.notice-icon i').className = `fa-solid ${icon}`;
    el.noticeTitle.textContent = title;
    el.noticeText.innerHTML = html;
    el.retryBtn.hidden = !retry;
  }

  function hideNotice() {
    el.notice.hidden = true;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
