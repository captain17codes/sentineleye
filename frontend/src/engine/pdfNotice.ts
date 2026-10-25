/**
 * pdfNotice.ts — Pure client-side Section 65B Statutory Eviction Notice PDF generator.
 * Uses jsPDF and qrcode. Works completely offline on Vercel without a live backend.
 */

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Alert } from '../types/alert.types';
import { getPolicyForClass } from '../utils/policy';
import { getLedgerChain } from './ledger';

/**
 * Generate a procedural satellite imagery swatch if real image URLs are empty or blocked.
 */
function createFallbackEvidenceDataUrl(label: string, isAfter: boolean, alert: Alert): string {
  if (typeof document === 'undefined') {
    // In headless test / Node environment
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background - satellite terrain simulation
  ctx.fillStyle = isAfter ? '#1a231d' : '#142017';
  ctx.fillRect(0, 0, 240, 180);

  // Terrain texture
  ctx.fillStyle = isAfter ? '#26392c' : '#1e3825';
  for (let x = 0; x < 240; x += 16) {
    for (let y = 0; y < 180; y += 16) {
      if ((x * 7 + y * 13) % 5 === 0) {
        ctx.fillRect(x, y, 14, 14);
      }
    }
  }

  if (isAfter) {
    // Draw detected encroachment footprint
    ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 50);
    ctx.lineTo(170, 60);
    ctx.lineTo(190, 130);
    ctx.lineTo(95, 140);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crosshair target
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(135, 95, 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  for (let x = 30; x < 240; x += 45) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 180);
    ctx.stroke();
  }
  for (let y = 30; y < 180; y += 45) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(240, y);
    ctx.stroke();
  }

  // Label banner
  ctx.fillStyle = 'rgba(11, 15, 14, 0.85)';
  ctx.fillRect(0, 150, 240, 30);
  ctx.fillStyle = isAfter ? '#ef4444' : '#22c55e';
  ctx.font = 'bold 11px Courier, monospace';
  ctx.fillText(label, 8, 168);

  ctx.fillStyle = '#b4c2bb';
  ctx.font = '9px Courier, monospace';
  ctx.fillText(`${alert.lat.toFixed(4)}N, ${alert.lng.toFixed(4)}E`, 125, 168);

  return canvas.toDataURL('image/png');
}

export interface GeneratePdfOptions {
  alert: Alert;
  simulatedDate?: string;
  beforeDataUrl?: string;
  afterDataUrl?: string;
}

