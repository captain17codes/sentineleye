export interface EvidencePolygon {
  id: string;
  pointsPercentage: [number, number][]; // [x%, y%] coordinates within the image
  isInsideProtectedZone: boolean;       // true = red (#ef4444), false = amber (#f59e0b)
  label?: string;
}

export interface EvidenceData {
  areaName: string;
  zoneId: number;
  bboxText: string;
  beforeDate: string;        // "Oct 2020"
  afterDate: string;         // "Oct 2024"
  sensor: string;            // "Copernicus Sentinel-2"
  resolution: string;        // "10m GSD"
  changeClass: string;       // "Unauthorized Construction"
  affectedAreaHa: number;    // e.g. 0.48 ha (~4,850 m²)
  affectedAreaM2: number;
  attribution: string;       // "Contains modified Copernicus Sentinel data (2020, 2024)."
  beforeImage: string;       // "/evidence/before.webp"
  afterImage: string;        // "/evidence/after.webp"
  polygons: EvidencePolygon[];
}

export const EVIDENCE_SAMPLE: EvidenceData = {
  areaName: "Aravalli Biodiversity Corridor (Sector 4)",
  zoneId: 1,
  bboxText: "28.5214° N, 77.0842° E",
  beforeDate: "Oct 2020",
  afterDate: "Oct 2024",
  sensor: "Copernicus Sentinel-2",
  resolution: "10m GSD True Color (B4-B3-B2)",
  changeClass: "Unauthorized Construction",
  affectedAreaHa: 0.485,
  affectedAreaM2: 4850,
  attribution: "Contains modified Copernicus Sentinel data (2020, 2024).",
  beforeImage: "/evidence/before.webp",
  afterImage: "/evidence/after.webp",
  polygons: [
    {
      id: "poly-primary",
      // Points in % [x, y] of the 1600x1000 image matching the construction site compound
      pointsPercentage: [
        [79.1, 48.0],
        [88.0, 62.8],
        [82.0, 72.0],
        [73.1, 57.2]
      ],
      isInsideProtectedZone: true, // Red #ef4444
      label: "Encroachment footprint"
    },
    {
      id: "poly-peripheral",
      // Peripheral access corridor connecting paved roadway to the site entrance
      pointsPercentage: [
        [73.8, 43.8],
        [75.2, 42.6],
        [78.5, 47.5],
        [77.0, 48.8]
      ],
      isInsideProtectedZone: false, // Amber #f59e0b
      label: "Peripheral access corridor"
    }
  ]
};
