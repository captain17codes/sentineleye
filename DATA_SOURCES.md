# SentinelEye — Data Sources & Evidentiary Methodology Attribution

> **Honest Systems Disclosure**: SentinelEye is a demonstration and rapid-response proof-of-concept platform combining multi-sensor remote sensing models, indicative generated zone polygons, statutory Indian evidentiary protocols, and deterministic dual-sensor calibration. This document provides complete provenance, licensing, and methodological disclosures.

---

## 1. Remote Sensing Modeling & Telemetry Specifications

### A. Optical Vegetation Modeling (Modeled on Sentinel-2 MSI)
- **Reference Tile IDs**: Ingested via Element 84 Earth Search STAC API (`https://earth-search.aws.element84.com/v1`, collection `sentinel-2-l2a`) for real geographic coordinates in Delhi NCR to obtain authentic tile footprints and temporal acquisition timestamps.
- **Array Implementation**: Multi-band arrays (Red, Near-Infrared, Scene Classification Layer) are calibrated synthetic arrays ($256 \times 256$ Float32) modeled on physical BOA surface reflectance.
- **Spectral Bands Modeled**:
  - **Band 4 (Red)**: Central wavelength $665\text{ nm}$, nominal $10\text{ m}$ spatial resolution.
  - **Band 8 (Near-Infrared / NIR)**: Central wavelength $842\text{ nm}$, nominal $10\text{ m}$ spatial resolution.
  - **Scene Classification Layer (SCL)**: Level-2A atmospheric classification mask used to model cloud masking (SCL 8, 9, 10) and cloud shadows (SCL 3).
- **Orbital Revisit**: Modeled on nominal 5-day revisit over Delhi NCR (using dual Sentinel-2A and Sentinel-2B orbits).

### B. Radar Microwave Modeling (Modeled on Sentinel-1 C-SAR)
- **Physical Modeling**: C-band radar backscatter ($5.405\text{ GHz}$) modeled in decibels ($\text{dB} = 10 \cdot \log_{10}(\gamma^0)$).
- **Polarization**: Vertical transmit, Vertical receive (VV) modeled based on roughness and dielectric double-bounce physics (e.g. $+3\text{ dB}$ to $+11\text{ dB}$ for vertical masonry and quarry walls; low change for seasonal soil).
- **Scene Identifiers**: Real tile reference IDs are used for optical baselines; no fabricated SAR scene IDs are claimed.
- **Orbital Revisit**: Modeled on 6-day nominal revisit baseline.
- **Spatial Resolution**: $\sim 10\text{ m}$ pixel spacing.

---

## 2. Protected Area & Boundary Geometries

- **Classification**: **Indicative zone polygons (generated)**.
- **Generation Method**: The 8 protected zone contours in `frontend/public/zones/zones.geojson` and `frontend/src/api/seededData.ts` were synthesized using deterministic harmonic functions (`tools/generate_real_zones.js`) around real geographic coordinates to create realistic, non-rectangular organic boundaries.
- **Coordinate Reference System (CRS)**: WGS84 (EPSG:4326) spherical geographic coordinates.
- **Evidentiary Legal Notice**:
  > *These vector boundaries represent indicative protected corridors generated for demonstration and simulation purposes. Under statutory revenue proceedings, physical demarcations require joint inspection and ground-truth boundary settlement by the District Revenue Collector and Sub-Divisional Magistrate (SDM).*
- **Geodesic Polygonal Area**:
  - Computed on the WGS84 reference ellipsoid using Turf.js geodesic algorithms (`@turf/area`).
  - Total monitored area across all 8 monitored zones: **$647,972,452\text{ m}^2$** ($648\text{ km}^2$).

---

## 3. Evidence Imagery & Sample Assets

- **Evidence Slider Images (`/evidence/before.webp`, `/evidence/after.webp`)**:
  - AI-generated synthetic satellite ortho-photographs modeled on true-color Sentinel-2 10m GSD appearance over the Aravalli landscape.
  - Used for demonstration of the 60fps evidence slider and vector polygon overlay UI.
  - Not raw Copernicus Sentinel data.

---

## 4. Statutory Legal Framework (India)

All automated alerts, evidence logs, and notice generation adhere to statutory Indian laws:
1. **Section 63, Bharatiya Sakshya Adhiniyam, 2023 (BSA)**:
   - Replaced Section 65B of the Indian Evidence Act, 1872 as of July 1, 2024.
   - Governs the admissibility of electronic orbital records in Indian courts.
   - Section 63(4) Part A: Certificate executed by Officer-in-Charge (System Custodian).
   - Section 63(4) Part B: Technical Expert Certificate certifying cryptographic hash validation ($H_0$, $H_1$, $H_f$).
2. **Statutory Municipal & Eviction Authority**:
   - **Delhi Development Act, 1957 (DDA)**: Sections 29, 30, 31, 31A.
   - **Van (Sanrakshan Evam Samvardhan) Adhiniyam, 1980 (Forest Conservation Act)**: Section 2.
   - **National Green Tribunal Act, 2010 (NGT)**: Sections 14 & 15.

---

## 5. Reality Matrix: What is Real, Modeled, and Simulated

To maintain absolute scientific transparency during technical evaluations, the following breakdown specifies the exact operational status of every subsystem:

| Subsystem / Feature | Operational Status | Technical Implementation |
|:---|:---:|:---|
| **STAC Reference Metadata** | **REAL** | Ingests real tile IDs, coordinates, and acquisition dates from Element 84 Earth Search STAC API (`sentinel-2-l2a`). |
| **Spectral Fusion & Detection Pipeline** | **REAL ENGINE** | Web Worker multi-stage engine computing true bitemporal NDVI vegetation loss, 3x3 Lee SAR speckle filtering, double-bounce backscatter diff, and SCL cloud masking. |
| **Polygon Vectorization & Overlay** | **REAL ENGINE** | Connected-component labeling, contour tracing, and Turf.js cadastral clipping with 35% statutory overlap threshold. |
| **Empirical Model Validation** | **REAL ENGINE** | Live precision, recall, F1, mean IoU calculation, and $5\times 5$ confusion matrix with sensitivity sliders. |
| **Section 63 BSA Eviction Dossier** | **REAL ENGINE** | Court-ready 2-page PDF generated via `jspdf`, containing Part A & Part B statutory certificates, SHA-256 evidence package hashes, and QR provenance links. |
| **Cryptographic Custody Ledger** | **REAL CRYPTO** | WebCrypto ECDSA P-256 operator digital signatures, SHA-256 block hash chaining, Merkle evidence manifests, and external public anchoring. |
| **Two-Level Tamper Defense** | **REAL CRYPTO** | Level 1 Naive Tamper detected via block hash mismatch; Level 2 Smart Tamper detected via external public anchor mismatch. |
| **Telemetry Arrays** | **MODELED** | Calibrated synthetic arrays modeled on physical optical/SAR scattering characteristics of real target sites (`frontend/public/real/`). No raw COG pixels were downloaded. |
| **Cadastral Boundaries** | **GENERATED** | Indicative zone polygons synthesized with harmonic contours (`tools/generate_real_zones.js`). |
| **Account & Ledger Persistence** | **SIMULATED** | Client-side simulation running in the user's browser via IndexedDB/LocalStorage. Accounts and ledger are preserved across reloads without cloud lock-in. |
| **Backend Microservice** | **OPTIONAL** | An Express/SQLite/JWT REST backend is provided under `backend/` for multi-tenant institutional deployment. The standalone web application runs independently for client demonstrations. |
