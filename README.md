# VoltPath ⚡

> **Physics-informed thermal and terrain energy intelligence for commercial Indian 2W EV delivery fleets.**

Real-world range for commercial 2-wheeler EVs (e.g., Zepto, Blinkit, Zomato, Swiggy Instamart) collapses by up to **40%** under extreme operating conditions: **42°C+ summer heatwaves**, **120kg grocery payloads**, and **rough/graded roads with flyovers**.

Standard flat-earth GPS routing treats distance as the sole metric, dispatching riders on shortest-distance paths that induce severe battery thermal throttling, deep discharge stalls, and roadside breakdown costs. **VoltPath** replaces naive routing with a physics-based, energy-optimal dispatch engine.

---

## 🚀 Key Features

- **Tractive Force Dynamics**: Calculates rolling resistance ($C_{rr}$ adjusted for smooth vs potholed roads), aerodynamic drag (with temperature-dependent air density), terrain gradient force, and inertial stop-and-go acceleration forces.
- **Arrhenius Thermal Modeling**: Simulates non-linear cell internal resistance surges above 40°C, pack Joule heating ($I^2 R$), convective heat dissipation, and triggers BMS thermal derating warnings at 45°C.
- **Split Route Comparison**:
  - **Route A ("Standard Flat Route")**: Naive shortest distance via Domlur flyover ramp (+7.8% grade) and broken pavement; shows severe thermal spike to 46.8°C and a simulated deep-discharge stall alert (<12% SoC) at km 7.4.
  - **Route B ("VoltPath Energy-Aware Route")**: Grade-mitigated arterial path via Old Airport Road through shaded tree canopies, smooth tarmac, and regenerative descent; arrives safely with 24% SoC remaining.
- **Dynamic Safe-Reach Contour (Isochrone)**: Generates an irregular 24-sector polygon around the vehicle reflecting true directional reach based on remaining battery SoC, ambient heat, payload mass, and terrain slope.
- **Battery Swap Station Integration**: Displays real-time swap stations (Battery Smart, Sun Mobility, Ather Grid) with bay availability and swap durations before riders enter deep discharge.
- **AIS-140 CAN-Bus Telemetry Stream**: Simulates MoRTH-standard AIS-140 NMEA sentences with XOR checksums, paired with an interactive gauge cluster (Speed, Battery SoC, Pack Temp, Voltage, Current) and raw hex terminal stream.
- **Interactive Trip Simulation**: Play, pause, scrub timeline, and adjust playback speed (1x, 2x, 5x) with an animated vehicle tracking marker.
- **Fleet ROI Metrics**: Computes monthly per-vehicle savings (**₹1,200/mo**) from avoiding roadside towings (₹800), battery thermal degradation (₹250), and delivery SLA delay penalties (₹150).

---

## 📐 Mathematical Formulation

### 1. Tractive Force Equation
$$F_{\text{total}} = F_{\text{rolling}} + F_{\text{drag}} + F_{\text{gradient}} + F_{\text{inertial}}$$

- **Rolling Resistance**:
  $$F_{\text{rolling}} = C_{rr} \cdot m \cdot g \cdot \cos(\theta)$$
  - Smooth Tarmac: $C_{rr} = 0.012$
  - Rough City Road: $C_{rr} = 0.022$
  - Broken Surface / Monsoon Potholes: $C_{rr} = 0.036$
- **Aerodynamic Drag**:
  $$F_{\text{drag}} = 0.5 \cdot \rho_{\text{air}}(T_{\text{amb}}) \cdot C_d \cdot A \cdot v^2$$
  - Temperature-corrected air density: $\rho_{\text{air}} = \frac{P}{R_{\text{spec}} \cdot T_{\text{kelvin}}}$
  - Frontal area with rear insulated cargo box: $C_d \cdot A \approx 0.55\text{ m}^2$
- **Gradient Resistance**:
  $$F_{\text{gradient}} = m \cdot g \cdot \sin(\theta)$$
  - Slope angle $\theta = \arctan(\Delta h / \Delta d)$ derived from terrain elevation profiles.
- **Inertial Resistance**:
  $$F_{\text{inertial}} = m \cdot a$$
- **Total Mass ($m$)**:
  $$m = m_{\text{curb}} + m_{\text{rider}} (70\text{ kg}) + m_{\text{payload}} (0 - 140\text{ kg})$$

### 2. Arrhenius Cell Internal Resistance & Thermal Balance
- **Internal Resistance Surge above 40°C**:
  $$R_{\text{int}}(T) = R_0 \cdot \left(1 + 0.085 \cdot \max(0, T_{\text{pack}} - 40)^{1.65}\right)$$
