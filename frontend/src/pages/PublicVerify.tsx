/**
 * PublicVerify.tsx — Public tamper-verification page accessible without login.
 * Recomputes SHA-256 chain up to the requested hash to verify Section 65B authenticity.
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getLedgerChain, verifyChain, computeBlockHash, LedgerBlock, VerificationResult } from '../engine/ledger';
import { ShieldCheck, ShieldAlert, AlertTriangle, ArrowLeft, CheckCircle2, Lock, ExternalLink, Calendar, Hash, User, MapPin } from 'lucide-react';

export function PublicVerify() {
  const { hash } = useParams<{ hash: string }>();
  const [loading, setLoading] = useState(true);
  const [block, setBlock] = useState<LedgerBlock | null>(null);
  const [chainResult, setChainResult] = useState<VerificationResult | null>(null);
  const [blockValid, setBlockValid] = useState<boolean | null>(null);
  const [recomputedHash, setRecomputedHash] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    async function checkVerification() {
      setLoading(true);
      try {
        const chain = await getLedgerChain();
        const fullVerify = await verifyChain(chain);

        // Find block matching the hash
        const target = chain.find(
          (b) => b.hash.toLowerCase() === hash?.toLowerCase() || b.hash.toLowerCase().startsWith((hash || '').toLowerCase())
        );

        if (!target) {
          if (mounted) {
            setBlock(null);
            setBlockValid(false);
            setChainResult(fullVerify);
            setLoading(false);
          }
          return;
        }

        // Recompute hash for this specific block
        const expected = await computeBlockHash(
          target.index,
          target.prevHash,
          target.timestamp,
          target.payload,
          target.operator
        );

        const isExactValid = expected === target.hash;
        // Also check if any block prior to this one was broken
        const priorBroken = fullVerify.firstInvalidIndex !== null && fullVerify.firstInvalidIndex <= target.index;

        if (mounted) {
          setBlock(target);
          setRecomputedHash(expected);
          setBlockValid(isExactValid && !priorBroken);
          setChainResult(fullVerify);
          setLoading(false);
        }
      } catch (err) {
        console.error('Verification error:', err);
        if (mounted) setLoading(false);
      }
    }

    checkVerification();

    return () => {
      mounted = false;
    };
  }, [hash]);

  return (
    <div className="min-h-screen bg-[#0b0f0e] text-[#f1f5f3] flex flex-col items-center justify-center p-4 sm:p-6 font-sans antialiased">
      {/* Background radial glow */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(34,197,94,0.08),transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-2xl bg-[#111816] border border-[#2a3832] rounded-xl shadow-2xl p-6 sm:p-8 relative z-10">
        {/* Top bar with back link */}
        <div className="flex items-center justify-between pb-5 border-b border-[#2a3832]">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-[#b4c2bb] hover:text-[#22c55e] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to SentinelEye Portal</span>
          </Link>
          <div className="flex items-center gap-1.5 font-mono text-xs text-[#b4c2bb]">
            <Lock className="w-3.5 h-3.5 text-[#22c55e]" />
            <span>Section 65B Public Verifier</span>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#22c55e] border-t-transparent animate-spin" />
            <span className="font-mono text-xs text-[#b4c2bb]">Recomputing cryptographic hash tree...</span>
          </div>
        ) : !block ? (
          /* NOT FOUND */
          <div className="py-10 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-[#f1f5f3]">Record Not Found</h1>
            <p className="text-xs text-[#b4c2bb] max-w-md">
              The cryptographic hash provided does not match any anchored block in the active SentinelEye chain-of-custody ledger.
            </p>
            <div className="p-3 mt-3 w-full max-w-md rounded bg-[#16201c] border border-[#2a3832] font-mono text-[11px] text-amber-400 break-all">
              {hash}
            </div>
          </div>
        ) : blockValid ? (
          /* VALID */
          <div className="py-6 flex flex-col gap-6">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-[#16201c] border border-[#22c55e]/40">
              <div className="w-12 h-12 rounded-full bg-[#22c55e]/20 border border-[#22c55e] flex items-center justify-center text-[#22c55e] flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-[#f1f5f3]">VALID CRYPTOGRAPHIC SEAL</h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30">
                    AUTHENTIC
                  </span>
                </div>
                <p className="text-xs text-[#b4c2bb] mt-0.5">
                  Block #{block.index} in the immutable chain is tamper-free and legally certified under Section 65B of the Indian Evidence Act.
                </p>
              </div>
            </div>

            {/* Block Specifications */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-1">
                <span className="text-[#b4c2bb] flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-[#22c55e]" />
                  <span>Block Index</span>
                </span>
                <span className="font-mono text-sm font-semibold text-[#f1f5f3]">#{block.index}</span>
              </div>

              <div className="p-3 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-1">
                <span className="text-[#b4c2bb] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#22c55e]" />
                  <span>Timestamp</span>
                </span>
                <span className="font-mono text-xs font-semibold text-[#f1f5f3]">
                  {new Date(block.timestamp).toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-1">
                <span className="text-[#b4c2bb] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#22c55e]" />
                  <span>Action Type</span>
                </span>
                <span className="font-mono text-xs font-semibold text-[#22c55e]">{block.type}</span>
              </div>

              <div className="p-3 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-1">
                <span className="text-[#b4c2bb] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#22c55e]" />
                  <span>Authorized Operator</span>
                </span>
                <span className="font-mono text-xs font-semibold text-[#f1f5f3] truncate">{block.operator}</span>
              </div>
            </div>

            {/* Hash Proof Box */}
            <div className="p-4 rounded-lg bg-[#0b0f0e] border border-[#2a3832] flex flex-col gap-2 font-mono text-[11px]">
              <div>
                <span className="text-[#b4c2bb]">Stored Block Hash:</span>
                <div className="p-1.5 rounded bg-[#16201c] text-[#22c55e] break-all mt-1">{block.hash}</div>
              </div>
              <div>
                <span className="text-[#b4c2bb]">Previous Hash Link:</span>
                <div className="p-1.5 rounded bg-[#16201c] text-[#b4c2bb] break-all mt-1">{block.prevHash}</div>
              </div>
            </div>

            {/* Payload Metadata */}
            <div className="p-4 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#f1f5f3]">Anchored Evidence Payload</span>
              <pre className="p-3 rounded bg-[#0b0f0e] border border-[#2a3832] font-mono text-[11px] text-[#b4c2bb] overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(block.payload, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          /* TAMPERED */
          <div className="py-6 flex flex-col gap-6">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-[#16201c] border border-[#ef4444]/60">
              <div className="w-12 h-12 rounded-full bg-[#ef4444]/20 border border-[#ef4444] flex items-center justify-center text-[#ef4444] flex-shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-[#ef4444]">TAMPERED BLOCK DETECTED</h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30">
                    FORGERY
                  </span>
                </div>
                <p className="text-xs text-[#b4c2bb] mt-0.5">
                  Block #{block.index} payload or cryptographic signature does not match recomputed SHA-256 hash. Evidence chain is compromised.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#0b0f0e] border border-[#ef4444]/40 flex flex-col gap-2 font-mono text-[11px]">
              <div>
                <span className="text-[#ef4444] font-semibold">Expected Mathematical Hash:</span>
                <div className="p-1.5 rounded bg-[#16201c] text-[#ef4444] break-all mt-1">{recomputedHash}</div>
              </div>
              <div>
                <span className="text-[#b4c2bb]">Stored (Forged) Hash:</span>
                <div className="p-1.5 rounded bg-[#16201c] text-neutral-400 line-through break-all mt-1">{block.hash}</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-5 border-t border-[#2a3832] flex items-center justify-between text-[11px] text-[#b4c2bb]">
          <span>SentinelEye Autonomous Planetary Intelligence</span>
          <span>WGS84 EPSG:4326 | Copernicus Hub</span>
        </div>
      </div>
    </div>
  );
}
