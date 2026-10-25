import React from 'react';
import { POLICY_MAPPINGS } from '../utils/policy';
import { Scale, AlertCircle, FileCheck, Shield, BookOpen } from 'lucide-react';
import { LEGAL } from '../constants/legal';

export function Policy() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-xl font-semibold text-text">Legal framework & statutory policy</h1>
        <p className="text-xs text-muted mt-0.5">
          Statutory mapping for environmental land protection and chain-of-custody compliance under Bharatiya Sakshya Adhiniyam, 2023
        </p>
      </div>

      {/* Mandatory Statutory Disclaimer Banner */}
      <div className="p-4 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed space-y-1">
          <div>
            <strong className="font-semibold text-amber-300">Statutory disclaimer:</strong> {LEGAL.STATUTORY_DISCLAIMER}
          </div>
          <div className="text-[11px] text-amber-300/80">
            {LEGAL.DELHI_SPECIAL_PROVISIONS_NOTE}
          </div>
        </div>
      </div>

      {/* Class Statutory Mapping Grid */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">Indicative statutory mappings by class</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(POLICY_MAPPINGS).map(([className, policy]) => (
            <div key={className} className="p-5 rounded-lg bg-panel border border-border flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-semibold text-text">{policy.class}</span>
                <span className="text-[10px] font-mono text-muted">Statutory provision</span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-muted block text-[11px]">Primary Act:</span>
                  <span className="text-text font-medium">{policy.act}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Statutory Section:</span>
                  <span className="text-text font-medium">{policy.section}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Prescribed Penalty & Remedy:</span>
                  <span className="text-text leading-relaxed">{policy.penalty}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Responsible Enforcement Authority:</span>
                  <span className="text-accent font-medium">{policy.authority}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border text-[10px] font-mono text-muted italic">
                {policy.disclaimer}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Evidentiary Protocol & Section 63 BSA Compliance */}
      <div className="p-5 rounded-lg bg-panel border border-border flex flex-col gap-3">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Shield className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-text">
            {LEGAL.EVIDENCE_ACT_CITATION} compliance
          </h3>
        </div>

        <p className="text-xs text-muted leading-relaxed">
          Digital satellite records, multi-temporal difference tensors, spectral validation signatures, and operator verification notes are sequentially linked into a tamper-evident SHA-256 cryptographic hash ledger. Each generated legal notice PDF embeds the cryptographic block hash, raw scene fingerprints, and Section 63(4) Part A (Custodian) and Part B (Technical Expert) certificates, satisfying statutory requirements for electronic record admissibility and preservation of digital chain-of-custody in Indian courts.
        </p>

        {/* 4-Phase Escalation Stepper */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-md bg-panel-light border border-border flex flex-col gap-1">
            <span className="font-semibold text-accent font-mono text-[11px]">T+00:00 • Alert</span>
            <span className="text-text font-medium">Bitemporal change</span>
            <span className="text-[11px] text-muted">Sentinel-1/2 fused diff exceeds anomaly threshold.</span>
          </div>

          <div className="p-3 rounded-md bg-panel-light border border-border flex flex-col gap-1">
            <span className="font-semibold text-accent font-mono text-[11px]">T+00:15 • Verification</span>
            <span className="text-text font-medium">Operator review</span>
            <span className="text-[11px] text-muted">Analyst suppresses seasonal/cloud artifacts against cadastral boundary.</span>
          </div>

          <div className="p-3 rounded-md bg-panel-light border border-border flex flex-col gap-1">
            <span className="font-semibold text-accent font-mono text-[11px]">T+04:00 • Draft notice</span>
            <span className="text-text font-medium">Notice Drafted</span>
            <span className="text-[11px] text-muted">SHA-256 block committed; draft notice prepared for officer signature.</span>
          </div>

          <div className="p-3 rounded-md bg-panel-light border border-border flex flex-col gap-1">
            <span className="font-semibold text-accent font-mono text-[11px]">T+24:00 • Execution</span>
            <span className="text-text font-medium">Signed & Served</span>
            <span className="text-[11px] text-muted">Competent Authority executes order and records block on ledger.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
