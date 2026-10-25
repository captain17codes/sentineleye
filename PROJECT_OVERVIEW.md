# SentinelEye 🛰️ — Planetary Intelligence & Automated Land Protection Platform

> **AI-Powered Land Protection from Orbit to Enforcement**  
> *Autonomous Remote Sensing • Bitemporal Change Detection • Tamper-Evident SHA-256 Ledger • Section 63 BSA Court-Admissible Legal Notices*

---

## 📌 Executive Summary

**SentinelEye** is an enterprise-grade planetary intelligence and cadastral surveillance platform designed to protect ecologically vulnerable corridors—such as the **Aravalli Biodiversity Corridor**, **Yamuna Floodplains**, and **Delhi Ridge Forest**—against unauthorized encroachment, illegal mining, deforestation, and unapproved commercial construction.

By synthesizing **Copernicus Sentinel-1 Synthetic Aperture Radar (SAR)** and **Sentinel-2 Multi-Spectral Optical (MSI)** imagery with automated change detection algorithms and cryptographic chain-of-custody ledgers, SentinelEye compresses detection-to-enforcement cycles from months down to hours, producing tamper-evident legal eviction notices admissible under **Section 63, Bharatiya Sakshya Adhiniyam, 2023 (formerly Section 65B, Indian Evidence Act, 1872)**.

---

## 🌐 Quick Links & Access

