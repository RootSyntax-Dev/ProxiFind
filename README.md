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
```text
ProxiFind/
├── app.py
├── main.py
├── requirements.txt
├── README.md
├── static/
│   ├── style.css
│   ├── script.js
│   └── favicon.png
├── templates/
│   └── index.html
└── v1_Archive/
```

## ⚙️ How to Run
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/ProxiFind.git](https://github.com/your-username/ProxiFind.git)
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application:**
   ```bash
   python app.py
