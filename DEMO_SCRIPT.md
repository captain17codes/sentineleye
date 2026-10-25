# SentinelEye 🛰️ — 3-Minute Executive Demo Script & Viva Defense Guide

> **Official Demo & Presentation Walkthrough for Evaluators & Juries**  
> *Target Duration: 3 Minutes • Zero Backend Failure Risk • Pure Client-Side Deterministic Pipeline*

---

## ⏱️ The 3-Minute Live Demo Flow

Use the built-in **Demo Director** panel at the bottom right of the screen (or append `?demo=1` to the URL). You can advance steps using the `[→]` key or clicking **Next**.

```
[Step 1: Landing & Login] ──► [Step 2: Live Map] ──► [Step 3: Scan Engine] ──► [Step 4: SAR vs Optical]
                                                                                       │
[Step 8: Ledger Tampering] ◄── [Step 7: Section 63 BSA PDF] ◄── [Step 6: Escalation] ◄── [Step 5: False+ Rejection]
```

---

### Step 1: Landing Globe & Single Source of Truth
* **Route:** `/` ➔ Click **"Use demo account (operator)"** ➔ `/overview`
* **Presenter Script (25 seconds):**
  > "Welcome to SentinelEye. We are addressing illegal encroachment on protected ecological corridors like the Delhi Ridge and Aravalli reserves. Rather than waiting weeks for manual forest ranger inspections, SentinelEye autonomously monitors these corridors from orbit. 
  > 
  > Notice on our Mission Overview: every single metric across the system—the 38 alerts, the 6 Critical, 14 High, 11 Medium, and 7 Low threats, our severity donut, and our 30-day temporal trend—derives from a single deterministic engine. Furthermore, our entire ledger chain shows a cryptographically verified SHA-256 seal."
* **What to Show:**
  1. Solid tactical KPI cards showing 38 validated alerts and exact severity counts.
  2. Severity Donut matching the 38 total.
  3. KPI Card 4: Green "Verified" link to the ledger chain.

---

### Step 2: Live Protected Zone & Cadastral Boundaries
* **Route:** `/map`
* **Presenter Script (20 seconds):**
  > "Moving to our Live Map, we overlay statutory GeoJSON cadastral boundaries over sub-meter Esri satellite imagery. Let's inspect Zone Z-101: Delhi Ridge Forest Sector C.
  > 
  > Here, our threat markers are grouped into incident clusters. Each alert polygon reflects real cadastral boundary overlap calculated using polygon intersection algorithms—red for critical core violations exceeding 85% overlap, orange for active mining and heavy construction."
* **What to Show:**
  1. Click on Zone Z-101 in the jurisdiction picker or map.
  2. Click an alert cluster to expand, then click an incident to open the right-side dossier drawer.

---

### Step 3: Multi-Sensor Scan Execution & Web Worker
* **Route:** `/scan`
* **Presenter Script (25 seconds):**
  > "Now let's launch an active satellite pass. On our Scan console, we choose Zone Z-101, select Fused Optical + SAR mode, and set cloud cover to 40%.
  > 
  > When I click 'Run multi-sensor scan', an asynchronous background Web Worker executes an end-to-end 9-stage pipeline: scene ingestion, cloud masking, bitemporal NDVI, SAR backscatter diffing, dual-sensor fusion, connected-component vectorization, and cadastral boundary clipping."
* **What to Show:**
  1. Watch the 9 stage badges light up in the status bar in under 3 seconds.
  2. Toggle between layers: Composite, NDVI Diff, SAR Radar Diff, and Change Mask.
  3. Point out the real pipeline counters: Raw Detections, Rejected False Positives, and Validated Encroachments.

---

### Step 4: Why SAR Radar Matters (Cloud Penetration)
* **Route:** `/scan`
* **Presenter Script (25 seconds):**
  > "Here is our core technical differentiator: Why can't optical satellites solve this alone?
  > 
  > In India, monsoon clouds and winter smog blind optical sensors for up to 4 months a year. When we switch to Optical-only mode under 40% cloud cover, the unauthorized building at coordinates (130, 130) is completely missed because it is obscured by cloud.
  > 
  > When we switch back to Fused mode, Sentinel-1 C-band radar penetrates directly through the cloud layer, detects the dielectric double-bounce off the concrete foundation, and flags the violation immediately."
* **What to Show:**
  1. Select Optical mode ➔ Run Scan ➔ Misses the cloud-covered building.
  2. Select Fused mode ➔ Run Scan ➔ Catches the building.

---

