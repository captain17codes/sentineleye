# SentinelEye 🛰️ — 3-Minute Executive Demo Script & Viva Defense Guide

> **Official Demo & Presentation Walkthrough for Evaluators & Juries**  
> *Target Duration: 3 Minutes • Zero Backend Failure Risk • Pure Client-Side Deterministic Pipeline*

---

## ⏱️ The 3-Minute Live Demo Flow

Use the built-in **Demo Director** panel at the bottom right of the screen (or append `?demo=1` to the URL). You can advance steps using the `[→]` key or clicking **Next**.

```
[Step 1: Landing & Overview] ──► [Step 2: Live Map & Cadastral] ──► [Step 3: Modeled Site Arrays]
                                                                                      │
[Step 6: Escalation Protocol] ◄── [Step 5: Validation Panel & Sliders] ◄── [Step 4: SAR Cloud Penetration]
         │
         ▼
[Step 7: Section 63 BSA PDF] ──► [Step 8: Two-Level Tamper Defense]
```

---

### Step 1: Landing Globe & Single Source of Truth
* **Route:** `/` ➔ Click **"Use demo account (operator)"** ➔ `/overview`
* **Presenter Script (20 seconds):**
  > "Welcome to SentinelEye. We are protecting critical ecological corridors—such as the Delhi Ridge and Aravalli reserves—from illegal encroachment using planetary radar and optical intelligence.
  > 
  > Notice on our Mission Overview: every single metric—our 38 validated alerts, our target distribution of 6 Critical, 14 High, 11 Medium, and 7 Low threats, our total protected coverage of 648 square kilometers ($647,972,452\text{ m}^2$), and our cryptographic ledger seal—derives from a single deterministic engine."
* **What to Show:**
  1. Solid tactical KPI cards showing 38 validated alerts and exact severity counts.
  2. Severity Donut matching the 38 total.
  3. Monitored area counter: $647,972,452\text{ m}^2$ computed geodesically via Turf.js.
  4. KPI Card 4: Green "Verified" link to the ledger chain.

---

### Step 2: Live Protected Zone & Cadastral Boundaries
* **Route:** `/map`
* **Presenter Script (20 seconds):**
  > "Moving to our Live Map, we overlay indicative zone boundary polygons over sub-meter Esri satellite imagery across zones Z-101 through Z-108.
  > 
  > Unlike simple rectangular boxes, our zones feature realistic multi-vertex organic boundary contours. When we click on Zone Z-102: Mangar Bani Sacred Grove, we see incident clusters mapped with calculated overlap percentages—red for core violations exceeding 85% overlap, orange for mining, and yellow for peripheral clearings."
* **What to Show:**
  1. Select Zone Z-102 in the sector dropdown or click on the map.
  2. Click an incident cluster to expand, then open the right-side dossier drawer.
  3. Point out indicative zone polygon attribution and Section 63 BSA legal citations.

---

### Step 3: Calibrated Telemetry Modeled on Real Sites
* **Route:** `/scan` ➔ Toggle **"Calibrated scenes modeled on real sites (synthetic arrays)"** ➔ Select **Zone Z-102 (Mangar Bani)**
* **Presenter Script (25 seconds):**
  > "Now let's inspect our orbital telemetry ingestion. We toggle the data source to 'Calibrated scenes modeled on real sites (synthetic arrays)'.
  > 
  > This loads calibrated multi-band arrays modeled on real coordinates in Delhi NCR, aligned with Element 84 STAC Sentinel-2 acquisition dates and reference tile IDs. Notice the optical reference tile ID and UTC timestamp. The engine automatically processes the modeled Scene Classification Layer (SCL) to filter clouds and shadows.
  > 
  > We can also demonstrate clean negative control on Zone Z-107 (Bhindawas Wetland), which returns zero false alarms."
* **What to Show:**
  1. Toggle between **Calibration (synthetic)** and **Calibrated scenes modeled on real sites (synthetic arrays)**.
  2. Show telemetry metadata badge with optical reference tile IDs and UTC timestamps.
  3. Click "Run scan": watch the 9-stage pipeline execute with modeled NDVI loss and SAR backscatter shifts.

---

### Step 4: Why SAR Radar Matters (Cloud Penetration)
* **Route:** `/scan` ➔ Toggle **"Calibration (synthetic)"** ➔ Set Cloud Coverage to 40%
* **Presenter Script (20 seconds):**
  > "Why can't optical satellites solve this alone? In Northern India, monsoon clouds and winter smog blind optical sensors for months at a time.
  > 
  > When we select Optical-only mode under 40% cloud cover, the illegal concrete warehouse at coordinates (130, 130) is completely missed because it is obscured by cloud.
  > 
  > When we switch back to Fused mode, Sentinel-1 C-band radar penetrates through the cloud deck, measures the dielectric double-bounce off the masonry walls, and immediately flags the violation."
