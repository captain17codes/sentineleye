import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      category: 'Detection engine',
      question: 'How does the browser Web Worker generate and analyze satellite imagery?',
      answer: 'SentinelEye runs its core synthetic detection engine off the main thread inside a dedicated Web Worker. It simulates 256×256 multispectral Optical RGB, SAR radar speckle, and Fused tensors. It generates procedural terrain (fields, rivers, roads, buildings), executes bitemporal pixel-difference change detection against historical baselines, labels connected blobs, and intersects them with protected cadastral zone polygons.',
    },
    {
      category: 'False-alarm suppression',
      question: 'How does SentinelEye prevent false alarms caused by cloud cover or seasonal variations?',
      answer: 'The detection worker employs spectral ratio thresholds and multi-band validation. Optical bands are subject to cloud occlusions, but SAR radar penetrates clouds without distortion. If an optical difference lacks corresponding SAR backscatter change or occurs solely under a cloud mask, the engine suppresses the anomaly as a cloud shadow or seasonal vegetation drying artifact.',
    },
    {
      category: 'Land classification',
      question: 'What are the 4 encroachment classes recognized by the engine?',
      answer: 'The system categorizes validated detections into four human-readable classes: Deforestation (forest canopy loss and clear-cutting), Unauthorized Construction (rapid appearance of geometric masonry or industrial structures with high SAR double-bounce), Mining (unauthorized open-cast excavation pits and mineral gouging), and Land Encroachment (fencing, roads, and unauthorized perimeter expansion crossing protected cadastral boundaries).',
    },
    {
      category: 'Satellite Fleet & Resolution',
      question: 'What is the spatial resolution and revisit time of the Sentinel constellation?',
      answer: 'Sentinel-2 MSI provides 10-meter spatial resolution (visible/NIR bands) with a 5-day nominal revisit at the equator. Sentinel-1 SAR operates in C-band with the active constellation Sentinel-1C and Sentinel-1D providing a 6-day nominal revisit (Sentinel-1A retired 29 June 2026, Sentinel-1B failed in 2021). IW GRD products are distributed at ~10 m pixel spacing.',
    },
    {
      category: 'Cryptographic ledger',
      question: 'How does the SHA-256 hash ledger guarantee evidential integrity?',
      answer: 'Every formal case created from an alert generates a cryptographic block linked to the previous block hash: hash = SHA-256(prev_hash + data). Any retroactive tampering with coordinates, timestamps, or incident metadata invalidates the chain. The generated PDF embeds Section 63(4) BSA certificates with SHA-256 package hashes admissible in court under Section 63, Bharatiya Sakshya Adhiniyam, 2023 (formerly Section 65B, Indian Evidence Act, 1872).',
    },
    {
      category: 'Escalation protocol',
      question: 'What is the full lifecycle from orbital detection to legal notice?',
      answer: 'The lifecycle progresses through four verifiable states: New (automated satellite detection at T+00:00) → Verified (expert spectral & cadastral verification at T+00:15) → Notice Drafted — Pending Officer Signature (statutory draft notice PDF generated with SHA-256 evidence package hashes at T+04:00) → Signed & Served (manual execution by Competent Authority recorded on ledger).',
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-xl font-semibold text-text">Frequently asked questions</h1>
        <p className="text-xs text-muted mt-0.5">
          Sensor architecture, multi-spectral fusion, and cryptographic verification
        </p>
      </div>

      {/* Accordion FAQ List */}
      <div className="flex flex-col gap-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className={`rounded-lg bg-panel border transition-colors cursor-pointer select-none overflow-hidden ${
                isOpen ? 'border-border-light' : 'border-border hover:border-border-light'
              }`}
            >
              <div
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="p-4 flex items-center justify-between gap-4"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase text-muted">
                    {faq.category}
                  </span>
                  <h3 className="text-sm font-medium text-text">{faq.question}</h3>
                </div>

                <div className="text-muted">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 text-xs text-muted leading-relaxed border-t border-border bg-panel-light/40">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
