# ════════════════════════════════════════════════════
#  ProxiFind · app.py
#  Flask routes — home · /search · /autocomplete
# ════════════════════════════════════════════════════

import os
import sys
import time
import logging
from flask import Flask, render_template, request, jsonify
from main import (
    get_autocomplete_suggestions,
    get_coordinates,
    get_nearby_places_api,
    calculate_distance,
)

# ── App setup ──
def resource_path(rel: str) -> str:
    base = getattr(sys, "_MEIPASS", os.path.abspath("."))
    return os.path.join(base, rel)

app = Flask(__name__)
app.template_folder = resource_path("templates")
app.static_folder   = resource_path("static")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# ── Simple in-process TTL cache for autocomplete ──
_ac_cache: dict = {}
_AC_TTL    = 120   # seconds
_AC_MAX    = 500   # max entries before eviction


def _ac_get(key: str):
    entry = _ac_cache.get(key)
    if entry and (time.time() - entry[0]) < _AC_TTL:
        return entry[1]
    return None


def _ac_set(key: str, value):
    if len(_ac_cache) >= _AC_MAX:
        oldest = sorted(_ac_cache, key=lambda k: _ac_cache[k][0])
        for k in oldest[: _AC_MAX // 5]:
            _ac_cache.pop(k, None)
    _ac_cache[key] = (time.time(), value)


# ════════════════════════════════════════
#  ROUTES
# ════════════════════════════════════════

@app.route("/")
def home():
    return render_template("index.html")


# ── GET /autocomplete?q=<query> ──
@app.route("/autocomplete")
def autocomplete():
    """
    Returns structured suggestion objects:
      { suggestions: [{name, display, lat, lon, type}, …] }
    Minimum 2 chars required to trigger a lookup.
    """
    query = request.args.get("q", "").strip()

    if len(query) < 2:
        return jsonify({"suggestions": []})

    cache_key = query.lower()
    cached    = _ac_get(cache_key)
    if cached is not None:
        return jsonify({"suggestions": cached, "cached": True})

    try:
        suggestions = get_autocomplete_suggestions(query, limit=7)
        _ac_set(cache_key, suggestions)
        return jsonify({"suggestions": suggestions})
    except Exception:
        log.exception("Error in /autocomplete for query '%s'", query)
        return jsonify({"suggestions": []}), 500


# ── POST /search ──
@app.route("/search", methods=["POST"])
def search():
    """
    Accepts two mutually-exclusive payloads:
      A) { lat, lon, radius, category }          ← GPS / suggestion-selected
      B) { place, radius, category }             ← typed text search
    Returns: { lat, lon, results[], count, status }
    """
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "Invalid request body."}), 400

        # ── Radius ──
        try:
            radius_km = max(0.5, min(20.0, float(data.get("radius", 2))))
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid radius value."}), 400

        category = str(data.get("category", "All"))
        lat = lon = None

        # ── Path A: explicit coordinates (GPS or suggestion) ──
        raw_lat = data.get("lat")
        raw_lon = data.get("lon")

        if raw_lat is not None and raw_lon is not None:
            try:
                lat, lon = float(raw_lat), float(raw_lon)
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid coordinates."}), 400

        # ── Path B: place name ──
        elif data.get("place"):
            lat, lon = get_coordinates(data["place"].strip())
            if lat is None or lon is None:
                return jsonify({
                    "error": "Location not found. Try a more specific name or use GPS."
                }), 404
        else:
            return jsonify({
                "error": "Provide a place name or coordinates."
            }), 400

        # ── Fetch & filter nearby places ──
        radius_m = int(radius_km * 1000)
        raw      = get_nearby_places_api(lat, lon, radius_m, category)

        results = []
        for place in raw:
            if not (place.get("lat") and place.get("lon")):
                continue
            dist = calculate_distance(lat, lon, place["lat"], place["lon"])
            if dist <= radius_km:
                place["distance"] = dist
                results.append(place)

        results.sort(key=lambda x: x["distance"])

        log.info(
            "Search: place='%s' lat=%s lon=%s | cat=%s | r=%.1fkm → %d results",
            data.get("place", "—"), lat, lon, category, radius_km, len(results),
        )

        return jsonify({
            "lat":     lat,
            "lon":     lon,
            "results": results[:25],
            "count":   len(results),
            "status":  "success",
        })

    except Exception:
        log.exception("Unhandled error in /search")
        return jsonify({"error": "An unexpected error occurred."}), 500


# ── Dev server ──
if __name__ == "__main__":
    app.run(debug=True, port=5000, host="0.0.0.0")
