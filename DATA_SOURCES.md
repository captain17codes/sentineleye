# SentinelEye — Data Sources & Evidentiary Methodology Attribution

> **Honest Systems Disclosure**: SentinelEye combines real Copernicus orbital telemetry, OpenStreetMap cadastral boundaries, statutory Indian evidentiary protocols, and deterministic multi-sensor calibration. This document provides complete provenance, licensing, and methodological disclosures.

---

## 1. Orbital Telemetry & Remote Sensing Feeds

### A. Copernicus Sentinel-2 MSI (Multi-Spectral Instrument)
- **Source**: European Space Agency (ESA) Copernicus Programme, distributed via Element 84 Earth Search STAC API (`https://earth-search.aws.element84.com/v1`).
- **Collection**: `sentinel-2-l2a` (Level-2A Bottom-Of-Atmosphere BOA Surface Reflectance).
- **Licence**: [Copernicus Open Access Policy](https://sentinels.copernicus.eu/web/sentinel/sentinel-data-access/access-to-sentinel-data-policy) / Creative Commons Attribution (CC-BY 4.0).
- **Spectral Bands Utilized**:
  - **Band 4 (Red)**: Central wavelength $665\text{ nm}$, $10\text{ m}$ spatial resolution.
  - **Band 8 (Near-Infrared / NIR)**: Central wavelength $842\text{ nm}$, $10\text{ m}$ spatial resolution.
  - **Band 11 (SWIR)**: Central wavelength $1610\text{ nm}$, $20\text{ m}$ spatial resolution (soil distinction).
  - **Scene Classification Layer (SCL)**: Level-2A atmospheric classification mask used to mask clouds (SCL 8, 9, 10) and cloud shadows (SCL 3).
- **Orbital Revisit**: Nominal 5-day revisit over Delhi NCR (using dual Sentinel-2A and Sentinel-2B orbits).

### B. Copernicus Sentinel-1 C-SAR (Synthetic Aperture Radar)
- **Source**: ESA Copernicus Programme / AWS Open Data Sentinel-1 RTC.
- **Instrument**: C-band Synthetic Aperture Radar ($5.405\text{ GHz}$).
- **Acquisition Mode**: Interferometric Wide (IW) swath, Ground Range Detected (GRD) with Radiometric Terrain Correction (RTC).
- **Licence**: Copernicus Open Access Policy / CC-BY 4.0.
- **Polarization**: Vertical transmit, Vertical receive (VV) converted to decibels:
  $$\sigma^0\text{ (dB)} = 10 \cdot \log_{10}(\gamma^0)$$
- **Orbital Revisit**: 6-day revisit interval (operational constellation baseline).
- **Spatial Resolution**: $\sim 10\text{ m}$ pixel spacing.

---

## 2. Protected Area & Cadastral Boundaries

- **Source**: OpenStreetMap contributors (`boundary=protected_area`, `boundary=forest`, `leisure=nature_reserve`).
- **Licence**: [Open Data Commons Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/).
- **Coordinate Reference System (CRS)**: WGS84 (EPSG:4326) spherical geographic coordinates.
- **Evidentiary Legal Notice**:
  > *These vector boundaries represent indicative protected corridors compiled from public geographic records and satellite basemaps. Under statutory revenue proceedings, physical demarcations require joint inspection by the District Revenue Collector and Sub-Divisional Magistrate (SDM).*
- **Geodesic Polygonal Area**:
  - Computed on the WGS84 reference ellipsoid using Turf.js geodesic algorithms (`@turf/area`).
  - Total monitored area across all 8 monitored zones: **$64,797,245\text{ m}^2$** ($64.80\text{ km}^2$).

---

## 3. Statutory Legal Framework (India)

All automated alerts, evidence logs, and notice generation adhere to statutory Indian laws:
1. **Section 63, Bharatiya Sakshya Adhiniyam, 2023 (BSA)**:
   - Replaced Section 65B of the Indian Evidence Act, 1872 as of July 1, 2024.
   - Governs the admissibility of electronic orbital records in Indian courts.
   - Section 63(4) Part A: Certificate executed by Officer-in-Charge (System Custodian).
   - Section 63(4) Part B: Technical Expert Certificate certifying cryptographic hash validation ($H_0$, $H_1$, $H_f$).
2. **Statutory Municipal & Eviction Authority**:
   - **Delhi Development Act, 1957 (DDA)**:
     - Section 29: Penalties for unauthorized land use.
     - Section 30: Order of demolition of building.
     - Section 31: Power to stop development.
     - Section 31A: Power to seal unauthorized development.
   - **Van (Sanrakshan Evam Samvardhan) Adhiniyam, 1980 (Forest Conservation Act)**:
     - Section 2: Statutory prohibition on non-forest use without Central Government approval.
   - **National Green Tribunal Act, 2010 (NGT)**:
     - Sections 14 & 15: Environmental restitution and enforcement on Yamuna floodplains and Aravalli Ridge.

---

## 4. Reality Matrix: What is Real, Replayed, and Simulated

To maintain absolute scientific transparency during technical jury evaluations, the following breakdown specifies the exact operational status of every subsystem:

| Subsystem / Feature | Operational Status | Technical Implementation |
|:---|:---:|:---|
| **STAC Satellite Extraction** | **REAL** | Python pipeline (`tools/fetch_real_scenes.py`) querying AWS Earth Search STAC API for Sentinel-2 L2A & Sentinel-1 C-SAR. |
| **Spectral Fusion & Detection Pipeline** | **REAL** | Web Worker multi-stage engine computing true bitemporal NDVI vegetation loss, 3x3 Lee SAR speckle filtering, double-bounce backscatter diff, and SCL cloud masking. |
| **Polygon Vectorization & Overlay** | **REAL** | Connected-component labeling, contour tracing, and Turf.js cadastral clipping with 35% statutory overlap threshold. |
| **Empirical Model Validation** | **REAL** | Live precision, recall, F1, mean IoU calculation, and $5\times 5$ confusion matrix with sensitivity sliders. |
| **Section 63 BSA Eviction Dossier** | **REAL** | Court-ready 2-page PDF generated via `jspdf`, containing Part A & Part B statutory certificates, SHA-256 evidence package hashes, and QR provenance links. |
| **Cryptographic Custody Ledger** | **REAL** | WebCrypto ECDSA P-256 operator digital signatures, SHA-256 block hash chaining, Merkle evidence manifests, and external public anchoring. |
| **Two-Level Tamper Defense** | **REAL** | Level 1 Naive Tamper detected via block hash mismatch; Level 2 Smart Tamper detected via external public anchor mismatch. |
| **Offline Replay Datasets** | **REPLAYED** | Archived real Sentinel-1/2 crops for Z-102 (Mangar Bani), Z-103 (Yamuna), Z-105 (Aravalli), and Z-107 (Bhindawas clean control) stored locally under `frontend/public/real/` to ensure 100% offline demo resilience. |
| **Account & Ledger Persistence** | **SIMULATED** | Client-side simulation running in the user's browser via IndexedDB/LocalStorage. Accounts and ledger are preserved across reloads without cloud lock-in. |
| **Backend Microservice** | **OPTIONAL** | An Express/SQLite/JWT REST backend is provided under `backend/` for multi-tenant institutional deployment. The standalone web application runs independently for client demonstrations. |
