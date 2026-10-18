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
    act: 'Indian Forest Act, 1927 / Forest (Conservation) Act, 1980',
    section: 'Section 26 (Acts prohibited in reserved forests) & Section 2 (Restriction on de-reservation)',
    penalty: 'Imprisonment up to 6 months and/or statutory compensation fine per hectare with mandatory land restoration order.',
    authority: 'State Forest Department / Ministry of Environment, Forest and Climate Change (MoEFCC)',
    disclaimer: 'Indicative mapping, verify with legal counsel',
  },
  'Unauthorized Construction': {
    class: 'Unauthorized Construction',
    act: 'Delhi Development Act, 1957 / Public Premises (Eviction of Unauthorised Occupants) Act, 1971',
    section: 'Section 30 (Demolition of building) & Section 31A (Power to seal unauthorized development)',
    penalty: 'Demolition notice within 5–15 days, summary eviction, and recovery of full demolition expenses as arrears of land revenue.',
    authority: 'Delhi Development Authority (DDA) / Municipal Corporation of Delhi (MCD)',
    disclaimer: 'Indicative mapping, verify with legal counsel',
  },
  'Mining': {
    class: 'Mining',
    act: 'Mines and Minerals (Development and Regulation) Act, 1957 / Environment (Protection) Act, 1986',
    section: 'Section 4(1) & Section 21 (Penalties for unauthorized mining operations)',
    penalty: 'Seizure of mineral and excavation machinery, imprisonment up to 5 years, and environmental damage compensation determined by NGT.',
    authority: 'Department of Mines and Geology / State Pollution Control Board (SPCB)',
    disclaimer: 'Indicative mapping, verify with legal counsel',
  },
  'Land Encroachment': {
    class: 'Land Encroachment',
    act: 'Public Premises (Eviction of Unauthorised Occupants) Act, 1971 / State Land Revenue Code',
    section: 'Section 4 & Section 5 (Notice to show cause and eviction of unauthorized occupants)',
    penalty: 'Eviction order, forfeiture of unapproved structures, and assessment of mesne profits/damages for illegal occupation period.',
    authority: 'Land and Development Office (L&DO) / District Revenue Collectorate',
    disclaimer: 'Indicative mapping, verify with legal counsel',
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
      disclaimer: 'Indicative mapping, verify with legal counsel',
    }
  );
}
