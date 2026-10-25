/**
 * policy.ts — Statutory Policy Framework & Legal Mappings.
 * Single source of truth for environmental and land governance statutes in Delhi NCR.
 */

import { LEGAL } from '../constants/legal';

export interface PolicyMapping {
  class: string;
  act: string;
  section: string;
  penalty: string;
  authority: string;
  disclaimer: string;
}

export const POLICY_MAPPINGS: Record<string, PolicyMapping> = {
  'Deforestation': {
    class: 'Deforestation',
    act: LEGAL.FOREST_ACT_TITLE,
    section: 'Section 26 (Acts prohibited in reserved forests) & Section 2 (Restriction on de-reservation of forests)',
    penalty: 'Imprisonment up to 6 months and/or statutory compensation fine per hectare with mandatory forest restoration order.',
    authority: 'Department of Forests & Wildlife, GNCTD / Ministry of Environment, Forest and Climate Change (MoEFCC)',
    disclaimer: LEGAL.STATUTORY_DISCLAIMER,
  },
  'Unauthorized Construction': {
    class: 'Unauthorized Construction',
    act: 'Delhi Development Act, 1957 / Public Premises (Eviction of Unauthorised Occupants) Act, 1971',
    section: LEGAL.DDA_ACT_SECTIONS,
    penalty: 'Demolition notice, sealing of unauthorized development, summary eviction, and recovery of full demolition expenses as arrears of land revenue.',
    authority: 'Delhi Development Authority (DDA) / Municipal Corporation of Delhi (MCD)',
    disclaimer: LEGAL.STATUTORY_DISCLAIMER,
  },
  'Mining': {
    class: 'Mining',
    act: 'Mines and Minerals (Development and Regulation) Act, 1957 / Environment (Protection) Act, 1986',
    section: 'Section 4(1) & Section 21 (Penalties for unauthorized mining operations and extraction)',
    penalty: 'Immediate seizure of mineral and excavation machinery, imprisonment up to 5 years, and environmental damage compensation determined by NGT.',
    authority: 'Department of Mines and Geology / State Pollution Control Board (SPCB)',
    disclaimer: LEGAL.STATUTORY_DISCLAIMER,
  },
  'Land Encroachment': {
    class: 'Land Encroachment',
    act: 'Public Premises (Eviction of Unauthorised Occupants) Act, 1971 / Delhi Land Revenue Act, 1954',
    section: 'Section 4 (Notice to show cause against order of eviction) & Section 5 (Eviction of unauthorized occupants)',
    penalty: 'Eviction order, forfeiture of unapproved structures, and assessment of mesne profits/damages for illegal occupation period.',
    authority: 'Land and Development Office (L&DO) / District Revenue Collectorate (GNCTD)',
    disclaimer: LEGAL.STATUTORY_DISCLAIMER,
  },
};

export function getPolicyForClass(encroachmentClass: string): PolicyMapping {
  return (
    POLICY_MAPPINGS[encroachmentClass] || {
      class: encroachmentClass,
      act: 'Public Premises (Eviction of Unauthorised Occupants) Act, 1971',
      section: 'Section 4 (Eviction Notice)',
      penalty: 'Eviction proceedings and recovery of damages.',
      authority: 'District Revenue Authority',
      disclaimer: LEGAL.STATUTORY_DISCLAIMER,
    }
  );
}