* **What to Show:**
  1. Select Optical mode ➔ Run Scan ➔ Misses the cloud-covered building.
  2. Select Fused mode ➔ Run Scan ➔ Catches the building.

---

### Step 5: Empirical Validation Panel & Threshold Sensitivity
* **Route:** `/scan` (Validation Panel at bottom)
* **Presenter Script (25 seconds):**
  > "Here is our empirical verification panel. We don't just claim the AI works—we prove it against ground truth across all 38 scenarios.
  > 
  > Under calibrated defaults, our pipeline delivers 100% Precision and 100% Recall with an average spatial IoU of 0.82 across all 4 encroachment classes and seasonal false-positive distractors.
  > 
  > Watch what happens when we adjust our threshold sliders: If we increase ΔSAR threshold to strict +5.0 dB, subtle excavations are missed and Recall drops. If we loosen ΔSAR to +0.5 dB, seasonal wheat farming leaks through as false alarms. Our 5x5 confusion matrix updates dynamically in real time."
* **What to Show:**
  1. Show the 4 KPI cards: Precision, Recall, F1 Score, and Mean Spatial IoU.
  2. Show the 5x5 Confusion Matrix: diagonal true positives highlighted in green.
  3. Drag the ΔNDVI and ΔSAR sliders: watch precision and recall curves adjust interactively.
  4. Click "Reset Defaults".

---

### Step 6: Accelerated Statutory Escalation Protocol
* **Route:** `/alerts` ➔ Open Alert Detail Drawer
* **Presenter Script (20 seconds):**
  > "Once an encroachment is detected, our statutory escalation protocol begins: T+00:00 Detection ➔ T+00:15 Multi-spectral Verification ➔ T+04:00 Statutory Notice Issuance.
  > 
  > With our built-in operational clock set to 960x speed, 4 statutory hours elapse in 15 seconds. Let's click 'Run escalation (accelerated)'."
* **What to Show:**
  1. Click "Run escalation (accelerated 960x)".
  2. Watch the status transition to **'Notice Drafted — Pending Officer Signature'** at T+04:00.
  3. Click "Mark as Signed & Served by Competent Authority" to execute the final statutory step.
  4. Show the audit history trail populating with block hashes.

---

### Step 7: Section 63 BSA Eviction Dossier & Public QR Verification
* **Route:** Alert Drawer ➔ Click **"Download Section 63 Draft Notice (PDF)"**
* **Presenter Script (25 seconds):**
  > "We click 'Download Section 63 Draft Notice'. Our system instantly generates a court-admissible PDF certified under Section 63, Bharatiya Sakshya Adhiniyam, 2023 (formerly Section 65B, Indian Evidence Act, 1872).
  > 
  > Notice the two-page statutory structure: Page 1 provides the draft eviction order and bitemporal satellite crops with an officer signature block for the Competent Authority. Page 2 provides the statutory Section 63(4) certificate in two parts: Part A executed by the lawful custodian with SHA-256 evidence package hashes, and Part B executed by a technical expert.
  > 
  > Anyone—including judges, defense attorneys, or citizens—can scan the QR code or navigate to /verify/<hash> to inspect our public verifier, which confirms the mathematical authenticity of the record without requiring a login."
* **What to Show:**
  1. Open the downloaded PDF: show Page 1 Draft Notice, Page 2 Section 63(4) Part A & Part B certificates, evidence package hashes, and QR code.
  2. Click the external link icon or open `/verify/<hash>`: show the public page displaying **VALID CRYPTOGRAPHIC SEAL**.

---

### Step 8: Forensic Two-Level Tamper Defense
* **Route:** `/ledger`
* **Presenter Script (25 seconds):**
  > "Finally, how do we guarantee this electronic evidence cannot be tampered with or retroactively rewritten in the database?
  > 
  > On our Ledger page, every block is signed with WebCrypto ECDSA P-256 operator private keys and chained with SHA-256. We feature a two-level tamper defense:
  > 
  > If an attacker simply edits a record in DevTools, clicking 'Level 1: Naive Tamper' triggers an internal block hash mismatch at Block #14.
  > 
  > But what if a rogue administrator rewrites the entire database and recomputes every sequential hash? Clicking 'Level 2: Smart Tamper' demonstrates that even though the internal chain hashes appear valid, the Chain Head differs from our externally anchored public seal, triggering a critical red alert: 'Smart Rewrite Detected'. When we click 'Restore chain', the system heals back to 100% verified integrity."
* **What to Show:**
  1. Show Active Chain Head card and public anchor seal.
  2. Click **Level 1: Naive Tamper** ➔ Click **Verify chain** ➔ Amber banner: "Tampering Detected at Block #14".
  3. Click **Level 2: Smart Tamper** ➔ Click **Verify chain** ➔ Red banner: "🚨 SMART REWRITE DETECTED: Chain Internally Valid but Anchored Head Mismatch!".
  4. Click **Restore chain** ➔ Clean Green "Cryptographic Integrity Intact • 39 Blocks & ECDSA P-256 Signatures Verified".

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
