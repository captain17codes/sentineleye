import React, { useState, useEffect } from 'react';
import {
  getLedgerChain,
  verifyChain,
  simulateNaiveTamper,
  simulateSmartTamper,
  restoreTamperedChain,
  getChainAnchor,
  anchorChainHead,
  LedgerBlock,
  VerificationResult,
  ChainAnchor,
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
  Anchor,
  Copy,
  ExternalLink,
  KeyRound,
  FileCode2,
} from 'lucide-react';
import { LoadingState, EmptyState } from '../components/ui/StatusStates';

export function Ledger() {
  const [chain, setChain] = useState<LedgerBlock[]>([]);
  const [anchor, setAnchor] = useState<ChainAnchor | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [tamperedType, setTamperedType] = useState<'naive' | 'smart' | null>(null);
  const [tamperedIdx, setTamperedIdx] = useState<number | null>(null);
  const [copiedHead, setCopiedHead] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  const loadAndVerify = async () => {
    setIsVerifying(true);
    const loadedChain = await getLedgerChain();
    const loadedAnchor = getChainAnchor();
    setChain([...loadedChain]);
    setAnchor(loadedAnchor);

    const res = await verifyChain(loadedChain, loadedAnchor);
    setVerification(res);
    setIsVerifying(false);
  };

  useEffect(() => {
    loadAndVerify();
  }, []);

  const handleVerify = async () => {
    setIsVerifying(true);
    const loadedAnchor = getChainAnchor();
    setAnchor(loadedAnchor);
    const res = await verifyChain(chain, loadedAnchor);
    setVerification(res);
    setIsVerifying(false);
  };

  const handleNaiveTamper = async () => {
    const { tamperedIndex } = await simulateNaiveTamper(14);
    setTamperedType('naive');
    setTamperedIdx(tamperedIndex);
    const updated = await getLedgerChain();
    setChain([...updated]);
    const res = await verifyChain(updated, getChainAnchor());
    setVerification(res);
  };

  const handleSmartTamper = async () => {
    const { tamperedIndex } = await simulateSmartTamper(14);
    setTamperedType('smart');
    setTamperedIdx(tamperedIndex);
    const updated = await getLedgerChain();
    setChain([...updated]);
    const res = await verifyChain(updated, getChainAnchor());
    setVerification(res);
  };

  const handleRestore = async () => {
    restoreTamperedChain();
    setTamperedType(null);
    setTamperedIdx(null);
    await loadAndVerify();
  };

  const handleAnchorNow = () => {
    if (chain.length === 0) return;
    const head = chain[chain.length - 1].hash;
    const newAnchor = anchorChainHead(head, chain.length - 1);
    setAnchor(newAnchor);
    handleVerify();
  };

  const currentHeadHash = chain.length > 0 ? chain[chain.length - 1].hash : '';

  const handleCopyHead = () => {
    if (!currentHeadHash) return;
    navigator.clipboard.writeText(currentHeadHash);
    setCopiedHead(true);
    setTimeout(() => setCopiedHead(false), 2000);
  };

  const filteredChain = filterType === 'all'
    ? chain
    : chain.filter((b) => b.type === filterType);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2e2e2e]">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f0] flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#facc15]" />
            <span>Cryptographic chain of custody ledger</span>
          </h1>
          <p className="text-xs text-[#b5b5ad] mt-0.5">
            Immutable SHA-256 block chain anchoring electronic evidence under Section 63, Bharatiya Sakshya Adhiniyam, 2023 (formerly Section 65B, Indian Evidence Act, 1872)
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#facc15] text-[#0a0a0a] font-semibold text-xs hover:bg-[#eab308] transition-colors shadow-sm disabled:opacity-50 min-h-[38px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Verifying...' : 'Verify chain'}</span>
          </button>

          {tamperedType === null ? (
            <>
              <button
                onClick={handleNaiveTamper}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1a1a1a] border border-amber-500/40 text-amber-400 text-xs font-semibold hover:bg-amber-500/10 transition-colors min-h-[38px]"
                title="Level 1: Mutates Block #14 payload without updating following hashes"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Level 1: Naive Tamper</span>
              </button>

              <button
                onClick={handleSmartTamper}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1a1a1a] border border-red-500/40 text-red-400 text-xs font-semibold hover:bg-red-500/10 transition-colors min-h-[38px]"
                title="Level 2: Mutates Block #14 payload AND recomputes all subsequent hashes to trick the chain"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>Level 2: Smart Tamper</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleRestore}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#facc15] text-[#facc15] text-xs font-semibold hover:bg-[#facc15]/10 transition-colors min-h-[38px]"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#facc15]" />
              <span>Restore chain ({tamperedType === 'smart' ? 'Smart Tamper' : 'Naive Tamper'})</span>
            </button>
          )}
        </div>
      </div>

      {/* Chain Head & External Anchoring Card */}
      <div className="p-4 rounded-xl bg-[#121212] border border-[#2e2e2e] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Anchor className="w-4 h-4 text-[#facc15]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#f5f5f0]">
              Chain head & anchor
            </span>
            {anchor && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#facc15]/15 border border-[#facc15]/30 text-[#facc15]">
                ANCHORED
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#b5b5ad] kpi-subtitle">
            The latest block hash is saved in a separate anchor record. In this prototype the anchor is stored locally; in production it would be published to a public timestamping service.
          </p>
          <div className="flex items-center gap-2 text-xs font-mono text-[#b5b5ad] mt-0.5">
            <span className="text-[#8f8f86]">Current Head:</span>
            <span className="text-[#facc15] font-semibold truncate max-w-md" title={currentHeadHash}>
              {currentHeadHash}
            </span>
            <button
              onClick={handleCopyHead}
              className="p-1.5 hover:text-[#f5f5f0] transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
              title="Copy Chain Head Hash"
              aria-label="Copy Chain Head Hash"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            {copiedHead && <span className="text-[10px] text-[#facc15]">Copied!</span>}
          </div>
          {anchor && (
            <div className="text-[11px] text-[#8f8f86] font-mono flex items-center gap-2 flex-wrap">
              <span>Anchored at: {new Date(anchor.anchoredAt).toLocaleTimeString()}</span>
              <span>•</span>
              <span className="text-[#facc15] flex items-center gap-1">
                <span>{anchor.anchorRef}</span>
              </span>
            </div>
          )}
        </div>

        <button
          onClick={handleAnchorNow}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#121212] border border-[#facc15] text-[#facc15] font-semibold text-xs transition-colors shrink-0 min-h-[38px]"
        >
          <Anchor className="w-3.5 h-3.5" />
          <span>Anchor chain head</span>
        </button>
      </div>

      {/* Verification Status Banner */}
      {verification && (
        <div
          className={`p-4 rounded-lg border flex items-center justify-between gap-4 ${
            verification.valid
              ? 'bg-[#1a1a1a] border-[#facc15] text-[#facc15]'
              : verification.smartRewriteDetected
              ? 'bg-red-950/40 border-red-500 text-red-400'
              : 'bg-[#1a1a1a] border-critical text-critical'
          }`}
        >
          <div className="flex items-center gap-3">
            {verification.valid ? (
              <ShieldCheck className="w-6 h-6 text-[#facc15] shrink-0" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-critical shrink-0 animate-pulse" />
            )}
            <div>
              <div className="font-semibold text-sm">
                {verification.valid
                  ? `Cryptographic Integrity Intact • ${verification.blocksVerified} Blocks & ECDSA P-256 Signatures Verified`
                  : verification.smartRewriteDetected
                  ? `🚨 SMART REWRITE DETECTED: Chain Internally Valid but Anchored Head Mismatch!`
                  : `Tampering Detected at Block #${verification.firstInvalidIndex}`}
              </div>
              <p className="text-[11px] text-[#b5b5ad] kpi-subtitle mt-0.5">
                Cryptographic integrity: SHA-256 block hash tree ensuring complete tamper resistance under Sec 63 BSA
              </p>
              <div className="text-xs text-[#b5b5ad] mt-0.5 leading-relaxed">
                {verification.valid
                  ? 'All sequential SHA-256 block hashes, ECDSA operator signatures, and the saved anchor record all match.'
                  : verification.reason}
              </div>
            </div>
          </div>

          <div className="font-mono text-xs px-2.5 py-1 rounded bg-[#121212] border border-[#2e2e2e] shrink-0 text-[#f5f5f0]">
            {verification.valid
              ? 'VALID SEAL'
              : verification.smartRewriteDetected
              ? 'ANCHOR MISMATCH'
              : 'INVALID CHAIN'}
          </div>
        </div>
      )}

      {/* Filter and Stats Bar */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-[#121212] border border-[#2e2e2e] text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[#b5b5ad]">Filter by block type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#0a0a0a] border border-[#2e2e2e] text-[#f5f5f0] rounded px-2.5 py-1 text-xs focus:outline-none focus:border-[#facc15]"
          >
            <option value="all">All Block Types ({chain.length})</option>
            <option value="SCENE_INGEST">SCENE_INGEST</option>
            <option value="DETECTION">DETECTION</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="NOTICE_ISSUED">NOTICE_ISSUED</option>
            <option value="SIGNED_AND_SERVED">SIGNED_AND_SERVED</option>
          </select>
        </div>

        <div className="text-[#b5b5ad] font-mono">
          Showing {filteredChain.length} of {chain.length} blocks
        </div>
      </div>

      {/* Blocks List */}
      {isVerifying && chain.length === 0 ? (
        <LoadingState
          title="VALIDATING CRYPTOGRAPHIC CHAIN..."
          message="Computing SHA-256 block hash tree, ECDSA P-256 signatures, and external timestamp anchor..."
        />
      ) : filteredChain.length === 0 ? (
        <EmptyState
          title="No blocks found"
          message="No ledger blocks match the selected block type filter. Reset to view the complete immutable chain."
          actionLabel="Show all block types"
          onAction={() => setFilterType('all')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredChain.map((block) => {
          const isBroken =
            verification &&
            !verification.valid &&
            verification.firstInvalidIndex !== null &&
            !verification.smartRewriteDetected &&
            block.index >= verification.firstInvalidIndex;

          return (
            <div
              key={block.index}
              className={`p-4 rounded-lg bg-[#121212] border transition-colors flex flex-col gap-3 ${
                isBroken
                  ? 'border-critical/80 bg-critical/5'
                  : 'border-[#2e2e2e] hover:border-[#facc15]/50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${
                      isBroken
                        ? 'border-critical text-critical bg-critical/10'
                        : 'border-[#facc15] text-[#facc15] bg-[#1a1a1a]'
                    }`}
                  >
                    Block #{block.index}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1a1a1a] border border-[#2e2e2e] text-[#f5f5f0]">
                    {block.type}
                  </span>
                  <span className="text-xs text-[#b5b5ad] font-mono">
                    {new Date(block.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#b5b5ad] font-mono">
                  <span>Operator:</span>
                  <span className="text-[#f5f5f0]">{block.operator}</span>
                </div>
              </div>

              {/* Hash Links & Cryptographic Signature */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono pt-2 border-t border-[#2e2e2e]/60">
                <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis">
                  <LinkIcon className="w-3.5 h-3.5 text-[#b5b5ad] shrink-0" />
                  <span className="text-[#b5b5ad] shrink-0">Prev:</span>
                  <span className="text-[#8f8f86] truncate" title={block.prevHash}>
                    {block.prevHash}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis">
                  <Lock className={`w-3.5 h-3.5 shrink-0 ${isBroken ? 'text-critical' : 'text-[#facc15]'}`} />
                  <span className="text-[#b5b5ad] shrink-0">Hash:</span>
                  <span
                    className={`font-semibold truncate ${
                      isBroken ? 'text-critical' : 'text-[#facc15]'
                    }`}
                    title={block.hash}
                  >
                    {block.hash}
                  </span>
                </div>
              </div>

              {/* ECDSA P-256 Signature & Merkle Root */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono text-[#b5b5ad] pt-1">
                <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis">
                  <KeyRound className="w-3.5 h-3.5 text-[#facc15] shrink-0" />
                  <span className="shrink-0 text-[#8f8f86]">ECDSA Sig:</span>
                  <span className="truncate" title={block.signature || 'Unsigned'}>
                    {block.signature ? `${block.signature.slice(0, 24)}... (P-256)` : 'System Genesis'}
                  </span>
                </div>
                {block.manifest && (
                  <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis">
                    <FileCode2 className="w-3.5 h-3.5 text-[#facc15] shrink-0" />
                    <span className="shrink-0 text-[#8f8f86]">Merkle Root:</span>
                    <span className="truncate text-[#f5f5f0]" title={block.manifest.merkleRoot}>
                      {block.manifest.merkleRoot.slice(0, 24)}...
                    </span>
                  </div>
                )}
              </div>

              {/* Payload Preview */}
              <div className="p-2.5 rounded bg-[#0a0a0a] border border-[#2e2e2e] text-xs font-mono text-[#b5b5ad] overflow-x-auto">
                <div className="text-[10px] uppercase tracking-wider text-[#8f8f86] mb-1 font-sans font-semibold">
                  Block Payload (Canonical)
                </div>
                <pre className="text-[11px] text-[#f5f5f0]">
                  {JSON.stringify(block.payload, null, 2)}
                </pre>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
