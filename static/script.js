/* ═══════════════════════════════════════════════════
   ProxiFind · script.js  v4.0
   All bugs fixed — search · autocomplete · map
═══════════════════════════════════════════════════ */

/* ── State ── */
let map, tileLayer, userCircle, centerMarker;
let markers        = [];
let activeCardEl   = null;
let activeMarkerEl = null;

/*
  FIX #1: selectedCoords is now properly managed.
  When a suggestion is selected we store exact coords and
  clear them only after a successful search, not before.
*/
let selectedCoords = null;   // { lat, lon } set by selectSuggestion()

/* ── Category config ── */
const CATEGORY = {
    restaurant: { emoji: '🍽', color: '#ef4444' },
    hospital:   { emoji: '🏥', color: '#3b82f6' },
    atm:        { emoji: '💳', color: '#8b5cf6' },
    gym:        { emoji: '💪', color: '#f97316' },
    pharmacy:   { emoji: '💊', color: '#10b981' },
    school:     { emoji: '🎓', color: '#eab308' },
    cafe:       { emoji: '☕', color: '#a16207' },
    bank:       { emoji: '🏦', color: '#0ea5e9' },
    default:    { emoji: '📍', color: '#0057FF' },
};

const TILES = {
    light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};


/* ════════════════════════════════════════
   MAP INITIALISATION
════════════════════════════════════════ */

function initMap() {
    map = L.map('map', {
        zoomControl:         false,
        attributionControl:  false,
        zoomSnap:            0.5,
        zoomDelta:           0.5,
        wheelPxPerZoomLevel: 80,
    }).setView([20.5937, 78.9629], 5);

    tileLayer = L.tileLayer(TILES[getTheme()], { maxZoom: 19 }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomleft', prefix: false })
        .addAttribution('© <a href="https://openstreetmap.org">OSM</a> · © <a href="https://carto.com">CARTO</a>')
        .addTo(map);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

    addMapToolbar();
}

function refreshTiles() {
    if (tileLayer) map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(TILES[getTheme()], { maxZoom: 19 }).addTo(map);
}

function addMapToolbar() {
    const Toolbar = L.Control.extend({
        options: { position: 'topright' },
        onAdd() {
            const wrap = L.DomUtil.create('div', 'map-toolbar');
            wrap.innerHTML = `
                <button class="map-tb-btn" id="tb-fit" title="Fit all markers">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                        <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                </button>
                <button class="map-tb-btn" id="tb-gps" title="Use my location">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                    </svg>
                </button>
            `;
            L.DomEvent.disableClickPropagation(wrap);
            return wrap;
        },
    });
    new Toolbar().addTo(map);
    setTimeout(() => {
        document.getElementById('tb-fit')?.addEventListener('click', fitAllMarkers);
        document.getElementById('tb-gps')?.addEventListener('click', getLocation);
    }, 100);
}


/* ════════════════════════════════════════
   SEARCH  (FIX #2 — correct payload logic)
════════════════════════════════════════ */

async function search(externalPayload = null) {
    let body;

    if (externalPayload) {
        /*
         * Called from GPS button: { lat, lon }
         * or from suggestion (via selectSuggestion → search())
         */
        body = {
            ...externalPayload,
            radius:   document.getElementById('radius').value,
            category: document.getElementById('category').value,
        };

    } else if (selectedCoords) {
        /*
         * FIX: User selected a suggestion (coords stored),
         * then clicked Search or pressed Enter.
         * Send exact coords — skip geocoding entirely.
         */
        body = {
            lat:      selectedCoords.lat,
            lon:      selectedCoords.lon,
            radius:   document.getElementById('radius').value,
            category: document.getElementById('category').value,
        };

    } else {
        /* Plain text search */
        const place = document.getElementById('place').value.trim();
        if (!place) {
            showToast('Please enter a location to search.', 'warning');
            document.getElementById('place').focus();
            return;
        }
        body = {
            place,
            radius:   document.getElementById('radius').value,
            category: document.getElementById('category').value,
        };
    }

    hideSuggestions();
    showLoader(true);

    try {
        const res  = await fetch('/search', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Search failed.');

        /* Clear stored coords after successful use */
        selectedCoords = null;

        renderResults(data);

    } catch (err) {
        showToast(err.message || 'Something went wrong. Please try again.', 'error');
        setResultsEmpty('Search failed. Check your location and try again.');
    } finally {
        showLoader(false);
    }
}


/* ════════════════════════════════════════
   AUTOCOMPLETE  (FIX #3, #4, #5, #6)
════════════════════════════════════════ */

let _debounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('place');

    input.addEventListener('input', function () {
        const q = this.value.trim();

        /* Reset stored coords when user types manually */
        selectedCoords = null;

        clearTimeout(_debounceTimer);

        if (q.length < 2) {
            hideSuggestions();
            return;
        }

        /* Show subtle loading state in dropdown */
        showSuggestionsLoading();

        _debounceTimer = setTimeout(() => fetchSuggestions(q), 350);
    });

    /* FIX #5: Enter key checks selectedCoords first */
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); search(); }
        if (e.key === 'Escape') hideSuggestions();

        /* Arrow-key navigation */
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            navigateSuggestions(e.key === 'ArrowDown' ? 1 : -1);
        }
    });

    /* Close dropdown when clicking outside */
    document.addEventListener('click', e => {
        const box   = document.getElementById('suggestions');
        const input = document.getElementById('place');
        if (!box.contains(e.target) && e.target !== input) {
            hideSuggestions();
        }
    });
});