- **Thermal Transient Differential Equation**:
  $$\frac{dT_{\text{pack}}}{dt} = \frac{I^2 R_{\text{int}}(T) - h_{\text{conv}} \cdot A \cdot (T_{\text{pack}} - T_{\text{amb}})}{C_{\text{thermal}}}$$
  - Thermal Throttling: Activated when $T_{\text{pack}} \ge 45^\circ\text{C}$ (applies 12% efficiency penalty).
  - Stall / Emergency Cutoff: Triggered when $\text{SoC} \le 12\%$ or $T_{\text{pack}} \ge 55^\circ\text{C}$.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server & Client Components)
- **Language**: TypeScript 5.8
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Custom dark fleet theme & glow animations)
- **Map Engine**: [MapLibre GL JS](https://maplibre.org/) with CARTO Dark Matter raster tiles
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: Custom responsive SVG micro-charts with synchronized dual-route visualization
- **Telematics**: Indian MoRTH AIS-140 CAN-bus sentence synthesizer and decoder

---

## 📂 Project Structure

```
├── app/
│   ├── api/
│   │   ├── dispatch/route.ts      # REST API for route physics & isochrone calculation
│   │   └── telemetry/route.ts     # REST API for AIS-140 stream & packet decoding
│   ├── globals.css                # Dark theme variables, glow pulses & custom gauges
│   ├── layout.tsx                 # Root layout & page metadata
│   └── page.tsx                   # Main VoltPath dispatcher cockpit
├── components/
│   ├── ElevationThermalChart.tsx  # SVG elevation, pack temp & SoC drain profiles
│   ├── HeaderFleetBar.tsx         # Vehicle selector, temp/payload sliders & shift presets
│   ├── MapDeck.tsx                # MapLibre GL map with routes, isochrone & swap markers
│   ├── RouteComparisonDrawer.tsx  # Dual route comparison cards & fleet ROI impact
│   └── TelemetryHUD.tsx           # Digital gauge cluster & raw AIS-140 packet stream
├── lib/
│   ├── ais140Generator.ts         # AIS-140 NMEA sentence generator & XOR checksum
│   ├── geospatialData.ts          # Authentic delivery corridors & swap station metadata
│   └── physicsEngine.ts           # Tractive force, Arrhenius thermal model & isochrone math
├── next.config.mjs
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## 🚦 Getting Started

### 1. Prerequisites
- Node.js >= 18.0.0
- npm or pnpm

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/voltpath.git
cd voltpath

# Install dependencies
npm install
```

### 3. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 🎮 How to Interact with the Prototype

1. **Shift Presets (Quick Setup)**:
   - ☀️ **Noon Peak Shift**: Sets $43^\circ\text{C}$ ambient and $120\text{ kg}$ cargo payload. Route A will experience an overheating spike and trigger the **Stall Point Alert** near km 7.4.
   - 🌙 **Night Shift**: Sets $28^\circ\text{C}$ ambient and $20\text{ kg}$ payload. Demonstrates optimal range with cool pack temperatures ($<32^\circ\text{C}$).
   - 🌧️ **Monsoon Potholes**: Simulates $C_{rr} = 0.036$ broken road friction.
   - ⛰️ **Steep Flyover Rush**: Simulates heavy payload climbing steep urban overpasses.
2. **Interactive Sliders**:
   - Slide **Ambient Temperature** (20°C to 50°C) to observe real-time expansion and shrinkage of the **Safe-Reach Isochrone Polygon**.
   - Slide **Cargo Payload** (0kg to 140kg) to watch tractive power and Wh/km consumption adjust dynamically.
3. **Trip Playback**:
   - Hit **Play** to start the simulated dispatch.
   - Toggle between **Route A** and **Route B** to inspect differences in motor current draw, pack voltage sag, and temperature escalation.
   - Click on any **⚡ Battery Swap Station** on the map to view real-time bay availability and swap turnaround time.

---

## 📄 License

MIT License. Designed for commercial EV fleet operations across India.

---

## 🗺️ Google Maps Platform Integration

VoltPath supports dual map rendering engines:
1. **MapLibre GL JS** (Default, zero API key required, open-access CARTO Dark Matter vector/raster tiles).
2. **Google Maps Platform** (Custom dark-styled roadmap/hybrid satellite view, terrain contours, and interactive InfoWindows).

### How to Add your Google Maps API Key:

#### Option A: Direct Web UI (No server restart required)
1. Open the dashboard at [http://localhost:3000](http://localhost:3000).
2. Click the **"Add Google Maps Key"** button in the header bar or the **"Google Maps"** button on the map toolbar.
3. Paste your Google Maps API Key (`AIzaSy...`) in the modal and click **Save & Apply**.
4. The dashboard will automatically cache your key in `localStorage` and switch to the Google Maps engine.

#### Option B: Environment Variable (`.env.local`)
1. Create or edit `.env.local` in the project root:
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyYourActualGoogleMapsApiKeyHere
   ```
2. Restart the dev server (`npm run dev`).

#### Required Google Cloud APIs:
Ensure the following APIs are enabled in your [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/overview):
- **Maps JavaScript API** (Required for map canvas and dark styles)
- **Elevation API** (Optional: road slope & altitude contours)
- **Directions API** (Optional: road network integration)

---

## 📍 Dynamic Dispatch Origin & Destination Customization

VoltPath now provides full control over the dispatch corridor:

1. **Origin Hub (Source Dark Store)**:
   - Select from authentic quick-commerce dark stores across Bengaluru & Delhi NCR (e.g., *Zepto Indiranagar 100ft Rd*, *Blinkit Koramangala 80ft Rd*, *Swiggy Instamart HSR Layout*, *Zomato Domlur Inner Ring Rd*, *Zepto Whitefield ITPL*, *Blinkit Hauz Khas Delhi*).
2. **Delivery Destination (Drop-off Zone)**:
   - Select from commercial tech hubs and high-density delivery clusters (e.g., *Prestige Tech Park / EcoSpace Bellandur*, *Bagmane Tech Park CV Raman Nagar*, *Embassy GolfLinks Domlur*, *Electronic City Phase 1*, *Phoenix Marketcity Mahadevapura*, *DLF Cyber City Gurgaon*).
3. **One-Click Swap (⇄)**:
   - Swap Origin and Destination instantaneously to simulate return-leg energy consumption.
4. **Custom Coordinates Input**:
   - Choose `+ Specify Custom Coordinates...` to define custom Latitude, Longitude, Altitude, and Label.
5. **Real-Time Physics Recalculation**:
   - Recomputes direct aerial distance, net elevation climb/descent, Route A vs Route B waypoints, tractive forces, Arrhenius thermal dissipation, stall point risks, and dynamically centers the Safe-Reach Isochrone polygon on the new source location.

---

## ⛰️ Automatic Terrain Elevation Detection

VoltPath features an automatic elevation engine that queries altitude (meters ASL) for any coordinate:

1. **Multi-Tier Elevation Engine (`/api/elevation`)**:
   - **Tier 1 (Google Maps Elevation API)**: Queries Google Cloud Elevation API when activated on the user's Google Maps API key.
   - **Tier 2 (Global SRTM Digital Elevation Model via Open-Meteo)**: Zero-key, high-precision 90m satellite radar topography dataset providing real-time altitude for any global latitude/longitude.
   - **Tier 3 (Indian Topographic Regional Grid)**: Offline algorithmic model tailored for Indian geographic regions (Bengaluru Plateau, Delhi Ridge, Mumbai Ghats/Coast).
2. **One-Click Auto Elevation on Corridor**:
   - Click the **"Auto Elevation"** button on the corridor toolbar to automatically sync and verify real terrain elevations for both the Origin Dark Store and Destination delivery hub simultaneously.
3. **Auto-Detect in Custom Location Picker**:
   - Inside the Custom Location modal, clicking **"Auto-Detect Elevation"** automatically queries the altitude of the entered coordinates, displaying the detected meters and data provider source.

---

## 🛣️ Real Map Road Navigation (Google Routes API Two-Wheeler)

VoltPath now connects directly to live map routing services to pull **actual street navigation paths** rather than stylized geometric lines:

1. **Google Routes API (New) — TWO_WHEELER Mode**:
   - Queries Google's next-generation Routes API with `travelMode: "TWO_WHEELER"` to get authentic commercial scooter road routes.
   - Decodes full street polylines containing every curve, turn, overpass, and arterial junction.
   - Extracts two-wheeler specific route alternatives for Route A (direct flat arterial) and Route B (energy/grade-mitigated bypass).
2. **OpenStreetMap (OSRM) Automatic Failover**:
   - Automatically falls back to the OpenStreetMap road network if the Google API key is absent or restricted, guaranteeing 100% road-accurate coverage.
3. **Real Street Elevation Profiling**:
   - Every waypoint along the real street path is cross-referenced with satellite terrain elevation to compute true road gradients ($\Delta h / \Delta d_{\text{road}}$), regenerative downhill segments, and flyover climb penalties.
