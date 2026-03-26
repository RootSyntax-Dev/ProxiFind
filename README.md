# 📍 India Service Finder (Proximity-Based Search)

A professional Full-Stack Web Application to find nearby essential services (Hospitals, ATMs, Restaurants, etc.) across India with integrated real-time routing.

## 🚀 Key Features
- **Global India Search**: Locate any city or area using Photon & Geopy API fallback.
- **Live Directions**: Integrated Leaflet Routing Machine for turn-by-turn visual paths.
- **Smart Filtering**: Categorized results with distance-based sorting (Haversine Formula).
- **Modern UI**: Fully responsive Glassmorphism design with a fixed blurred header.



## 🛠️ Tech Stack
- **Backend**: Python (Flask)
- **Frontend**: HTML5, CSS3 (Modern Grid/Flexbox), JavaScript (ES6)
- **Maps**: Leaflet.js, OpenStreetMap (Overpass API)

## 📂 Project Structure
- `app.py`: Main Flask application (The Bridge).
- `main.py`: Backend logic for Geocoding and API calls (The Engine).
- `static/`: Contains `style.css` (UI) and `script.js` (Map Logic).
- `templates/`: Contains `index.html` (Main Page).
- `v1_Archive/`: Previous versions and experimental logic.

## ⚙️ How to Run
1. Clone the repository.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt