/* ================================================================
SECTION 1: GLOBAL CONFIGURATION & INITIALIZATION
================================================================
*/

// Initializing map centered at a default location (Bhopal)
let map = L.map("map").setView([23.25, 77.41], 13);

// Adding OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

// Global state management
let markers = [];
let circle;
let routingControl = null;
let userCoords = null;
let originMarker = null; // 🔥 Naya variable origin marker track karne ke liye

/**
 * Returns emoji icon based on amenity type
 */
function getIcon(type) {
  const icons = {
    restaurant: "🍔",
    hospital: "🏥",
    atm: "🏧",
    school: "🏫",
    gym: "💪",
  };
  return icons[type] || "📍";
}

/* ================================================================
SECTION 2: USER LOCATION & INPUT HANDLING
================================================================ */

function getLocation() {
  if (navigator.geolocation) {
    document.getElementById("results").innerHTML =
      "<div class='loader'>Getting your GPS... 🛰️</div>";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        document.getElementById("place").value = "";
        performSearch({ lat, lon });
      },
      () => {
        Swal.fire({
          icon: "error",
          title: "GPS Denied",
          text: "Please enable GPS access.",
        });
      },
    );
  } else {
    alert("Geolocation is not supported by this browser.");
  }
}

async function search() {
  const placeName = document.getElementById("place").value;

  if (!placeName) {
    Swal.fire({
      title: "Opps!",
      text: "Please enter a location name.",
      icon: "warning",
      width: "auto",
      maxWidth: "320px",
      background: document.body.classList.contains("light-mode")
        ? "#ffffff"
        : "#1e293b",
      color: document.body.classList.contains("light-mode")
        ? "#1e293b"
        : "#f1f5f9",
      confirmButtonColor: "#10b981",
      confirmButtonText: "Got it!",
    });
    return;
  }

  document.getElementById("results").innerHTML =
    "<div class='loader'>Finding location... 🔍</div>";

  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}`,
    );
    const geoData = await geoRes.json();

    if (geoData.length > 0) {
      const lat = parseFloat(geoData[0].lat);
      const lon = parseFloat(geoData[0].lon);
      performSearch({ lat, lon });
    } else {
      Swal.fire({
        icon: "info",
        title: "Not Found",
        text: "Bhai ye jagah nahi mil rahi, sahi se naam likho!",
      });
      document.getElementById("results").innerHTML = "";
    }
  } catch (error) {
    console.error(error);
    document.getElementById("results").innerHTML = "<h2>Geocoding error.</h2>";
  }
}

/* ================================================================
SECTION 3: CORE SEARCH ENGINE & API INTERACTION
================================================================
*/

async function performSearch(payload) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "<div class='loader'>Searching nearby... ⏳</div>";

  payload.radius = document.getElementById("radius").value;
  payload.category = document.getElementById("category").value;

  try {
    const res = await fetch("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.error) {
      resultsDiv.innerHTML = `<h2 style="color:#f87171">${data.error}</h2>`;
      return;
    }

    userCoords = [data.lat, data.lon];

    // 🔥 UI RESET: Purane layers aur markers ko map se remove karna zaroori hai
    if (circle) map.removeLayer(circle);
    if (routingControl) map.removeControl(routingControl);
    if (originMarker) map.removeLayer(originMarker); // Purana origin hatao

    // Saare purane markers ko loop chala kar remove karo
    markers.forEach((m) => map.removeLayer(m));
    markers = []; // Phir array reset karo

    map.setView([data.lat, data.lon], 14);

    circle = L.circle([data.lat, data.lon], {
      color: "#10b981",
      radius: payload.radius * 1000,
      fillOpacity: 0.1,
    }).addTo(map);

    // Origin marker ko variable mein store karo taaki next time remove kar sakein
    originMarker = L.marker([data.lat, data.lon])
      .addTo(map)
      .bindPopup("<b>Your Location</b>");

    let html = `<h2>Found ${data.results.length} Places</h2>`;
    data.results.forEach((p) => {
      const m = L.marker([p.lat, p.lon]).addTo(map);

      const popupContent = `
                <div style="text-align:center; color:black;">
                    <b style="font-size:1.1rem;">${p.name}</b><br>${p.distance} km away<br>
                    <button onclick="getDirections(${p.lat}, ${p.lon})" 
                            style="background:#3b82f6; color:white; border:none; padding:8px 12px; border-radius:8px; margin-top:10px; cursor:pointer; font-weight:bold;">
                        Get Route 🚗
                    </button>
                </div>
            `;
      m.bindPopup(popupContent);
      m._icon.style.filter = "hue-rotate(150deg)";
      markers.push(m);

      html += `
                <div class="card" onclick="handleCardClick(${p.lat}, ${p.lon})">
                    <div class="card-icon">${getIcon(p.type)}</div>
                    <div class="card-body">
                        <h3>${p.name}</h3>
                        <p>📍 ${p.distance} km away • Tap for Directions</p>
                    </div>
                </div>
            `;
    });
    resultsDiv.innerHTML = html;
  } catch (e) {
    resultsDiv.innerHTML =
      "<h2>Server communication error. Please try again.</h2>";
  }
}

/* ================================================================
SECTION 4: ROUTING & INTERACTION LOGIC
================================================================
*/

function handleCardClick(lat, lon) {
  getDirections(lat, lon);
  document.getElementById("map").scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

function getDirections(destLat, destLon) {
  if (!userCoords) return alert("Search a location first!");

  if (routingControl) map.removeControl(routingControl);

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(userCoords[0], userCoords[1]),
      L.latLng(destLat, destLon),
    ],
    lineOptions: {
      styles: [{ color: "#3b82f6", weight: 6, opacity: 0.8 }],
    },
    createMarker: function () {
      return null;
    },
    addWaypoints: false,
    fitSelectedRoutes: true,
    collapsible: false,
  }).addTo(map);

  map.closePopup();
}

/* ================================================================
SECTION 5: THEME TOGGLE LOGIC
================================================================ */
const themeCheckbox = document.getElementById("theme-checkbox");

themeCheckbox.addEventListener("change", () => {
  if (themeCheckbox.checked) {
    document.body.classList.add("light-mode");
  } else {
    document.body.classList.remove("light-mode");
  }
});
