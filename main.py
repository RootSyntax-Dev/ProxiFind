# ════════════════════════════════════════════════════
#  ProxiFind · main.py
#  Geocoding, autocomplete, place fetching, distance
# ════════════════════════════════════════════════════

import math
import logging
import requests
from functools import lru_cache
from geopy.geocoders import Nominatim

log = logging.getLogger(__name__)

# ── API endpoints ──
PHOTON_URL    = "https://photon.komoot.io/api/"
OVERPASS_URL  = "https://overpass-api.de/api/interpreter"
TIMEOUT_FAST  = 6
TIMEOUT_SLOW  = 22

# ── Amenity config ──
AMENITY_FILTER = '["amenity"~"restaurant|hospital|atm|school|gym|pharmacy|bank|cafe"]'
CATEGORY_MAP   = {
    "restaurant": "restaurant", "hospital": "hospital",
    "atm":        "atm",        "gym":      "gym",
    "pharmacy":   "pharmacy",   "school":   "school",
    "cafe":       "cafe",       "bank":     "bank",
}

# ── OSM value → readable label ──
OSM_LABELS = {
    "city": "City", "town": "Town", "village": "Village",
    "suburb": "Suburb", "neighbourhood": "Neighbourhood",
    "state": "State",   "county": "District",
    "road":  "Road",    "street": "Street",
    "restaurant": "Restaurant", "hospital": "Hospital",
    "cafe": "Café",    "bank": "Bank",
    "pharmacy": "Pharmacy",     "school": "School",
    "atm": "ATM",      "gym": "Gym",
}


# ════════════════════════════════════════
#  AUTOCOMPLETE
# ════════════════════════════════════════

def get_autocomplete_suggestions(query: str, limit: int = 7) -> list:
    """
    Return up to `limit` location suggestions.
    Uses Photon as primary, Nominatim as fallback.
    No country bias — works globally.
    """
    query = query.strip()
    if not query:
        return []

    results = _photon_suggest(query, limit)

    # Top-up from Nominatim if Photon returned very few
    if len(results) < 3:
        fallback = _nominatim_suggest(query, limit)
        seen = {(_r3(r["lat"]), _r3(r["lon"])) for r in results}
        for r in fallback:
            key = (_r3(r["lat"]), _r3(r["lon"]))
            if key not in seen:
                results.append(r)
                seen.add(key)

    return results[:limit]


def _photon_suggest(query: str, limit: int) -> list:
    """Photon (Komoot) — fast, OSM-backed."""
    try:
        resp = requests.get(
            PHOTON_URL,
            params={"q": query, "limit": limit, "lang": "en"},
            timeout=TIMEOUT_FAST,
            headers={"User-Agent": "ProxiFind/4.0"},
        )
        resp.raise_for_status()
        features = resp.json().get("features", [])

        suggestions = []
        for f in features:
            props  = f.get("properties", {})
            coords = f["geometry"]["coordinates"]

            name    = (props.get("name") or props.get("city") or
                       props.get("town") or props.get("state") or "Unknown")
            city    = props.get("city", "")
            state   = props.get("state", "")
            country = props.get("country", "")

            # Build display string: "Name, City, Country"
            parts   = [p for p in [city, state, country] if p and p != name]
            display = f"{name}, {', '.join(parts[:2])}" if parts else name

            osm_val    = props.get("osm_value", "") or props.get("type", "")
            type_label = OSM_LABELS.get(osm_val, "Place")

            suggestions.append({
                "name":    name,
                "display": display,
                "lat":     float(coords[1]),
                "lon":     float(coords[0]),
                "type":    type_label,
            })

        return suggestions

    except Exception as exc:
        log.warning("Photon autocomplete error: %s", exc)
        return []