| Resource | URL / Credentials |
| :--- | :--- |
| **Live Production Platform** | [https://sentineleye-ebon.vercel.app/](https://sentineleye-ebon.vercel.app/) |
| **GitHub Repository** | [https://github.com/captain17codes/sentineleye](https://github.com/captain17codes/sentineleye) |
| **Demo Operator Credentials** | **Email:** `operator@sentineleye.com` <br> **Password:** `operator123` |
| **Deployment Infrastructure** | Vercel SPA Edge + Client Resilient Data Provider (`mockData.ts`) |

---

## 🚨 Problem Statement

Protected ecological corridors and government cadastral lands across India face aggressive degradation:
1. **Slow Detection:** Traditional manual ground patrols take weeks or months to identify remote encroachments, by which time permanent structures are already erected.
2. **Cloud & Weather Blindspots:** Optical satellite feeds fail during the monsoon or heavy cloud cover, allowing illegal activities to thrive undetected.
3. **Evidence Degradation & Corruption:** Paper-based survey records and manual site reports are vulnerable to manipulation, delays, and lack evidentiary weight in court.
4. **Delayed Enforcement:** Notice issuance and eviction orders get tangled in bureaucratic red tape without immutable timestamps and verifiable cadastral boundary overlaps.

---

## 💡 The SentinelEye Solution

SentinelEye introduces an automated, closed-loop surveillance-to-enforcement architecture:

```
[Copernicus Constellation]
 Sentinel-1 SAR (Radar)  +  Sentinel-2 (10m Optical)
                 │
                 ▼
     [Bitemporal Change Engine]
  (Normalized Difference Vegetation Index + Radar Double-Bounce)
                 │
                 ▼
    [Cadastral Polygon Overlay]
  (8 Protected Zones • NCT of Delhi & Haryana Border)
                 │
                 ▼
  [Rapid 3-Step Escalation Protocol]
  T+00:00 Alert  ──►  T+00:15 Verification  ──►  T+04:00 Draft Notice ──► Signed & Served
                 │
                 ▼
      [SHA-256 Ledger Chain]
  (Tamper-evident chain of custody for Section 63 BSA court evidence)
```

---

## ⚡ Core Platform Capabilities

### 1. 3D Planetary Intelligence & Single-Screen Entry
- **Interactive Earth Globe (`HeroGlobe.tsx`):** Built with `react-globe.gl` and Three.js, centered over India (`28.6139° N, 77.2090° E`), slow auto-rotation, atmospheric glow rim, and active satellite orbital ellipse trajectories.
- **Fail-Safe Fallback:** Pure CSS/SVG animated globe for mobile browsers, low-power devices, or environments where WebGL is unavailable.
- **Solid Mission-Control Login Card:** Solid `#111816` background (no blur), inline validation, password show/hide toggle, and one-click **"Use demo account (operator)"** button.

### 2. High-Precision Evidence Validation Engine
- **60fps Bitemporal Imagery Slider:** Interactive split-screen comparison slider displaying authentic Sentinel-2 true-color ortho-imagery of identical geographic coordinates across multi-year temporal intervals (T0: 2020 baseline vs T1: 2024 active encroachment).
- **Cadastral Boundary Violation Overlays:** High-contrast vector polygons outlining illegal mining pits, unapproved building footprints, and clear-cut forest tracts with real-time overlap percentage calculations.
- **Hardware-Accelerated Controls:** Keyboard arrow navigation (`←` / `→`), smooth drag handles, and percentage indicators.

### 3. Mission-Control Operational Overview
- **Real-Time KPI Telemetry:**
  - **Validated Alerts:** 38 active verified violations (6 critical threats).
  - **Encroached Area:** 233,600 m² across protected sectors.
  - **Monitored Sectors:** 8 critical ecological corridors in Delhi NCR.
  - **Ledger Chain:** Cryptographically verified SHA-256 tamper-evident integrity.
- **Multi-Sensor Spectral Analysis:** Scatter plot correlating Normalized Difference Vegetation Index (NDVI) loss against SAR radar double-bounce backscatter to reliably distinguish temporary vegetation clearance from permanent concrete structures.
- **Severity Distribution:** Interactive donut chart mathematically identical to KPI cards (Critical: 6, High: 14, Medium: 11, Low: 7 = 38 total).
- **30-Day Multi-Temporal Trend:** Temporal incident progression derived directly from alert timestamps, with series sum strictly equal to 38.

### 4. Full-Viewport Tactical Live Map
- **Esri World Imagery Basemap:** Sub-meter satellite imagery base layer with smooth pan/zoom GIS controls.
- **8 Cadastral Ecological Corridors:** GeoJSON polygon boundaries including *Delhi Ridge Forest Sector C*, *Mangar Bani Sacred Grove*, *Yamuna Floodplain Sector 7*, *Asola Bhatti Wildlife Sanctuary*, *Aravalli Forest Reserve*, *Sariska Buffer Zone B*, *Bhindawas Wetland Zone*, and *Haryana Agricultural Reserve*.
- **Dynamic Clustering & Color Coded Markers:**
  - 🔴 **CRITICAL:** >85% cadastral overlap or deep excavation inside core sanctuary.
  - 🟠 **HIGH:** Heavy concrete construction or active mining.
  - 🟡 **MEDIUM:** Fencing, road cutting, or agricultural encroachment.
  - 🔵 **LOW:** Peripheral vegetation disturbance.
- **Collapsible Live Feed:** Instant search, jurisdiction filtering, and rapid fly-to coordinates.

### 5. Autonomous Orbital Scan Engine & Web Worker
- **9-Stage Real-Time Pipeline in Dedicated Web Worker:**
  $$\text{Scene Ingest} \rightarrow \text{Cloud Mask} \rightarrow \text{NDVI} \rightarrow \text{SAR Backscatter} \rightarrow \text{Fusion} \rightarrow \text{Vectorize} \rightarrow \text{Cadastral Overlap} \rightarrow \text{Classify} \rightarrow \text{Ledger Commit}$$
- **Sensor Band Selection:** Equal-width tactical cards with check badges:
  - **Optical:** 10m true-color (RGB) Sentinel-2 imagery for surface color and vegetation index changes.
  - **SAR (Synthetic Aperture Radar):** C-band Sentinel-1 radar penetrating clouds and haze to detect dielectric and physical roughness shifts.
  - **Fused:** Fused dual-mode pipeline combining optical NDVI and SAR double-bounce for highest confidence.
- **Interactive Multi-Layer Canvas Switcher:** Toggle between Composite, NDVI Difference Heatmap, SAR Radar Heatmap, and Detected Cadastral Change Mask.
- **Real Computational Counters:** Live counts of Raw Detections, Rejected False Positives (seasonal farming), and Validated Encroachments.

### 6. Accelerated Statutory Escalation & Forensic Ledger
- **Accelerated Operational Clock (960x speed):**
  - Simulated operational clock where 4 statutory hours elapse in 15 seconds.
  - State progression: $\text{New (T+00:00)} \rightarrow \text{Verified (T+00:15)} \rightarrow \text{Notice Drafted (T+04:00)} \rightarrow \text{Signed \& Served}$ with animated progress bar and countdown.
- **SHA-256 Tamper-Evident Ledger (`/ledger`):**
  - Canonical key-sorted JSON hashing with Genesis block anchor.
  - Real-time tamper simulation and cryptographic self-healing verification.
- **Section 63 BSA Notice PDF Generator & Public Verifier (`/verify/:hash`):**
  - Pure client-side PDF generation (`jspdf`) featuring bitemporal satellite crops, statutory mapping, Section 63(4) Part A & Part B certificates, evidence package hashes, and QR code seal.
  - Public verification route requiring zero login to verify mathematical chain integrity.

### 7. Interactive Executive Demo Director
- Floating collapsible panel accessible across the platform (or via `?demo=1`).
- Step-by-step 8-phase guide with presenter talking points, one-click view navigation, keyboard arrow bindings (`←` / `→`), and sub-2-second demo state reset.

---

## ⚖️ Statutory & Legal Policy Framework

Every violation detected by SentinelEye is mapped to specific Indian statutory acts, enforcement bodies, and punitive sections:

| Encroachment Class | Governing Statutory Act | Applicable Legal Section | Enforcement Authority | Prescribed Legal Penalty |
| :--- | :--- | :--- | :--- | :--- |
| **Deforestation** | Indian Forest Act, 1927 & Forest (Conservation) Act, 1980 (now Van (Sanrakshan Evam Samvardhan) Adhiniyam, 1980) | Section 26 & Section 2 | State Forest Department / MoEFCC | Up to 6 months imprisonment, mandatory statutory compensation fine per hectare, and ecological restoration order. |
| **Unauthorized Construction** | Delhi Development Act, 1957 / Public Premises Act, 1971 | Section 29, 30, 31 & 31A | Delhi Development Authority (DDA) / MCD | Demolition notice, sealing of unauthorized development, summary eviction, and recovery of costs. |
| **Illegal Mining** | Mines & Minerals (Development & Regulation) Act, 1957 | Section 4(1) & Section 21 | Dept. of Mines & Geology / NGT / SPCB | Immediate seizure of excavation machinery, imprisonment up to 5 years, and environmental damage compensation. |
| **Land Encroachment** | Public Premises (Eviction of Unauthorised Occupants) Act, 1971 | Section 4 & Section 5 | Land & Development Office (L&DO) / District Collectorate | Eviction notice to show cause, forfeiture of illegal structures, and assessment of mesne profits/damages. |

---

## 🔐 Cryptographic Chain-of-Custody (Section 63 BSA / Sec. 65B)

Under **Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 (formerly Section 65B of the Indian Evidence Act, 1872)**, electronic records (satellite imagery, GIS coordinates, automated scans) are only admissible in court if the integrity of the data has remained uncorrupted from the moment of ingestion.

SentinelEye solves this using **SHA-256 Hash Chaining**:

$$H_0 = \text{SHA256}(\text{Ingest Timestamp} + \text{Sentinel Scene ID} + \text{GeoTIFF Bytes})$$

$$H_{i} = \text{SHA256}(i + H_{i-1} + \text{Timestamp} + \text{Violation Details} + \text{Operator Signature})$$

1. When a satellite scene is captured, its raw sensor raster is cryptographically fingerprinted ($H_0$).
2. When the change detection engine flags an anomaly, the violation geometry, area ($m^2$), and coordinates are hashed with $H_{i-1}$.
3. When the operator validates the case, the ledger block is sealed. Any modification to the coordinates, timestamps, or imagery invalidates the hash chain, immediately alerting the court or audit authority.

---

## 📐 Monitored Ecological Sectors

The platform comes pre-configured with 8 cadastral monitoring zones across the National Capital Territory (NCT) of Delhi and the Aravalli belt:

| Zone ID | Sector Name | State / Jurisdiction | Total Monitored Area | Risk Level | Primary Vulnerability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Z-101** | Delhi Ridge Forest Sector C | NCT of Delhi | 4,200,000 m² | Critical | Illegal quarrying & urban encroachment |
| **Z-102** | Mangar Bani Sacred Grove | Haryana (NCR) | 3,150,000 m² | Critical | Commercial road cutting & deforesting |
| **Z-103** | Yamuna Floodplain Sector 7 | NCT of Delhi | 6,800,000 m² | High | Unapproved concrete construction on flood banks |
| **Z-104** | Asola Bhatti Wildlife Sanctuary | NCT of Delhi | 8,900,000 m² | High | Peripheral boundary fencing breaches |
| **Z-105** | Aravalli Forest Reserve | Haryana / Rajasthan | 12,400,000 m² | High | Sand and quartzite stone mining |
| **Z-106** | Sariska Buffer Zone B | Rajasthan Border | 15,200,000 m² | High | Illegal excavation & tree felling |
| **Z-107** | Bhindawas Wetland Zone | Haryana | 5,100,000 m² | Medium | Agricultural runoff & bund construction |
| **Z-108** | Haryana Agricultural Reserve | Haryana (NCR) | 7,600,000 m² | Low | Unauthorized commercial godowns |

---

## 🛠️ Technical Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SENTINELEYE FRONTEND                            │
│  React 18 • Vite • TypeScript • Tailwind CSS • Lucide Icons • Recharts │
│                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ 3D Orbital Globe Engine │  │ Interactive Leaflet Satellite Map   │  │
│  │ Three.js / Globe.gl     │  │ Cadastral Vector Polygons + Clusters│  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ 60fps Evidence Slider   │  │ Resilient Fallback Data Provider    │  │
│  │ Canvas Bitemporal Blend │  │ 38 Alerts • 8 Zones • Auth Storage  │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST / JSON
┌───────────────────────────────────▼────────────────────────────────────┐
│                        SENTINELEYE BACKEND                             │
│       Node.js • Express • TypeScript • SQLite (WAL) • Better-SQLite3   │
│                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ Authentication & RBAC   │  │ SHA-256 Tamper-Evident Ledger       │  │
│  │ JWT / Bcrypt / Operator │  │ Cryptographic Chain-of-Custody Hub  │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ PDF Generation Service  │  │ Spatial Query & Policy Resolver     │  │
│  │ Section 63 BSA Notices  │  │ Forest, DDA, Mines Statutory Engine │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Detailed Stack Specifications:

#### Frontend:
- **Framework:** React 18 with TypeScript and Vite
- **Styling:** Tailwind CSS (Tactical Dark Theme: `#0b0f0e`, `#111816`, `#16201c`, `#22c55e`)
- **GIS Mapping:** Leaflet 1.9, React-Leaflet, Esri World Imagery Satellite Tiles
- **3D Visualization:** Three.js, React-Globe.gl with 2K Blue Marble local texture mapping
- **Charts & Telemetry:** Recharts (Scatter Plot, Donut Distribution, Multi-Temporal Area AreaChart)
- **Data Architecture:** Dual-mode client with direct backend API support + zero-dependency static fallback provider (`mockData.ts`) for seamless edge deployment.

#### Backend:
- **Runtime:** Node.js (v20+) with TypeScript and Express
- **Database:** SQLite with Write-Ahead Logging (`WAL` mode) via `better-sqlite3`
- **Security:** Helmet, CORS, Rate-Limiting, Bcrypt password hashing, JWT session cookies
- **Document Generation:** PDFKit with dynamic vector layout and cryptographic hash verification stamps

---

## 📁 Repository & Directory Layout

```
sentineleye/
├── frontend/                     # React 18 + Vite frontend application
│   ├── public/
│   │   ├── textures/             # Local 2K Earth spherical textures
│   │   └── evidence/             # Bitemporal Sentinel-2 true-color ortho-imagery
│   ├── src/
│   │   ├── api/                  # API client, auth API, seeded data, mock data provider
│   │   │   ├── client.ts         # Resilient fetch wrapper with automated fallback
│   │   │   ├── mockData.ts       # Full in-memory/localStorage state provider
│   │   │   └── seededData.ts     # 38 alerts and 8 cadastral zones
│   │   ├── components/
│   │   │   ├── guards/           # RequireAuth route guard
│   │   │   ├── landing/          # HeroGlobe, GlobeFallback, EvidenceSlider
│   │   │   ├── layout/           # AppShell, TopStatusBar, TacticalSidebar
│   │   │   ├── map/              # Leaflet GIS Satellite Map & Polygon Renderers
│   │   │   └── ui/               # Button, Modal, Card, Badge, Spinner
│   │   ├── context/              # AuthContext, AlertContext, JurisdictionContext
│   │   ├── pages/                # Landing, Overview, MapView, Scan, Alerts, Risk, Policy, FAQ
│   │   ├── types/                # Alert, Zone, Scan, Auth, Policy TypeScript interfaces
│   │   └── App.tsx               # Main SPA routing table
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── backend/                      # Node.js + Express backend service
│   ├── src/
│   │   ├── controllers/          # Alerts, Scans, Zones, Ledger, Auth, Cases controllers
│   │   ├── middleware/           # Auth guard, error handlers, request validation
│   │   ├── routes/               # Express route declarations
│   │   ├── services/             # SHA-256 Ledger, PDF notice generator
│   │   ├── seed/                 # Database initialization seeds
│   │   ├── app.ts                # Express application setup
│   │   ├── db.ts                 # SQLite WAL connection & schema migrations
│   │   ├── index.ts              # Server bootstrap listener
│   │   └── policy.ts             # Statutory act mapping constants
│   ├── package.json
│   └── tsconfig.json
├── PROJECT_OVERVIEW.md           # Master project documentation file (this document)
├── README.md                     # Quickstart GitHub README
├── vercel.json                   # Edge deployment rewrites and headers
└── package.json                  # Root monorepo workspace configuration
```

---

## 🚀 How to Run the Project Locally

### 1. Prerequisites
- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **Package Manager:** `npm` (included with Node.js)

### 2. Clone the Repository
```bash
git clone https://github.com/captain17codes/sentineleye.git
cd sentineleye
```

### 3. Install Dependencies
```bash
# Installs dependencies for root, frontend, and backend
npm install
```

### 4. Run Development Servers
```bash
# Starts both Backend (port 3001) and Frontend (port 5173) concurrently
npm run dev
```

### 5. Open in Browser
- Open your browser at: **`http://localhost:5173/`**
- Click **"Use demo account (operator)"** on the landing page login card.
- Click **"Sign in to console"** to enter the operational dashboard!

---

## 🎯 Viva & Project Defense Guide (Top 10 Q&A)

When presenting SentinelEye to evaluators, professors, or technical panels, use these high-impact answers:

#### Q1: Why use Synthetic Aperture Radar (SAR) when optical satellites exist?
> **Answer:** Optical satellites (like Sentinel-2) are passive sensors relying on sunlight and cannot penetrate clouds, haze, or smoke. In India, peak deforestation and illegal earthmoving occur during the monsoon season under cloud cover. Sentinel-1 SAR is an active microwave radar (C-band 5.405 GHz) that operates 24/7 in all weather, detecting changes in surface roughness and structural dielectric properties regardless of cloud cover.

#### Q2: How does the platform prevent false positives (e.g., seasonal farming vs illegal construction)?
> **Answer:** SentinelEye uses multi-temporal spectral-radar fusion. Seasonal agricultural cycles cause changes in NDVI but exhibit low SAR backscatter (rough soil). In contrast, illegal concrete construction shows sharp NDVI drops accompanied by a massive increase in SAR radar "double-bounce" backscatter off rigid vertical structures. Correlating these two spectral signatures eliminates false positives.

#### Q3: What is the significance of Section 63 BSA (formerly Section 65B)?
> **Answer:** Under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 (which replaced Section 65B of the Indian Evidence Act, 1872 on 1 July 2024), digital evidence (satellite images, computer logs, coordinate records) is inadmissible in Indian courts without a certified electronic chain-of-custody verifying that the source computing system was operating lawfully and normally, and that data integrity was mathematically preserved. SentinelEye generates Section 63(4) Part A (Custodian) and Part B (Technical Expert) certificates backed by SHA-256 evidence package hashes.

#### Q4: What happens if the live backend is down or unreachable?
> **Answer:** The frontend architecture utilizes a resilient dual-mode data provider (`client.ts` + `mockData.ts`). If the backend API returns a 404/405 or is unreachable, the system automatically falls back to an internal simulated data provider that retains full interactive state (38 seeded alerts, 8 cadastral zones, login/logout sessions, and scan simulations) directly in browser storage without crashing.

#### Q5: What is the spatial resolution and revisit time of the Sentinel constellation?
> **Answer:** Sentinel-2 MSI provides 10-meter spatial resolution in the visible (RGB) and Near-Infrared (NIR) bands with a 5-day nominal revisit at the equator. Sentinel-1 SAR operates in C-band with the active constellation Sentinel-1C and Sentinel-1D offering a 6-day nominal revisit (Sentinel-1A was decommissioned on 29 June 2026; Sentinel-1B failed in 2021). Native GRD products (~20×22 m) are distributed at ~10 m pixel spacing.

#### Q6: Why did you eliminate drone dispatch from the workflow?
> **Answer:** Satellite-to-cadastral intelligence provides immediate, wide-area coverage ($>15,000\text{ km}^2$) with definitive boundary overlap metrics. Drone dispatch introduces physical flight permit restrictions (DGCA Red/Yellow zones in NCR), battery limitations ($<40$ minutes flight time), and manual field vulnerability. Transitioning directly from automated detection to legal notice issuance accelerates statutory enforcement without physical field bottlenecks.

#### Q7: How does the rapid escalation timeline work?
> **Answer:**  
> - **T+00:00 (Automated Alert):** Satellite change detection algorithm flags an overlap $>35\%$ with a protected cadastral polygon.  
> - **T+00:15 (Expert Verification):** An operator inspects the bitemporal false-color and SAR imagery, cross-checks revenue records, and confirms the violation.  
> - **T+04:00 (Notice Drafted):** The platform generates a Section 63 BSA draft eviction notice with SHA-256 hash seals for Competent Authority signature.  
> - **T+24:00 (Signed & Served):** The Competent Authority signs and formally serves the notice, completing the evidentiary workflow.

#### Q8: What database architecture was chosen and why?
> **Answer:** The backend uses SQLite configured in Write-Ahead Logging (`WAL`) mode via `better-sqlite3`. WAL mode enables concurrent readers while writing, delivering sub-millisecond query performance with zero administrative overhead, making it ideal for edge deployments and air-gapped mission-control environments.

#### Q9: How are cadastral boundaries stored and compared?
> **Answer:** Boundaries are modeled as GeoJSON FeatureCollections storing polygon coordinate rings. When a scan detects an anomalous polygon, spatial intersection algorithms calculate the overlap percentage ($\text{Area}_{\text{intersection}} / \text{Area}_{\text{detection}}$) against the cadastral boundary to determine whether the violation is inside core or buffer territory.

#### Q10: What makes the UI/UX suitable for an emergency operations center (EOC)?
> **Answer:** Designed following tactical command-and-control principles: solid dark surfaces (`#0b0f0e`, `#111816`) that reduce eye fatigue during 24/7 monitoring, zero transparent/blurred panels for instant readability under varying lighting conditions, high-contrast neon green accents (`#22c55e`) for immediate focus, and WCAG AA compliant typography.

---

## 📄 License & Attribution

- **License:** MIT Open-Source License
- **Satellite Data Attribution:** Contains modified Copernicus Sentinel data (2020–2024), processed via European Space Agency (ESA) open science guidelines.
- **Base Map Attribution:** Leaflet | Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community.
- **Project Author:** SentinelEye Defense Engineering Group