### Step 5: False-Positive Rejection (Seasonal Farming)
* **Route:** `/overview` (Spectral Analysis Chart)
* **Presenter Script (20 seconds):**
  > "A common failure mode of conventional satellite change detection is mistaking seasonal farming or crop harvesting for illegal deforestation, because both show a drop in NDVI.
  > 
  > SentinelEye solves this by correlating NDVI vegetation loss with SAR radar double-bounce. On our Spectral Analysis scatter chart, seasonal crop harvests fall into the low-SAR quadrant and are automatically rejected as false alarms, while permanent physical structures and deforestation trigger high backscatter shifts."
* **What to Show:**
  1. Spectral Analysis scatter plot: show valid alerts (green) vs rejected seasonal farming detections (grey/amber).

---

### Step 6: Accelerated Escalation Protocol (T+00:00 ➔ T+04:00)
* **Route:** `/alerts` ➔ Open Alert Detail Drawer
* **Presenter Script (25 seconds):**
  > "Once an encroachment is detected, our statutory escalation protocol begins: T+00:00 Detection ➔ T+00:15 Multi-spectral Verification ➔ T+04:00 Statutory Notice Issuance.
  > 
  > In real life this takes 4 statutory hours. With our built-in operational clock set to 960x speed, 4 hours elapse in 15 seconds. Let's click 'Run escalation (accelerated)'."
* **What to Show:**
  1. Click "Run escalation (accelerated 960x)".
  2. Watch the live progress bar and clock counter tick from T+00:00 to T+00:15 (Verified), then progress to T+04:00 (Notice Drafted — Pending Officer Signature).
  3. Click "Mark as Signed & Served by Competent Authority" to execute the final statutory step.
  4. Show the audit history trail populating with block hashes.

---

### Step 7: Section 63 BSA Notice & Public QR Verification
* **Route:** Alert Drawer ➔ Click **"Download Section 63 Draft Notice (PDF)"**
* **Presenter Script (25 seconds):**
  > "We click 'Download Section 63 Draft Notice'. Our system instantly generates a court-admissible PDF certified under Section 63, Bharatiya Sakshya Adhiniyam, 2023 (formerly Section 65B, Indian Evidence Act, 1872).
  > 
  > Notice the two-page statutory structure: Page 1 provides the draft eviction order and bitemporal satellite crops with an officer signature block for the Competent Authority. Page 2 provides the statutory Section 63(4) certificate in two parts: Part A executed by the lawful custodian with SHA-256 evidence package hashes, and Part B executed by a technical expert.
  > 
  > Anyone—including judges, defense attorneys, or citizens—can scan this QR code or navigate to /verify/<hash> to inspect our public verifier, which confirms the mathematical authenticity of the record without requiring a login."
* **What to Show:**
  1. Open the downloaded PDF: show header, draft notice layout, Section 63(4) Part A & Part B certificates, evidence package hashes, and QR code.
  2. Click the external link icon or open `/verify/<hash>`: show the public page displaying **VALID CRYPTOGRAPHIC SEAL**.

---

### Step 8: Forensic Tamper Detection & Self-Healing
* **Route:** `/ledger`
* **Presenter Script (25 seconds):**
  > "Finally, how do we guarantee this evidence cannot be bribed or altered in the database?
  > 
  > On our Ledger page, we visualize the SHA-256 block chain. Let's click 'Simulate tampering'. We silently modify the coordinates of Block #12.
  > 
  > When I click 'Verify chain', the system mathematically detects the anomaly: 'Block #12 tampered! Expected hash does not match stored hash', and all descendant blocks are invalidated. When we click 'Restore chain', the system heals back to 100% verified integrity."
* **What to Show:**
  1. Click **Simulate tampering** ➔ Click **Verify chain** ➔ Big Red "CHAIN TAMPERED AT BLOCK #12".
  2. Click **Restore chain** ➔ Click **Verify chain** ➔ Clean Green "VALID CHAIN".

---

## 🎓 5 Essential Viva Defense Questions & Answers

### Q1: What is the exact formula for NDVI, and how does your engine compute vegetation change?
**Answer:**
> "NDVI stands for Normalized Difference Vegetation Index. Its mathematical formula is:
> $$\text{NDVI} = \frac{\text{NIR} - \text{Red}}{\text{NIR} + \text{Red}}$$
> Healthy photosynthetic vegetation contains chlorophyll that strongly absorbs red visible light ($\approx 660\text{ nm}$) while reflecting Near-Infrared energy ($\approx 860\text{ nm}$ in Sentinel-2 Band 8). Consequently, dense green foliage yields NDVI values between $+0.4$ and $+0.8$. 
> 
> When forest is cleared or paved over with concrete, NIR reflectance drops sharply while red reflectance rises, causing NDVI to drop to near zero or negative values. Our engine computes bitemporal difference $\Delta\text{NDVI} = \text{NDVI}_{T1} - \text{NDVI}_{T0}$. A drop $\Delta\text{NDVI} \le -0.20$ signals potential vegetation loss."

