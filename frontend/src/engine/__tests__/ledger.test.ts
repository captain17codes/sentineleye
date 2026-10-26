import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGenesisBlock,
  appendBlock,
  verifyChain,
  canonicalStringify,
  computeBlockHash,
  signBlockHash,
  verifyBlockSignature,
  createEvidenceManifest,
  getLedgerChain,
  simulateNaiveTamper,
  simulateSmartTamper,
  restoreTamperedChain,
  anchorChainHead,
  getChainAnchor,
  clearChainAnchor,
  LedgerBlock,
} from '../ledger';

describe('SentinelEye Cryptographic Ledger Unit Tests', () => {
  beforeEach(() => {
    restoreTamperedChain();
    clearChainAnchor();
  });

  it('generates deterministic canonical string representations', () => {
    const objA = { z: 1, a: 2, m: { y: 'hello', x: 'world' } };
    const objB = { a: 2, m: { x: 'world', y: 'hello' }, z: 1 };

    expect(canonicalStringify(objA)).toBe(canonicalStringify(objB));
  });

  it('signs and verifies block hash with WebCrypto ECDSA P-256', async () => {
    const testHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const { signature, publicKey } = await signBlockHash(testHash);

    expect(signature).toBeDefined();
    expect(signature.length).toBeGreaterThan(0);
    expect(publicKey).toBeDefined();

    const isValid = await verifyBlockSignature(testHash, signature, publicKey);
    expect(isValid).toBe(true);

    const isWrongValid = await verifyBlockSignature('different_hash', signature, publicKey);
    expect(isWrongValid).toBe(false);
  });

  it('generates a valid Merkle evidence manifest with 5 component hashes', async () => {
    const manifest = await createEvidenceManifest(102, [77.16, 28.58]);

    expect(manifest.t0RasterHash).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.t1RasterHash).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.ndviTensorHash).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.sarBackscatterHash).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.cadastralBoundaryHash).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.merkleRoot).toMatch(/^[0-9a-f]{64}$/);
  });

  it('creates and verifies a valid cryptographic chain with signatures and manifests', async () => {
    const chain: LedgerBlock[] = [];
    const genesis = await createGenesisBlock();
    chain.push(genesis);

    const b1 = await appendBlock(chain, 'DETECTION', { alertId: 601, area: 4200 });
    chain.push(b1);

    const b2 = await appendBlock(chain, 'VERIFIED', { alertId: 601, verifiedBy: 'analyst@sentineleye.com' });
    chain.push(b2);

    const b3 = await appendBlock(chain, 'NOTICE_ISSUED', { alertId: 601, noticeRef: 'SEC63-BSA-2024-001' });
    chain.push(b3);

    const result = await verifyChain(chain);
    expect(result.valid).toBe(true);
    expect(result.blocksVerified).toBe(4);
    expect(result.firstInvalidIndex).toBeNull();
  });

  it('detects Level 1 Naive Tampering (payload modified without recomputing hashes)', async () => {
    const chain: LedgerBlock[] = [];
    const genesis = await createGenesisBlock();
    chain.push(genesis);

    const b1 = await appendBlock(chain, 'DETECTION', { alertId: 601, area: 4200 });
    chain.push(b1);

    const b2 = await appendBlock(chain, 'VERIFIED', { alertId: 601, coordinates: [77.08, 28.52] });
    chain.push(b2);

    // Tamper with Block #2 coordinates
    b2.payload.coordinates = [77.99, 28.99];

    const result = await verifyChain(chain);
    expect(result.valid).toBe(false);
    expect(result.firstInvalidIndex).toBe(2);
    expect(result.reason).toContain('Block #2 tampered');
  });

  it('detects broken chain link when previous hash is forged', async () => {
    const chain: LedgerBlock[] = [];
    const genesis = await createGenesisBlock();
    chain.push(genesis);

    const b1 = await appendBlock(chain, 'DETECTION', { alertId: 601 });
    chain.push(b1);

    const b2 = await appendBlock(chain, 'VERIFIED', { alertId: 601 });
    chain.push(b2);

    // Mutate previous hash of b2
    b2.prevHash = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

    const result = await verifyChain(chain);
    expect(result.valid).toBe(false);
    expect(result.firstInvalidIndex).toBe(2);
    expect(result.reason).toContain('Broken chain link');
  });

  it('accepts blocks appended after the anchor, but catches a rewrite of anchored history', async () => {
    const chain: LedgerBlock[] = [await createGenesisBlock()];
    chain.push(await appendBlock(chain, 'DETECTION', { alertId: 1 }));
    const anchor = { anchoredHeadHash: chain[1].hash, blockIndex: 1, anchoredAt: '', anchorRef: '', publicAnchorUrl: '' };
    chain.push(await appendBlock(chain, 'VERIFIED', { alertId: 1 }));
    expect((await verifyChain(chain, anchor)).valid).toBe(true);

    // rewrite block 1 and re-hash everything after it: internally consistent, but not the anchored history
    const forged: LedgerBlock[] = [chain[0]];
    forged.push(await appendBlock(forged, 'DETECTION', { alertId: 999 }));
    forged.push(await appendBlock(forged, 'VERIFIED', { alertId: 999 }));
    const r = await verifyChain(forged, anchor);
    expect(r.valid).toBe(false);
    expect(r.smartRewriteDetected).toBe(true);

    // truncating below the anchor is caught too
    expect((await verifyChain(chain.slice(0, 1), anchor)).valid).toBe(false);
  });

  it('detects Level 2 Smart Tampering via External Anchor mismatch', async () => {
    // Initialize ledger chain and anchor
    const chain = await getLedgerChain();
    const anchor = anchorChainHead(chain[chain.length - 1].hash, chain.length - 1);

    // Before tampering, chain is valid
    const preCheck = await verifyChain(chain, anchor);
    expect(preCheck.valid).toBe(true);

    // Perform smart tamper at block #14
    const tamperResult = await simulateSmartTamper(14);
    expect(tamperResult.tamperedIndex).toBe(14);
    expect(tamperResult.newHeadHash).not.toBe(tamperResult.oldHeadHash);

    // Verifying without anchor would pass internal hash checks...
    const unanchoredCheck = await verifyChain(chain);
    // (Note: unless signature verification flags the lack of operator re-signing, the hashes themselves match)

    // BUT verifying with external anchor MUST catch the smart rewrite!
    const anchoredCheck = await verifyChain(chain, anchor);
    expect(anchoredCheck.valid).toBe(false);
    expect(anchoredCheck.smartRewriteDetected).toBe(true);
    expect(anchoredCheck.anchoredHeadHash).toBe(tamperResult.oldHeadHash);
    expect(anchoredCheck.currentHeadHash).toBe(tamperResult.newHeadHash);

    // Restoring chain brings it back to valid state
    restoreTamperedChain();
    const postRestoreAnchor = getChainAnchor();
    const restoredCheck = await verifyChain(await getLedgerChain(), postRestoreAnchor);
    expect(restoredCheck.valid).toBe(true);
  });
});
