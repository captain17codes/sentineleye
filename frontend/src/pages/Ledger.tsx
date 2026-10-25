import React, { useState, useEffect } from 'react';
import {
  getLedgerChain,
  verifyChain,
  simulateTamper,
  restoreTamperedChain,
  LedgerBlock,
  VerificationResult,
} from '../engine/ledger';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  FileText,
  Link as LinkIcon,
} from 'lucide-react';

export function Ledger() {
  const [chain, setChain] = useState<LedgerBlock[]>([]);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [tamperedIdx, setTamperedIdx] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const loadAndVerify = async () => {
    setIsVerifying(true);
    const loadedChain = await getLedgerChain();
    setChain([...loadedChain]);
    const res = await verifyChain(loadedChain);
    setVerification(res);
    setIsVerifying(false);
  };

  useEffect(() => {
    loadAndVerify();
  }, []);

  const handleVerify = async () => {
    setIsVerifying(true);
    const res = await verifyChain(chain);
    setVerification(res);
    setIsVerifying(false);
  };

  const handleTamper = async () => {
    const { tamperedIndex } = await simulateTamper(14); // Tamper block #14
    setTamperedIdx(tamperedIndex);
    const updated = await getLedgerChain();
    setChain([...updated]);
    // Immediately run verify to demonstrate detection
    const res = await verifyChain(updated);
    setVerification(res);
  };

  const handleRestore = async () => {
    restoreTamperedChain();
    setTamperedIdx(null);
    await loadAndVerify();
  };

  const filteredChain = filterType === 'all'
    ? chain
    : chain.filter((b) => b.type === filterType);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a3832]">
        <div>
          <h1 className="text-xl font-semibold text-[#f1f5f3] flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#22c55e]" />
            <span>Cryptographic chain of custody ledger</span>
          </h1>
          <p className="text-xs text-[#b4c2bb] mt-0.5">
            Immutable SHA-256 block chain anchoring electronic evidence under Section 65B Indian Evidence Act
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#22c55e] text-[#0b0f0e] font-semibold text-xs hover:bg-[#16a34a] transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Verifying...' : 'Verify chain'}</span>
          </button>

          {tamperedIdx === null ? (
            <button
              onClick={handleTamper}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16201c] border border-amber-500/40 text-amber-400 text-xs font-medium hover:bg-amber-500/10 transition-colors"
              title="Demonstrates fraud detection by modifying block #14 data"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate tampering</span>
            </button>
          ) : (
            <button
              onClick={handleRestore}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16201c] border border-[#22c55e] text-[#22c55e] text-xs font-medium hover:bg-[#22c55e]/10 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#22c55e]" />
              <span>Restore chain</span>
            </button>
          )}
        </div>
      </div>

      {/* Verification Status Banner */}
      {verification && (
        <div
          className={`p-4 rounded-lg border flex items-center justify-between gap-4 ${
            verification.valid
              ? 'bg-[#16201c] border-[#22c55e] text-[#22c55e]'
              : 'bg-[#16201c] border-critical text-critical'
          }`}
        >
          <div className="flex items-center gap-3">
            {verification.valid ? (
              <ShieldCheck className="w-6 h-6 text-[#22c55e] shrink-0" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-critical shrink-0 animate-pulse" />
            )}
            <div>
              <div className="font-semibold text-sm">
                {verification.valid
                  ? `Cryptographic Integrity Intact • ${verification.blocksVerified} Blocks Verified`
                  : `Tampering Detected at Block #${verification.firstInvalidIndex}`}
              </div>
              <div className="text-xs text-[#b4c2bb] mt-0.5">
                {verification.valid
                  ? 'All sequential SHA-256 block hashes and previous-hash pointers match root anchor.'
                  : verification.reason}
              </div>
            </div>
          </div>

          <div className="font-mono text-xs px-2.5 py-1 rounded bg-[#111816] border border-[#2a3832] shrink-0 text-[#f1f5f3]">
            {verification.valid ? 'VALID SEAL' : 'INVALID CHAIN'}
          </div>
        </div>
      )}

      {/* Filter and Stats Bar */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-[#111816] border border-[#2a3832] text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[#b4c2bb]">Filter by block type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#0b0f0e] border border-[#2a3832] text-[#f1f5f3] rounded px-2.5 py-1 text-xs focus:outline-none focus:border-[#22c55e]"
          >
            <option value="all">All Block Types ({chain.length})</option>
            <option value="SCENE_INGEST">SCENE_INGEST</option>
            <option value="DETECTION">DETECTION</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="NOTICE_ISSUED">NOTICE_ISSUED</option>
          </select>
        </div>

        <div className="text-[#b4c2bb] font-mono">
          Showing {filteredChain.length} of {chain.length} blocks
        </div>
      </div>

      {/* Blocks List */}
      <div className="flex flex-col gap-3">
        {filteredChain.map((block) => {
          const isBroken =
            verification &&
            !verification.valid &&
            verification.firstInvalidIndex !== null &&
            block.index >= verification.firstInvalidIndex;

          return (
            <div
              key={block.index}
              className={`p-4 rounded-lg bg-[#111816] border transition-colors flex flex-col gap-3 ${
                isBroken
                  ? 'border-critical/80 bg-critical/5'
                  : 'border-[#2a3832] hover:border-[#22c55e]/50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${
                      isBroken
                        ? 'border-critical text-critical bg-critical/10'
                        : 'border-[#22c55e] text-[#22c55e] bg-[#16201c]'
                    }`}
                  >
                    Block #{block.index}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#16201c] border border-[#2a3832] text-[#f1f5f3]">
                    {block.type}
                  </span>
                  <span className="text-xs text-[#b4c2bb] font-mono">
                    {new Date(block.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#b4c2bb] font-mono">
                  <span>Operator:</span>
                  <span className="text-[#f1f5f3]">{block.operator}</span>
                </div>
              </div>

              {/* Hash Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono pt-2 border-t border-[#2a3832]/60">
                <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis">
                  <LinkIcon className="w-3.5 h-3.5 text-[#b4c2bb] shrink-0" />
                  <span className="text-[#b4c2bb] shrink-0">Prev:</span>
                  <span className="text-[#8fa097] truncate" title={block.prevHash}>
                    {block.prevHash}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis">
                  <Lock className={`w-3.5 h-3.5 shrink-0 ${isBroken ? 'text-critical' : 'text-[#22c55e]'}`} />
                  <span className="text-[#b4c2bb] shrink-0">Hash:</span>
                  <span
                    className={`font-semibold truncate ${
                      isBroken ? 'text-critical' : 'text-[#22c55e]'
                    }`}
                    title={block.hash}
                  >
                    {block.hash}
                  </span>
                </div>
              </div>

              {/* Payload Preview */}
              <div className="p-2.5 rounded bg-[#0b0f0e] border border-[#2a3832] text-xs font-mono text-[#b4c2bb] overflow-x-auto">
                <div className="text-[10px] uppercase tracking-wider text-[#8fa097] mb-1 font-sans font-semibold">
                  Block Payload (Canonical)
                </div>
                <pre className="text-[11px] text-[#f1f5f3]">
                  {JSON.stringify(block.payload, null, 2)}
                </pre>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