---

### Q2: Why is Sentinel-1 Synthetic Aperture Radar (SAR) necessary if Sentinel-2 optical imagery already has 10m resolution?
**Answer:**
> "Optical imagery (Sentinel-2) relies on reflected solar radiation in the visible and near-infrared spectrum. It has two critical limitations:
> 1. It cannot penetrate clouds, monsoon precipitation, dust storms, or smog. In Northern India, monsoon clouds obscure optical views for weeks at a time.
> 2. It cannot distinguish between flat soil disturbance (such as seasonal plowing) and vertical structural encroachment (such as building foundations or perimeter walls).
> 
> Sentinel-1 C-band radar ($5.405\text{ GHz}$, $\approx 5.6\text{ cm}$ wavelength) is an active sensor that transmits its own microwave pulses and records the backscatter return. Microwaves easily penetrate clouds and smoke. Furthermore, when radar pulses strike vertical concrete walls meeting flat ground, they undergo **corner reflection ('double-bounce')**, generating an enormous spike in radar backscatter ($+3\text{ dB}$ to $+7\text{ dB}$). 
> 
> By fusing Optical $\Delta\text{NDVI}$ with SAR $\Delta\text{SAR}$, SentinelEye operates 24/7 in all weather conditions and eliminates false alarms from agricultural cycles."

---

### Q3: How does your cadastral polygon intersection and overlap percentage work?
**Answer:**
> "Our pipeline uses computational geometry powered by Turf.js:
> 1. First, our raster change mask undergoes connected-component labeling (flood fill) to identify contiguous clusters of changed pixels.
> 2. Clusters smaller than $500\text{ m}^2$ (5 pixels at 10m resolution) are pruned as noise.
> 3. We trace the outer boundary of each cluster into a closed GeoJSON polygon using a counter-clockwise boundary walk and translate pixel coordinates to geographic coordinates (WGS84 EPSG:4326) via affine geotransformation.
> 4. We pass the detected polygon and the statutory cadastral zone boundary polygon into `turf.intersect(turf.featureCollection([detectionPoly, zonePoly]))`.
> 5. Overlap percentage is computed as:
>    $$\text{Overlap \%} = \frac{\text{Area}(\text{Intersection})}{\text{Area}(\text{Detection})} \times 100$$
> An alert is only triggered if overlap exceeds 35%, ensuring peripheral external activities do not generate false alarms."

---

### Q4: What makes your Section 63 BSA notice legally admissible in an Indian court of law?
**Answer:**
> "Under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 (which replaced Section 65B of the Indian Evidence Act, 1872 on 1 July 2024), electronic records are admissible only when accompanied by a statutory certificate under Section 63(4):
> 1. **Part A (Custodian Statement):** Certifies that the computer system was operated lawfully during regular surveillance, was functioning properly without malfunction, and identifies the evidence package via cryptographic SHA-256 hashes.
> 2. **Part B (Technical Expert Certificate):** Executed by an independent expert certifying the mathematical verification of the hash seals and pipeline integrity.
> 
> SentinelEye fulfills both statutory parts directly in its two-page export, linking every scene ID, difference raster, and cadastral vector to the SHA-256 chain of custody."

---

### Q5: Why did you build an in-browser deterministic simulation engine rather than relying entirely on a cloud backend?
**Answer:**
> "In real-world deployment, SentinelEye integrates with Copernicus Open Access Hub and Cloud API endpoints. However, for an executive evaluation and courtroom demonstration:
> 1. **Zero Downtime & Zero Latency:** Live cloud satellite APIs (ESA SciHub/Copernicus Data Space) frequently encounter rate limits, maintenance outages, and multi-gigabyte transfer delays that would stall a 3-minute executive presentation.
> 2. **Deterministic Reproducibility:** By implementing our multi-band raster generator, Perlin cloud synthesizer, Turf cadastral clipping, and SHA-256 ledger directly in Web Workers with a seeded PRNG (`DEMO_SEED = 42`), the engine yields mathematically identical results on every presentation run while keeping the UI responsive at 60fps.
> 3. **Edge Resiliency:** The entire platform runs seamlessly as a serverless Single Page Application on Vercel Edge with client-side PDF and QR generation, requiring zero backend server maintenance."
