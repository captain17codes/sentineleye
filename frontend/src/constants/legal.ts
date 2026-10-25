/**
 * legal.ts — Legal & Statutory Citation Single Source of Truth.
 * Ref: Bharatiya Sakshya Adhiniyam (BSA), 2023 (effective 1 July 2024),
 * replacing the Indian Evidence Act, 1872.
 */

export const LEGAL = {
  // Primary evidentiary citation
  EVIDENCE_ACT_CITATION:
    'Section 63, Bharatiya Sakshya Adhiniyam, 2023 (formerly Section 65B, Indian Evidence Act, 1872)',
  EVIDENCE_ACT_SHORT:
    'Section 63 BSA, 2023 (formerly Sec. 65B IEA)',
  EVIDENCE_ACT_PART_A_TITLE:
    'PART A: CERTIFICATE UNDER SECTION 63(4) BHARATIYA SAKSHYA ADHINIYAM, 2023 (PARTY / CUSTODIAN)',
  EVIDENCE_ACT_PART_B_TITLE:
    'PART B: CERTIFICATE UNDER SECTION 63(4) BHARATIYA SAKSHYA ADHINIYAM, 2023 (TECHNICAL EXPERT)',

  // Notice status labels
  NOTICE_DRAFTED_LABEL:
    'Notice Drafted — Pending Officer Signature',
  SIGNED_AND_SERVED_LABEL:
    'Signed & Served',
  DRAFT_HEADER:
    'DRAFT NOTICE FOR SIGNATURE BY COMPETENT AUTHORITY',

  // Policy disclaimers
  STATUTORY_DISCLAIMER:
    'Statutory references are indicative, for demonstration; verify against the current bare Act before any real enforcement.',
  DELHI_SPECIAL_PROVISIONS_NOTE:
    'Special Legislation Notice: Enforcement in the NCT of Delhi may be subject to the National Capital Territory of Delhi Laws (Special Provisions) Act, 2009 (as extended from time to time), which can affect sealing and demolition proceedings; verify current moratorium and regularization status prior to coercive action.',

  // Satellite specifications
  SATELLITE_CONSTELLATION_INFO:
    'Sentinel-2: 5-day nominal revisit; Sentinel-1: 6-day (C+D). Resolution: ~10 m pixel spacing.',

  // Statutory acts
  FOREST_ACT_TITLE:
    'Indian Forest Act, 1927 / Forest (Conservation) Act, 1980 (now Van (Sanrakshan Evam Samvardhan) Adhiniyam, 1980)',
  DDA_ACT_SECTIONS:
    'Section 29 (Penalties), Section 30 (Order of demolition), Section 31 (Power to stop development) & Section 31A (Power to seal unauthorized development)',
} as const;
