import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { getPolicyForClass } from '../policy';

interface LegalNoticeData {
  caseRef: string;
  caseId: number;
  alertId: number;
  timestamp: string;
  lat: number;
  lng: number;
  area_m2: number;
  overlap_pct: number;
  encroachmentClass: string;
  severity: string;
  zone: string;
  ledgerHash: string;
  operatorEmail: string;
  beforeImg?: string;
  afterImg?: string;
}

export function generateFIRPdf(data: LegalNoticeData, res: Response): void {
  const doc = new PDFDocument({ margin: 44, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="LegalNotice-${data.caseRef}.pdf"`);
  doc.pipe(res);

  const policy = getPolicyForClass(data.encroachmentClass);

  // 1. SentinelEye Header (Clean, professional flat emerald & dark slate)
  doc.rect(44, 40, 508, 48).fill('#111816');
  
  // Vector brand logo icon
  doc.save();
  doc.rect(56, 52, 24, 24).fill('#22c55e');
  doc.fillColor('#0b0f0e').fontSize(14).font('Helvetica-Bold').text('S', 63, 57);
  doc.restore();

  doc.fillColor('#e6ede9').fontSize(16).font('Helvetica-Bold').text('SENTINELEYE', 90, 51);
  doc.fontSize(8.5).font('Helvetica').fillColor('#8a9a93').text('Planetary Intelligence & Autonomous Land Protection System', 90, 69);
  
  doc.fontSize(8).font('Courier-Bold').fillColor('#22c55e').text('SECURE DISPATCH', 450, 58, { align: 'right', width: 90 });

  doc.moveDown(2.5);

  // 2. Title & Notice Classification
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#111816')
    .text('Automated legal notice (draft, for demonstration)', 44, 102, { align: 'center' });

  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#ef4444')
    .text('NOTICE ISSUED PURSUANT TO SATELLITE BITEMPORAL ANOMALY DETECTION', { align: 'center' });

  doc.moveDown(0.8);
  doc.moveTo(44, doc.y).lineTo(552, doc.y).strokeColor('#1f2a26').stroke();
  doc.moveDown(0.8);

  // 3. Case Details Table
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#111816').text('1. Incident & Inspection Details');
  doc.moveDown(0.4);

  const ha = (data.area_m2 / 10000).toFixed(2);
  const formattedDate = new Date(data.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';

  const rows: [string, string][] = [
    ['Case Reference', data.caseRef],
    ['Violation Class', data.encroachmentClass],
    ['Protected Zone', data.zone],
    ['Severity Rating', data.severity.toUpperCase()],
    ['Affected Footprint', `${data.area_m2.toLocaleString()} m² (~${ha} hectares)`],
    ['Zone Overlap Rate', `${data.overlap_pct.toFixed(1)}% inside protected perimeter`],
    ['GPS Coordinates', `${data.lat.toFixed(6)}° N, ${data.lng.toFixed(6)}° E`],
    ['Detection Timestamp', formattedDate],
    ['Reporting Officer', data.operatorEmail || 'autonomous-operator@sentineleye.org'],
    ['Competent Authority', policy.authority],
  ];

  const col1X = 50;
  const col2X = 180;
  let currentY = doc.y;

  rows.forEach(([label, value], idx) => {
    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.rect(44, currentY - 2, 508, 16).fill('#f8fafc');
    }
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text(label, col1X, currentY);
    doc.font('Helvetica').fontSize(8.5).fillColor('#0f172a').text(value, col2X, currentY);
    currentY += 16;
  });

  doc.y = currentY + 10;
  doc.moveTo(44, doc.y).lineTo(552, doc.y).strokeColor('#1f2a26').stroke();
  doc.moveDown(0.8);

  // 4. Evidence Section with embedded before/after images
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#111816').text('2. Satellite Sensor Evidence');
  doc.fontSize(8).font('Helvetica').fillColor('#64748b').text('Bitemporal change detection (Sentinel-1 SAR + Sentinel-2 MSI)');
  doc.moveDown(0.5);

  const imgY = doc.y;
  const boxWidth = 246;
  const boxHeight = 110;

  // Before Box (T0 Baseline)
  doc.rect(44, imgY, boxWidth, boxHeight).fill('#0b0f0e');
  doc.fillColor('#8a9a93').fontSize(8).font('Helvetica-Bold').text('T0 Baseline Imagery (Pre-Incident)', 54, imgY + 8);

  // Try embed before image
  if (data.beforeImg && data.beforeImg.startsWith('data:image')) {
    try {
      const base64Data = data.beforeImg.replace(/^data:image\/\w+;base64,/, '');
      const buf = Buffer.from(base64Data, 'base64');
      doc.image(buf, 54, imgY + 22, { width: boxWidth - 20, height: boxHeight - 32, fit: [boxWidth - 20, boxHeight - 32] });
    } catch {
      doc.fillColor('#64748b').fontSize(8).text('[Baseline Satellite Crop Attached]', 54, imgY + 50);
    }
  } else {
    doc.fillColor('#64748b').fontSize(8).text('[Baseline Optical Terrain Archive]', 54, imgY + 50);
  }

  // After Box (T1 Validated Detection)
  const afterBoxX = 306;
  doc.rect(afterBoxX, imgY, boxWidth, boxHeight).fill('#0b0f0e');
  doc.fillColor('#ef4444').fontSize(8).font('Helvetica-Bold').text('T1 Change Detection & Mask (Active)', afterBoxX + 10, imgY + 8);

  if (data.afterImg && data.afterImg.startsWith('data:image')) {
    try {
      const base64Data = data.afterImg.replace(/^data:image\/\w+;base64,/, '');
      const buf = Buffer.from(base64Data, 'base64');
      doc.image(buf, afterBoxX + 10, imgY + 22, { width: boxWidth - 20, height: boxHeight - 32, fit: [boxWidth - 20, boxHeight - 32] });
    } catch {
      doc.fillColor('#ef4444').fontSize(8).text('[Encroachment Anomaly Crop Attached]', afterBoxX + 10, imgY + 50);
    }
  } else {
    doc.fillColor('#ef4444').fontSize(8).text('[Encroachment Boundary Flagged]', afterBoxX + 10, imgY + 50);
  }

  doc.y = imgY + boxHeight + 12;
  doc.moveTo(44, doc.y).lineTo(552, doc.y).strokeColor('#1f2a26').stroke();
  doc.moveDown(0.8);

  // 5. Statutory Provisions & Required Actions
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#111816').text('3. Applicable Provisions & Governance Protocol');
  doc.moveDown(0.3);

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1e293b').text(`Governing Act: `, { continued: true });
  doc.font('Helvetica').text(policy.act);
  doc.moveDown(0.2);

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1e293b').text(`Relevant Section: `, { continued: true });
  doc.font('Helvetica').text(policy.section);
  doc.moveDown(0.2);

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1e293b').text(`Statutory Prescribed Action: `, { continued: true });
  doc.font('Helvetica').text(policy.penalty);
  doc.moveDown(0.2);

  doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#64748b').text(`* Note: ${policy.disclaimer}.`);
  doc.moveDown(0.8);

  // 6. Cryptographic Chain Attestation
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#111816').text('4. Cryptographic Ledger Proof');
  doc.moveDown(0.2);
  doc.fontSize(8).font('Helvetica').fillColor('#334155').text('Tamper-evident SHA-256 block hash anchoring this incident into the immutable ledger:');
  doc.moveDown(0.2);
  doc.rect(44, doc.y, 508, 18).fill('#f1f5f9');
  doc.font('Courier').fontSize(7.5).fillColor('#0f766e').text(data.ledgerHash || 'SHA256:PENDING_TRANSACTION_BLOCK', 50, doc.y - 14);

  doc.moveDown(1.5);

  // 7. Signature & Stamp Lines
  doc.fontSize(8.5).font('Helvetica').fillColor('#475569');
  doc.text('Authorized Enforcement Officer: __________________________', 44);
  doc.moveDown(0.3);
  doc.text(`Issuing Jurisdiction: ${policy.authority}`, 44);

  // 8. Footer (Strictly matching requirement D)
  doc.rect(44, 782, 508, 20).fill('#111816');
  doc
    .fontSize(7.5)
    .font('Helvetica-Bold')
    .fillColor('#8a9a93')
    .text('Simulated data. Not a legal document.', 44, 788, { align: 'center', width: 508 });

  doc.end();
}