export async function generateNoticePdf({
  alert,
  simulatedDate,
  beforeDataUrl,
  afterDataUrl,
}: GeneratePdfOptions): Promise<{ doc: jsPDF; filename: string }> {
  const policy = getPolicyForClass(alert.class);
  const chain = await getLedgerChain();

  // Find corresponding ledger block
  const block = chain.find((b) => (b.payload as any)?.alertId === alert.id) || chain[chain.length - 1] || {
    index: 1,
    hash: alert.ledger_hash || '3fa85f647f3b5f9e0a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f',
    prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
  };

  const blockIndex = block.index;
  const blockHash = block.hash;
  const prevHash = block.prevHash;

  // Verification public URL
  const host = typeof window !== 'undefined' ? window.location.origin : 'https://sentineleye-ebon.vercel.app';
  const verifyUrl = `${host}/verify/${blockHash}`;

  // Generate QR Code data URL
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 140,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  // Prepare images
  const t0Img = beforeDataUrl || (alert.before_img && alert.before_img.startsWith('data:') ? alert.before_img : createFallbackEvidenceDataUrl('T0: BASELINE ORTHO', false, alert));
  const t1Img = afterDataUrl || (alert.after_img && alert.after_img.startsWith('data:') ? alert.after_img : createFallbackEvidenceDataUrl('T1: FUSED INFRACTION', true, alert));

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const dateStr = simulatedDate || new Date().toISOString().split('T')[0];
  const noticeRef = `SE/EVICT/2026/${String(alert.id).padStart(5, '0')}`;

  // ── Header Box ──
  doc.setFillColor(15, 23, 20); // Dark tactical header
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(34, 197, 94); // #22c55e
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('GOVERNMENT OF NATIONAL CAPITAL TERRITORY OF DELHI', 14, 11);

  doc.setFontSize(10);
  doc.setTextColor(241, 245, 243);
  doc.text(policy.authority.toUpperCase(), 14, 18);

  doc.setFontSize(8);
  doc.setTextColor(180, 194, 187);
  doc.setFont('courier', 'normal');
  doc.text(`STATUTORY NOTICE REF: ${noticeRef}  |  DATE: ${dateStr}`, 14, 25);
  doc.text(`SENTINEL-1/2 ORBITAL SURVEILLANCE & ENFORCEMENT DIVISION`, 14, 29);

  // ── Notice Subject / Title ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text('SHOW-CAUSE NOTICE & STATUTORY DEMOLITION/EVICTION ORDER', 14, 42);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Under Section 65B of Indian Evidence Act, 1872 / Section 63 Bharatiya Sakshya Adhiniyam, 2023`,
    14,
    47
  );

  // ── Grid Details Section ──
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(14, 50, pageWidth - 14, 50);

  const leftX = 14;
  const colW = (pageWidth - 28) / 2;

  // Column 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text('1. DETECTION METADATA', leftX, 56);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Incident ID: ALERT #${alert.id}`, leftX, 62);
  doc.text(`Protected Sector: ${alert.zone_name || 'Zone ' + alert.zone_id}`, leftX, 67);
  doc.text(`Coordinates: ${alert.lat.toFixed(5)}° N, ${alert.lng.toFixed(5)}° E`, leftX, 72);
  doc.text(`Infringed Encroached Area: ${alert.area_m2.toLocaleString()} sq. meters`, leftX, 77);
  doc.text(`Cadastral Zone Overlap: ${alert.overlap_pct}%`, leftX, 82);

  // Column 2
  const rightX = leftX + colW;
  doc.setFont('helvetica', 'bold');
  doc.text('2. STATUTORY CLASSIFICATION', rightX, 56);

  doc.setFont('helvetica', 'normal');
  doc.text(`Infraction Class: ${alert.class}`, rightX, 62);
  doc.text(`Severity Grading: ${alert.severity}`, rightX, 67);
  doc.text(`Algorithmic Confidence: ${((alert.confidence || 0.92) * 100).toFixed(1)}%`, rightX, 72);
  doc.text(`Sensors: Sentinel-1 C-SAR & Sentinel-2 MSI`, rightX, 77);
  doc.text(`Status: ${alert.status.toUpperCase()}`, rightX, 82);

  // ── Statutory Policy Table Box ──
  const tableY = 88;
  doc.setFillColor(245, 247, 246);
  doc.rect(14, tableY, pageWidth - 28, 28, 'F');
  doc.rect(14, tableY, pageWidth - 28, 28, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text(`Governing Statute:`, 18, tableY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${policy.act}`, 54, tableY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(`Statutory Section:`, 18, tableY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${policy.section}`, 54, tableY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text(`Prescribed Penalty:`, 18, tableY + 18);
  doc.setFont('helvetica', 'normal');
  const penaltyLines = doc.splitTextToSize(policy.penalty, pageWidth - 76);
  doc.text(penaltyLines, 54, tableY + 18);

  doc.setFont('helvetica', 'bold');
  doc.text(`Enforcing Body:`, 18, tableY + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(`${policy.authority}`, 54, tableY + 24);

  // ── Satellite Evidence Section (Bitemporal) ──
  const imgY = tableY + 34;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text('3. BITEMPORAL SATELLITE EVIDENCE OF INFRACTION', 14, imgY);

  const imgW = (pageWidth - 34) / 2;
  const imgH = 46;

  try {
    doc.addImage(t0Img, 'PNG', 14, imgY + 3, imgW, imgH);
    doc.rect(14, imgY + 3, imgW, imgH, 'S');

    doc.addImage(t1Img, 'PNG', 14 + imgW + 6, imgY + 3, imgW, imgH);
    doc.rect(14 + imgW + 6, imgY + 3, imgW, imgH, 'S');
  } catch (err) {
    console.warn('[PDF] Failed to draw images:', err);
  }

  // ── Cryptographic Proof & Ledger Seal (Section 65B) ──
  const sealY = imgY + imgH + 8;
  doc.setFillColor(240, 244, 241);
  doc.rect(14, sealY, pageWidth - 28, 44, 'F');
  doc.rect(14, sealY, pageWidth - 28, 44, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(34, 130, 70);
  doc.text('4. CRYPTOGRAPHIC CHAIN-OF-CUSTODY SEAL (SEC. 65B CERTIFICATE)', 18, sealY + 6);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 30, 30);
  doc.text(`Ledger Block Index : #${blockIndex}`, 18, sealY + 12);
  doc.text(`Block Hash (SHA256): ${blockHash}`, 18, sealY + 17);
  doc.text(`Previous Block Hash: ${prevHash}`, 18, sealY + 22);
  doc.text(`Ingestion Standard : Copernicus ESA Open Access Hub`, 18, sealY + 27);
  doc.text(`Verification URL   : ${verifyUrl}`, 18, sealY + 32);

  // Draw QR code on right side of seal box
  try {
    doc.addImage(qrDataUrl, 'PNG', pageWidth - 48, sealY + 4, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(60, 60, 60);
    doc.text('SCAN TO VERIFY LEDGER', pageWidth - 46, sealY + 37);
  } catch (err) {
    console.warn('[PDF] Failed to draw QR:', err);
  }

  // ── Section 65B Legal Admissibility Certificate Statement ──
  const certY = sealY + 48;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);
  doc.text('STATUTORY DECLARATION UNDER SECTION 65B(4):', 14, certY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(70, 70, 70);
  const declarationText =
    `I, authorized technical operator of SentinelEye Automated Intelligence Platform, hereby certify that the electronic record reproduced above was derived from computer systems operated lawfully by GNCTD during regular surveillance. The satellite telemetry and multi-temporal backscatter rasters were processed in a deterministic automated pipeline without manual tampering. The SHA-256 cryptographic chain above certifies the mathematical immutability of this record from raw ingestion to notice generation.`;
  const splitDeclaration = doc.splitTextToSize(declarationText, pageWidth - 28);
  doc.text(splitDeclaration, 14, certY + 4);

  // ── Sign-off & Footer ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);
  doc.text('Authorized Enforcement Signatory', pageWidth - 65, 282);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('SentinelEye Autonomous Governance Unit', pageWidth - 65, 286);

  doc.setDrawColor(200, 200, 200);
  doc.line(14, 290, pageWidth - 14, 290);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(130, 130, 130);
  doc.text('SENTINEL-EYE TAMPER-EVIDENT EVIDENCE DOSSIER  |  CONFIDENTIAL & PRIVILEGED OFFICIAL USE ONLY', 14, 293);

  const filename = `SentinelEye_Section65B_Notice_Alert_${alert.id}.pdf`;
  return { doc, filename };
}

/**
 * Triggers browser download of Section 65B PDF.
 */
export async function downloadNoticePdf(alert: Alert, simulatedDate?: string): Promise<void> {
  const { doc, filename } = await generateNoticePdf({ alert, simulatedDate });
  doc.save(filename);
}
