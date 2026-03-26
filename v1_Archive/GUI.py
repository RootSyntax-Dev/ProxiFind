"""
================================================================
PROJECT: Proximity-Based Service Finder (Streamlit Archive)
DESCRIPTION: This is the GUI-based version using Streamlit and Folium.
NOTE: This version is kept for internal storage and fast prototyping.
================================================================
"""

import streamlit as st
import folium
from streamlit_folium import st_folium
from streamlit_js_eval import get_geolocation

# Importing core logic from main engine
from main import get_nearby_places_api, get_coordinates, calculate_distance

# ================================================================
# SECTION 1: PAGE CONFIGURATION & UI HEADER
# ================================================================
st.set_page_config(page_title="Nearby Finder GUI", page_icon="📍")
st.title("📍 Nearby Finder (Streamlit Edition)")

# Sidebar for Filters
with st.sidebar:
    st.header("🔍 Search Filters")
    category = st.selectbox(
        "Select Category",
        ["All", "restaurant", "hospital", "atm", "school", "gym"]
    )
    radius = st.slider("Select radius (km)", 0.5, 10.0, 3.0)

# ================================================================
# SECTION 2: LOCATION RESOLUTION (Search vs GPS)
# ================================================================
place_name = st.text_input("Enter location (e.g. Indrapuri, Bhopal)")
loc = get_geolocation()

curr_lat, curr_lon = None, None

# Priority 1: User Text Input
if place_name:
    lat, lon = get_coordinates(place_name)
    if lat and lon:
        curr_lat, curr_lon = lat, lon
        st.success(f"Results for: {place_name}")
    else:
        st.error("Location not found 😢")

# Priority 2: Real-time GPS Geolocation
elif loc:
    curr_lat = loc['coords']['latitude']
    curr_lon = loc['coords']['longitude']
    st.info("Using real-time GPS location 🛰️")

else:
    st.warning("Please enter a location or allow GPS access.")

# ================================================================
# SECTION 3: CORE SEARCH & DATA PROCESSING
# ================================================================
if curr_lat and curr_lon:
    
    if st.button("🚀 Find Nearby Places"):
        # Fetching data from Overpass API via main engine
        raw_data = get_nearby_places_api(curr_lat, curr_lon, int(radius * 1000))

        # Filter by category if not "All"
        if category != "All":
            raw_data = [p for p in raw_data if p.get("type") == category]

        results = []
        for place in raw_data:
            dist = calculate_distance(curr_lat, curr_lon, place["lat"], place["lon"])
            
            # Distance safety check
            if dist <= radius:
                results.append({
                    "name": place["name"],
                    "lat": place["lat"],
                    "lon": place["lon"],
                    "distance": round(dist, 2),
                    "type": place.get("type", "other")
                })

        # Persisting results in session state
        st.session_state["results"] = results
        st.session_state["user_location"] = (curr_lat, curr_lon)
        st.session_state["radius"] = radius

# ================================================================
# SECTION 4: MAP RENDERING (Folium Integration)
# ================================================================
if "results" in st.session_state:
    results = st.session_state["results"]
    u_lat, u_lon = st.session_state["user_location"]
    u_radius = st.session_state["radius"]

    # Creating Folium Map Instance
    m = folium.Map(location=[u_lat, u_lon], zoom_start=14)

    # Adding User Location Marker (Blue)
    folium.Marker(
        [u_lat, u_lon],
        popup="Starting Point",
        icon=folium.Icon(color='blue', icon='info-sign')
    ).add_to(m)

    # Drawing Radius Circle
    folium.Circle(
        location=[u_lat, u_lon],
        radius=u_radius * 1000,
        color='blue',
        fill=True,
        fill_opacity=0.1
    ).add_to(m)

    # Adding Service Markers (Red)
    for place in results:
        folium.Marker(
            [place["lat"], place["lon"]],
            popup=f"{place['name']} ({place['distance']} km)",
            icon=folium.Icon(color='red', icon='map-marker')
        ).add_to(m)

    # Displaying Map in Streamlit
    st_folium(m, width=700, height=500)

    # ================================================================
    # SECTION 5: RESULTS LISTING (Categorized View)
    # ================================================================
    st.subheader("📋 Nearby Places List")

    if results:
        # Grouping results by category for better readability
        grouped = {}
        for place in results:
            cat = place["type"]
            grouped.setdefault(cat, []).append(place)

        for cat, places in grouped.items():
            st.markdown(f"#### 🏷️ {cat.capitalize()}")
            for p in places:
                st.markdown(
                    f"""
                    <div style="background-color:#1e293b; padding:12px; border-radius:10px; margin-bottom:10px; border:1px solid #334155;">
                        <span style="color:white; font-weight:bold;">{p['name']}</span><br>
                        <span style="color:#94a3b8; font-size:0.9rem;">📍 {p['distance']} km away</span>
                    </div>
                    """,
                    unsafe_allow_html=True
                )
    else:
        st.warning("No services found within the selected radius.")