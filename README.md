# 📍 India Service Finder (Proximity-Based Search)

<p align="center">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white" />
</p>

A professional **Full-Stack Web Application** designed to help users locate essential services like Hospitals, ATMs, and Restaurants across India. Built with real-time routing and a sleek Glassmorphism UI.


## ✨ Key Features

* 🌍 **Global India Search:** Accurate location finding using Photon & Geopy API.
* 🛣️ **Live Directions:** Visual turn-by-turn paths using Leaflet Routing Machine.
* 🎯 **Smart Filtering:** Categorized results sorted by distance (Haversine Formula).
* 🎨 **Modern UI:** Responsive Glassmorphism design with Dark/Light mode support.


## 📸 UI Dashboards & Screenshots

A visual overview of the Proximity Service Finder across different devices and themes.

### 📱 Mobile Dashboard (Light & Dark Mode)
| **Bangaluru (Dark)** | **Bangaluru (Light)** | **Marine Drive (Light)** |
| :---: | :---: | :---: |
| <img src="Output-images/Mobile-Dashboard/Bangaluru-Dark.png" width="220"> | <img src="Output-images/Mobile-Dashboard/Bangaluru-Light.png" width="220"> | <img src="Output-images/Mobile-Dashboard/Marine-Drive-Light.png" width="220"> |

| **GPS Tracking (Dark)** | **GPS Tracking (Light)** | **Places Card** |
| :---: | :---: | :---: |
| <img src="Output-images/Mobile-Dashboard/GPS-Location-Dark.png" width="220"> | <img src="Output-images/Mobile-Dashboard/GPS-Location-Light.png" width="220"> | <img src="Output-images/Mobile-Dashboard/Places-Card-Light.png" width="220"> |


### 💻 Desktop Dashboard
| **Bhopal Junction (Dark Theme)** | **Indore Airport (Light Theme)** |
| :---: | :---: |
| ![PC Dark](Output-images/PC-Dashboard/Bhopal-junction-Dark.png) | ![PC Light](Output-images/PC-Dashboard/Indore-airport-Light.png) |

| **Categories & Filtering** | **Detailed Places View** |
| :---: | :---: |
| ![Categories](Output-images/PC-Dashboard/Categories-Filter.png) | ![Places](Output-images/PC-Dashboard/Places-Card.png) |


### 🗺️ Location-Specific Previews
| **Marine Drive (Dark)** | **Indore Airport (Dark)** |
| :---: | :---: |
| ![Marine Dark](Output-images/PC-Dashboard/Marine-Drive-Dark.png) | ![Indore Dark](Output-images/PC-Dashboard/Indore-airport-Dark.png) |


## 🛠️ Tech Stack

- **Backend:** `Python` (Flask)
- **Frontend:** `HTML5`, `CSS3` (Glassmorphism), `JavaScript` (ES6)
- **Maps & Location:** `Leaflet.js`, `OpenStreetMap`, `Overpass API`
- **Mathematics:** `Haversine Formula` for distance calculation.


## 📂 Project Structure

```text
PROXIMITY-SERVICE-FINDER/
├── app.py                 
├── main.py                
├── requirements.txt       
├── Output-images/         
│   ├── Mobile-Dashboard/   
│   └── PC-Dashboard/       
├── static/              
│   ├── style.css
│   └── script.js
└── templates/              
    └── index.html
````
## ⚙️ How to Run
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/RootSyntax-Dev/ProxiFind.git](https://github.com/RootSyntax-Dev/ProxiFind.git)
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application:**
   ```bash
   python app.py

## 👤 Author

**Vinay Shah**
* 🎓 **Final Year B.Tech Student (CSE-AIML)**
* 💻 **Passionate Developer & AI Enthusiast**
* 🌐 **GitHub:** [@RootSyntax-Dev](https://github.com/RootSyntax-Dev)

<p align="center">
  <br>
  <a href="https://www.linkedin.com/in/vinay-py-dev/">
    <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>
  <br><br>
  Developed with ❤️ by <b>RootSyntax-Dev</b>
</p>