def _nominatim_suggest(query: str, limit: int) -> list:
    """Nominatim — broader coverage fallback."""
    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q":               query,
                "format":          "jsonv2",
                "limit":           limit,
                "addressdetails":  1,
                "accept-language": "en",
            },
            timeout=TIMEOUT_FAST,
            headers={"User-Agent": "ProxiFind/4.0"},
        )
        resp.raise_for_status()

        suggestions = []
        for item in resp.json():
            addr  = item.get("address", {})
            name  = (item.get("name") or addr.get("city") or
                     addr.get("town") or addr.get("village") or
                     item.get("display_name", "").split(",")[0])
            state   = addr.get("state", "")
            country = addr.get("country", "")
            parts   = [p for p in [state, country] if p]
            display = f"{name}, {', '.join(parts[:2])}" if parts else name
            osm_val = item.get("type", "place")

            suggestions.append({
                "name":    name,
                "display": display,
                "lat":     float(item["lat"]),
                "lon":     float(item["lon"]),
                "type":    OSM_LABELS.get(osm_val, "Place"),
            })

        return suggestions

    except Exception as exc:
        log.warning("Nominatim autocomplete error: %s", exc)
        return []


# ════════════════════════════════════════
#  SINGLE GEOCODE  (for /search via text)
# ════════════════════════════════════════

@lru_cache(maxsize=512)
def get_coordinates(place_name: str):
    """
    Resolve a place name → (lat, lon).
    Primary: Photon. Fallback: geopy Nominatim.
    NO country bias so any global city works.
    """
    query = place_name.strip()

    # Primary — Photon
    try:
        res = requests.get(
            PHOTON_URL,
            params={"q": query, "limit": 1, "lang": "en"},
            timeout=TIMEOUT_FAST,
            headers={"User-Agent": "ProxiFind/4.0"},
        ).json()
        features = res.get("features", [])
        if features:
            coords = features[0]["geometry"]["coordinates"]
            log.info("Photon resolved '%s' → %s, %s", query, coords[1], coords[0])
            return float(coords[1]), float(coords[0])
    except Exception:
        log.warning("Photon single-geocode failed for '%s'", place_name)

    # Fallback — geopy Nominatim
    try:
        geo      = Nominatim(user_agent="proxifind_v4")
        location = geo.geocode(query, timeout=10)
        if location:
            log.info("Nominatim resolved '%s' → %s, %s", query,
                     location.latitude, location.longitude)
            return float(location.latitude), float(location.longitude)
    except Exception:
        log.warning("Nominatim single-geocode failed for '%s'", place_name)

    return None, None


# ════════════════════════════════════════
#  PLACE FETCHING  (Overpass API)
# ════════════════════════════════════════

def get_nearby_places_api(lat: float, lon: float, radius: int,
                          category: str = "All") -> list:
    """Fetch nearby amenities via Overpass. Returns [] on any failure."""
    tag_filter = (
        f'["amenity"="{CATEGORY_MAP[category]}"]'
        if category != "All" and category in CATEGORY_MAP
        else AMENITY_FILTER
    )

    query = f"""
    [out:json][timeout:{TIMEOUT_SLOW}];
    (
      node(around:{radius},{lat},{lon}){tag_filter};
      way(around:{radius},{lat},{lon}){tag_filter};
    );
    out center;
    """

    try:
        resp = requests.get(
            OVERPASS_URL,
            params={"data": query},
            timeout=TIMEOUT_SLOW + 5,
            headers={"User-Agent": "ProxiFind/4.0"},
        )
        resp.raise_for_status()
        data = resp.json()

        places = []
        for el in data.get("elements", []):
            tags  = el.get("tags", {})
            name  = tags.get("name", "").strip() or "Unnamed Facility"
            p_lat = el.get("lat") or el.get("center", {}).get("lat")
            p_lon = el.get("lon") or el.get("center", {}).get("lon")

            if p_lat is None or p_lon is None:
                continue

            places.append({
                "name": name,
                "lat":  float(p_lat),
                "lon":  float(p_lon),
                "type": tags.get("amenity", "point"),
            })

        log.info("Overpass returned %d elements for r=%dm at (%s,%s)",
                 len(places), radius, lat, lon)
        return places

    except requests.exceptions.Timeout:
        log.error("Overpass API timed out (r=%dm)", radius)
    except requests.exceptions.RequestException as exc:
        log.error("Overpass request error: %s", exc)
    except Exception as exc:
        log.exception("Unexpected Overpass error: %s", exc)

    return []


# ════════════════════════════════════════
#  DISTANCE
# ════════════════════════════════════════

def calculate_distance(lat1: float, lon1: float,
                       lat2: float, lon2: float) -> float:
    """Haversine distance in km, rounded to 2dp."""
    R    = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a    = (math.sin(dphi / 2) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2)
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


def _r3(v: float) -> float:
    return round(v, 3)
