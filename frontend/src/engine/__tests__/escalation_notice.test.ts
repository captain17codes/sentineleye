import { describe, it, expect } from 'vitest';
import { getAlerts } from '../store/alertStore';
import { transitionAlert } from '../clock';
import { generateNoticePdf } from '../pdfNotice';
import { getLedgerChain, verifyChain } from '../ledger';

describe('Escalation Protocol & Section 65B Notice Generation', () => {
  it('advances alert through legal escalation transitions and records ledger blocks', async () => {
    const alerts = getAlerts();
    const candidate = alerts.find((a) => a.status === 'New') || alerts[0];

    // Force candidate to New if needed
    candidate.status = 'New';

    // Step 1: New -> Verified (T+00:15)
    const step1 = await transitionAlert(candidate.id, 'Verified', 'officer@delhiforest.gov.in', 'Multi-spectral satellite verification complete');
    expect(step1.alert.status).toBe('Verified');
    expect(step1.block.type).toBe('VERIFIED');
    expect(step1.block.hash).toBeDefined();

    // Verify chain is valid
    const chain1 = await getLedgerChain();
    const verify1 = await verifyChain(chain1);
    expect(verify1.valid).toBe(true);

    // Step 2: Verified -> Notice Issued (T+04:00)
    const step2 = await transitionAlert(candidate.id, 'Notice Issued', 'officer@delhiforest.gov.in', 'Section 65B notice issued');
    expect(step2.alert.status).toBe('Notice Issued');
    expect(step2.block.type).toBe('NOTICE_ISSUED');

    const chain2 = await getLedgerChain();
    const verify2 = await verifyChain(chain2);
    expect(verify2.valid).toBe(true);
  });

  it('guards against illegal statutory transitions', async () => {
    const alerts = getAlerts();
    const candidate = alerts.find((a) => a.status === 'Notice Issued') || alerts[0];
    candidate.status = 'Notice Issued';

    // Cannot transition from Notice Issued to Verified
    await expect(transitionAlert(candidate.id, 'Verified' as any)).rejects.toThrow(/Illegal transition/);

    candidate.status = 'New';
    // Cannot transition directly from New to Notice Issued without verification
    await expect(transitionAlert(candidate.id, 'Notice Issued' as any)).rejects.toThrow(/Illegal transition/);
  });

  it('generates a valid client-side Section 65B PDF document with QR code seal', async () => {
    const alert = getAlerts()[0];
    const { doc, filename } = await generateNoticePdf({
      alert,
      simulatedDate: '2026-10-25',
    });

    expect(doc).toBeDefined();
    expect(filename).toContain(`SentinelEye_Section65B_Notice_Alert_${alert.id}.pdf`);
    // Output blob
    const pdfBlob = doc.output('blob');
    expect(pdfBlob.size).toBeGreaterThan(1000); // Valid non-empty PDF binary
  });
});
