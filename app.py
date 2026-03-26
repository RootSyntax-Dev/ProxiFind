from flask import Flask, render_template, request, jsonify
from main import get_nearby_places_api, calculate_distance, get_coordinates

# Initializing Flask Application
app = Flask(__name__)

# ================================================================
# SECTION 1: MAIN ROUTE (Frontend Entry)
# ================================================================

@app.route("/")
def home():
    """
    Renders the main application page.
    """
    return render_template("index.html")

# ================================================================
# SECTION 2: SEARCH API ENDPOINT
# ================================================================

@app.route("/search", methods=["POST"])
def search():
    """
    Core API endpoint to process location search and find nearby services.
    Expected Payload: { 'place': str, 'radius': float, 'category': str }
    OR { 'lat': float, 'lon': float, 'radius': float, 'category': str }
    """
    data = request.json
    
    # 1. Parameter Extraction
    radius_km = float(data.get("radius", 3))
    category = data.get("category", "All")
    lat, lon = None, None

    # 2. Coordinate Resolution Logic (Search Input vs GPS)
    if data.get("place"):
        place_input = data.get("place")
        lat, lon = get_coordinates(place_input)
    elif "lat" in data and "lon" in data:
        lat, lon = float(data["lat"]), float(data["lon"])

    # 3. Error Handling for Invalid Locations
    if lat is None or lon is None:
        return jsonify({
            "error": "Location not found. Please try adding more details (e.g., Area, City)."
        }), 404

    # 4. Fetching Data from Overpass API
    # Converting radius to meters for API compatibility
    raw_places = get_nearby_places_api(lat, lon, int(radius_km * 1000), category)

    # 5. Result Filtering and Distance Calculation
    results = []
    for p in raw_places:
        dist = calculate_distance(lat, lon, p["lat"], p["lon"])
        if dist <= radius_km:
            p["distance"] = dist
            results.append(p)

    # 6. Sorting Results by Proximity
    results.sort(key=lambda x: x["distance"])
    
    # Returning final optimized JSON response
    return jsonify({
        "lat": lat, 
        "lon": lon, 
        "results": results[:30] # Returning top 30 most relevant places
    }), 200

# ================================================================
# SECTION 3: SERVER EXECUTION
# ================================================================

if __name__ == "__main__":
    # Running in Debug mode for local development
    app.run(debug=True)