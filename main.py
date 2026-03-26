import math
import requests
from geopy.geocoders import Nominatim

# ================================================================
# SECTION 1: GEOGRAPHICAL CALCULATIONS
# ================================================================

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculates the distance between two points on Earth using the Haversine formula.
    Returns distance in kilometers.
    """
    R = 6371.0  # Earth's radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return round(R * c, 2)

# ================================================================
# SECTION 2: GEOCODING ENGINE (Global India Search)
# ================================================================

def get_coordinates(place_name):
    """
    Converts a place name string into Latitude and Longitude.
    Uses Photon API with a Geopy fallback for maximum accuracy in India.
    """
    if not place_name:
        return None, None

    # Ensuring search context remains within India
    search_query = f"{place_name.strip()}, India"

    # Method 1: Photon API (Fast & efficient)
    try:
        url = "https://photon.komoot.io/api/"
        res = requests.get(url, params={"q": search_query, "limit": 1}, timeout=10).json()
        if res.get("features"):
            coords = res["features"][0]["geometry"]["coordinates"]
            return float(coords[1]), float(coords[0])
    except Exception:
        pass # Silent fail to try next method

    # Method 2: Geopy Nominatim (Reliable fallback for Indian localities)
    try:
        geolocator = Nominatim(user_agent="india_service_finder_pro")
        location = geolocator.geocode(search_query, timeout=15)
        if location:
            return location.latitude, location.longitude
    except Exception:
        return None, None

    return None, None

# ================================================================
# SECTION 3: NEARBY PLACES FETCHING (Overpass API)
# ================================================================

def get_nearby_places_api(lat, lon, radius, category="All"):
    """
    Fetches nearby amenities from OpenStreetMap using the Overpass API.
    Supports NWR (Node, Way, Relation) queries for better data coverage.
    """
    url = "https://overpass-api.de/api/interpreter"
    
    # Pre-defined tag filters for common services
    tag_filter = '["amenity"~"restaurant|hospital|atm|school|gym|pharmacy|bank|cafe"]'
    if category != "All":
        tag_filter = f'["amenity"="{category}"]'

    # Overpass Query Logic
    query = f"""
    [out:json][timeout:25];
    (
      node(around:{radius},{lat},{lon}){tag_filter};
      way(around:{radius},{lat},{lon}){tag_filter};
      relation(around:{radius},{lat},{lon}){tag_filter};
    );
    out center;
    """

    try:
        response = requests.get(url, params={'data': query}, timeout=25)
        data = response.json()
        
        places = []
        for element in data.get('elements', []):
            # Extracting coordinates from either node or center of way/relation
            p_lat = element.get('lat') or element.get('center', {}).get('lat')
            p_lon = element.get('lon') or element.get('center', {}).get('lon')
            name = element.get('tags', {}).get('name', "Unnamed Place")
            p_type = element.get('tags', {}).get('amenity', "place")

            if p_lat and p_lon:
                places.append({
                    "name": name, 
                    "lat": p_lat, 
                    "lon": p_lon, 
                    "type": p_type
                })
        return places
    except Exception:
        return []