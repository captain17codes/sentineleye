# SentinelEye 🛰️

> **Planetary Intelligence Platform** — AI-powered land protection from orbit to enforcement.

SentinelEye combines multi-sensor remote sensing models (optical vegetation indexing & synthetic aperture radar / SAR), bitemporal change detection, and tamper-evident blockchain verification to monitor and defend ecologically sensitive corridors (such as the Aravalli Biodiversity Corridor) against unauthorized encroachment, illegal construction, mining, and deforestation.

---

## 🌟 Key Features

- **Orbital Planetary Intelligence**: 3D interactive Earth globe (NCT of Delhi focus, auto-rotation, satellite orbit arcs) built with `react-globe.gl` and Three.js with pure CSS fallbacks.
- **Evidence Validation Engine**: Bitemporal (2020 vs 2024) true-color ortho-imagery comparison with 60fps smooth divider slider, keyboard navigation, and vector violation polygon overlays (calibrated synthetic imagery modeled on real sites).
- **Automated Synthetic Radar & Optical Fusion**: High-throughput multi-temporal change detection worker analyzing optical cloud penetration and surface roughness changes.
- **Tamper-Evident Ledger**: Cryptographic SHA-256 hash chaining of verified violations and legal action notices.
- **Rapid Escalation Workflow**: 3-step rapid intervention pipeline (`Alert T+00:00` → `Expert Verification T+00:15` → `Legal Notice T+04:00`).
- **Dark Mission-Control Design System**: High-contrast tactical interface with zero blur/semi-transparent panels, solid surfaces (`#0b0f0e`, `#111816`, `#16201c`), and tactical green accents (`#22c55e`).

---

## 🏗️ Architecture

```
sentineleye/
├── frontend/             # React 18 + Vite + TypeScript + Tailwind CSS
│   ├── public/
│   │   ├── textures/     # Local Earth texture (2K blue marble, no CDN dependency)
│   │   └── evidence/     # Calibrated true-color ortho-imagery (modeled on Sentinel-2 10m GSD)
│   ├── src/
│   │   ├── components/   # HeroGlobe, EvidenceSlider, Map, Charts, UI
│   │   ├── pages/        # Landing/Login, Overview, MapView, Scan, Alerts, Risk
│   │   ├── workers/      # Web Worker for bitemporal detection simulation
│   │   └── data/         # Seeded evidence coordinates & polygon metadata
│   └── vercel.json       # SPA routing configuration for Vercel
├── backend/              # Node.js + Express + TypeScript + SQLite (WAL mode)
│   ├── src/
│   │   ├── controllers/  # Alerts, Scans, Zones, Ledger, Auth, Cases
│   │   ├── middleware/   # JWT auth, role validation, rate limiting
│   │   ├── services/     # Cryptographic ledger, PDF generation
│   │   └── seed/         # Initial seeded zones and violation alerts
│   └── .env.example
├── vercel.json           # Root Vercel deployment configuration
└── package.json          # Monorepo workspaces
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (Node 20+ recommended)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/captain17codes/sentineleye.git
cd sentineleye

# Install all dependencies (frontend + backend workspaces)
npm install
```

### Local Development

Run both the backend API and frontend Vite dev server concurrently:

```bash
npm run dev
```

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`
- **Demo Credentials**: `operator@sentineleye.com` / `operator123`

---

## ☁️ Deployment

### Frontend on Vercel

1. Push this repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Import the repository `sentineleye`.
4. Set root directory to `frontend` (or keep root with the included `vercel.json`).
5. (Optional) Set `VITE_API_URL` to point to your deployed backend API.
6. Click **Deploy**.

---

## 📜 License

MIT License.