async function fetchSuggestions(query) {
    try {
        const res  = await fetch(`/autocomplete?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        /* Backend returns { suggestions: [...] } */
        const list = data.suggestions ?? data;   // handle both shapes
        renderSuggestions(list);
    } catch {
        hideSuggestions();
    }
}


function renderSuggestions(list) {
    const box = document.getElementById('suggestions');

    if (!list || list.length === 0) {
        hideSuggestions();
        return;
    }

    /*
     * FIX #4: Never use inline onclick with string interpolation —
     * apostrophes in names (e.g. "St. Mary's") break it.
     * Use data attributes + event delegation instead.
     */
    box.innerHTML = list.map((item, i) => `
        <div class="suggestion-item" role="option"
             data-idx="${i}"
             data-name="${escAttr(item.display || item.name)}"
             data-lat="${item.lat}"
             data-lon="${item.lon}"
             data-type="${escAttr(item.type || 'Place')}">
            <span class="sug-icon">${categoryIconFor(item.type)}</span>
            <span class="sug-text">
                <span class="sug-main">${escHTML(item.display || item.name)}</span>
                <span class="sug-type">${escHTML(item.type || 'Place')}</span>
            </span>
        </div>
    `).join('');

    box.style.display = 'block';

    /* Single delegated click handler */
    box.onclick = (e) => {
        const item = e.target.closest('.suggestion-item');
        if (!item) return;
        selectSuggestion(
            item.dataset.name,
            parseFloat(item.dataset.lat),
            parseFloat(item.dataset.lon),
        );
    };
}


function showSuggestionsLoading() {
    const box = document.getElementById('suggestions');
    box.style.display = 'block';
    box.innerHTML = `<div class="sug-loading">
        <div class="sug-spinner"></div>
        <span>Searching…</span>
    </div>`;
}


/*
 * FIX #2 + #6: selectSuggestion stores coords AND triggers search.
 * Coords are exact — no geocoding needed.
 */
function selectSuggestion(name, lat, lon) {
    document.getElementById('place').value = name;
    selectedCoords = { lat, lon };
    hideSuggestions();
    search();   /* ← THIS WAS MISSING — the root cause of "map never moves" */
}


function hideSuggestions() {
    const box = document.getElementById('suggestions');
    box.style.display = 'none';
    box.innerHTML     = '';
    /* Remove active state from all items */
    _activeIdx = -1;
}


/* ── Arrow-key navigation ── */
let _activeIdx = -1;

function navigateSuggestions(direction) {
    const items = document.querySelectorAll('.suggestion-item');
    if (!items.length) return;

    items[_activeIdx]?.classList.remove('suggestion-item--active');
    _activeIdx = Math.max(0, Math.min(items.length - 1, _activeIdx + direction));
    const active = items[_activeIdx];
    active?.classList.add('suggestion-item--active');
    active?.scrollIntoView({ block: 'nearest' });

    /* Pre-fill input with highlighted item */
    if (active) {
        document.getElementById('place').value = active.dataset.name;
        selectedCoords = {
            lat: parseFloat(active.dataset.lat),
            lon: parseFloat(active.dataset.lon),
        };
    }
}


/* ── Icon for suggestion type ── */
function categoryIconFor(type) {
    const map = {
        Restaurant: '🍽', Health: '🏥', Hospital: '🏥',
        ATM: '💳',       Gym: '💪',    Pharmacy: '💊',
        School: '🎓',    Café: '☕',   Bank: '🏦',
        City: '🏙',      Town: '🏘',   Village: '🏡',
        Suburb: '📍',    Road: '🛣',   District: '🗺',
    };
    return map[type] || '📍';
}


/* ════════════════════════════════════════
   RENDER RESULTS + MARKERS
════════════════════════════════════════ */

function renderResults(data) {
    clearMap();

    const radiusKm = parseFloat(document.getElementById('radius').value);

    map.flyTo([data.lat, data.lon], 14, { duration: 1.4, easeLinearity: 0.2 });

    /* Dashed radius ring */
    userCircle = L.circle([data.lat, data.lon], {
        color:       '#0057FF',
        fillColor:   '#0057FF',
        fillOpacity: 0.04,
        weight:      1.5,
        dashArray:   '6 5',
        radius:      radiusKm * 1000,
    }).addTo(map);

    /* Center "You are here" marker */
    centerMarker = L.marker([data.lat, data.lon], {
        icon: buildCenterIcon(),
        zIndexOffset: 2000,
    }).addTo(map).bindPopup('<div class="popup-center">📍 Search origin</div>', {
        closeButton: false, offset: [0, -10],
    });

    const list   = document.getElementById('results-list');
    const header = document.getElementById('results-header');
    list.innerHTML = '';
    header.innerHTML = `
        <h3>${data.results.length} Location${data.results.length !== 1 ? 's' : ''} Found</h3>
        <p class="count-sub">Sorted by distance · ${radiusKm} km radius</p>
    `;

    if (data.results.length === 0) {
        list.innerHTML = emptyHTML('No services found. Try a larger radius or different category.');
        return;
    }

    data.results.forEach((place, i) => {
        const cfg    = CATEGORY[place.type] || CATEGORY.default;
        const marker = buildPlaceMarker(place, cfg);

        /* Staggered pop-in */
        setTimeout(() => {
            marker.addTo(map);
            requestAnimationFrame(() => {
                const el = marker.getElement();
                if (!el) return;
                el.style.cssText += 'opacity:0;transform:scale(0.3) translateY(6px);' +
                    'transition:opacity 0.25s ease,transform 0.3s cubic-bezier(0.34,1.56,0.64,1)';
                requestAnimationFrame(() => {
                    el.style.opacity   = '1';
                    el.style.transform = 'scale(1) translateY(0)';
                });
            });
        }, i * 50);

        marker.bindPopup(buildPopupHTML(place, cfg), {
            closeButton: false,
            offset:      [0, -16],
            maxWidth:    250,
            className:   'proxifind-popup',
        });

        markers.push({ marker, place, cfg });

        const card = buildCard(place, cfg, i);
        card.addEventListener('click', () => selectPlace(place, marker, card));
        list.appendChild(card);
    });
}


/* ════════════════════════════════════════
   MARKER BUILDERS
════════════════════════════════════════ */

function buildCenterIcon() {
    return L.divIcon({
        className:  '',
        iconAnchor: [10, 10],
        html: `<div class="marker-center">
                   <div class="marker-center__dot"></div>
                   <div class="marker-center__ring"></div>
               </div>`,
    });
}

function buildPlaceMarker(place, cfg) {
    return L.marker([place.lat, place.lon], {
        icon: L.divIcon({
            className:  '',
            iconAnchor: [16, 36],
            html: `<div class="marker-pin" style="--mc:${cfg.color}">
                       <span class="marker-pin__emoji">${cfg.emoji}</span>
                   </div>`,
        }),
        riseOnHover: true,
        riseOffset:  400,
    });
}

function buildPopupHTML(place, cfg) {
    return `<div class="popup-card">
        <div class="popup-icon" style="background:${cfg.color}20;color:${cfg.color}">${cfg.emoji}</div>
        <div class="popup-body">
            <strong class="popup-name">${escHTML(place.name)}</strong>
            <span class="popup-meta">${capitalize(place.type)} · <b>${place.distance} km</b></span>
        </div>
    </div>`;
}

function buildCard(place, cfg, i) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = `${i * 0.04}s`;
    card.innerHTML = `
        <div class="card-icon" style="background:${cfg.color}18;color:${cfg.color}">${cfg.emoji}</div>
        <div class="card-left">
            <div class="card-name">${escHTML(place.name)}</div>
            <div class="card-type">${capitalize(place.type)}</div>
        </div>
        <span class="dist-badge">${place.distance} km</span>
    `;
    return card;
}


/* ════════════════════════════════════════
   SELECTION — card ↔ marker ↔ map sync
════════════════════════════════════════ */

function selectPlace(place, marker, cardEl) {
    activeCardEl?.classList.remove('card--active');
    activeMarkerEl?.classList.remove('marker-pin--active');

    cardEl.classList.add('card--active');
    activeCardEl = cardEl;

    const pin = marker.getElement()?.querySelector('.marker-pin');
    if (pin) { pin.classList.add('marker-pin--active'); activeMarkerEl = pin; }

    map.flyTo([place.lat, place.lon], 17, { duration: 0.75, easeLinearity: 0.3 });
    setTimeout(() => marker.openPopup(), 550);

    cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fitAllMarkers() {
    if (!markers.length) return;
    const group = L.featureGroup(markers.map(m => m.marker));
    map.flyToBounds(group.getBounds().pad(0.18), { duration: 0.9, maxZoom: 15 });
}


/* ════════════════════════════════════════
   GPS
════════════════════════════════════════ */

function getLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by this browser.', 'error');
        return;
    }
    showLoader(true, 'Getting your location…');
    navigator.geolocation.getCurrentPosition(
        pos => {
            showLoader(false);
            search({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => {
            showLoader(false);
            showToast('Location access denied. Please enable GPS permissions.', 'error');
        },
        { timeout: 10000 }
    );
}


/* ════════════════════════════════════════
   THEME
════════════════════════════════════════ */

document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('proxifind-theme', next);
    if (map) refreshTiles();
});

function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}


/* ════════════════════════════════════════
   UTILS
════════════════════════════════════════ */

function clearMap() {
    markers.forEach(({ marker }) => map.removeLayer(marker));
    if (userCircle)   map.removeLayer(userCircle);
    if (centerMarker) map.removeLayer(centerMarker);
    markers = []; activeCardEl = null; activeMarkerEl = null;
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function setResultsEmpty(msg = '') {
    document.getElementById('results-header').innerHTML = '';
    document.getElementById('results-list').innerHTML   = emptyHTML(msg);
}

function emptyHTML(msg) {
    return `<div class="empty-state">
        <div class="empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.5">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
        </div><p>${msg}</p>
    </div>`;
}

/* Escape HTML to prevent XSS in place names */
function escHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* Escape for HTML attribute values (data-name etc.) */
function escAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ── Toast ── */
function showToast(message, type = 'info') {
    document.querySelector('.toast')?.remove();
    const colors = { info: '#0057FF', warning: '#f59e0b', error: '#ef4444', success: '#22c55e' };
    const t = document.createElement('div');
    t.className = 'toast';
    Object.assign(t.style, {
        position: 'fixed', bottom: '2rem', left: '50%',
        transform: 'translateX(-50%) translateY(10px)',
        background: 'var(--surface)', color: 'var(--text)',
        padding: '12px 22px', borderRadius: '12px',
        fontSize: '0.875rem', fontWeight: '500',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        zIndex: '10000', maxWidth: '380px', textAlign: 'center',
        borderLeft: `3px solid ${colors[type] || colors.info}`,
        opacity: '0', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        fontFamily: "'DM Sans',sans-serif", pointerEvents: 'none',
    });
    t.textContent = message;
    document.body.appendChild(t);
    requestAnimationFrame(() => {
        t.style.opacity = '1';
        t.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(-50%) translateY(10px)';
        setTimeout(() => t.remove(), 300);
    }, 3500);
}

/* ── Loader ── */
function showLoader(show, text = 'Searching nearby…') {
    document.getElementById('loader-text').textContent = text;
    document.getElementById('loading-overlay').classList.toggle('active', show);
}

/* ── Navbar shadow on scroll ── */
window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

/* ── Boot ── */
window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('proxifind-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    initMap();
});
