import { describe, it, expect } from 'vitest';
import {
  createGenesisBlock,
  appendBlock,
  verifyChain,
  canonicalStringify,
  computeBlockHash,
  LedgerBlock,
} from '../ledger';

describe('SentinelEye Cryptographic Ledger Unit Tests', () => {
  it('generates deterministic canonical string representations', () => {
    const objA = { z: 1, a: 2, m: { y: 'hello', x: 'world' } };
    const objB = { a: 2, m: { x: 'world', y: 'hello' }, z: 1 };

    expect(canonicalStringify(objA)).toBe(canonicalStringify(objB));
  });

  it('creates and verifies a valid cryptographic chain', async () => {
    const chain: LedgerBlock[] = [];
    const genesis = await createGenesisBlock();
    chain.push(genesis);

    const b1 = await appendBlock(chain, 'DETECTION', { alertId: 601, area: 4200 });
    chain.push(b1);

    const b2 = await appendBlock(chain, 'VERIFIED', { alertId: 601, verifiedBy: 'analyst@sentineleye.com' });
    chain.push(b2);

    const b3 = await appendBlock(chain, 'NOTICE_ISSUED', { alertId: 601, noticeRef: 'SEC65B-2024-001' });
    chain.push(b3);

    const result = await verifyChain(chain);
    expect(result.valid).toBe(true);
    expect(result.blocksVerified).toBe(4);
    expect(result.firstInvalidIndex).toBeNull();
  });

  it('detects tampering when payload fields are modified', async () => {
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
});
