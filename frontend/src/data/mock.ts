export type Severity = 'HIGH' | 'MEDIUM' | 'LOW'
export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL' | 'UNKNOWN'

export type Alert = {
  id: string
  tag: string
  message: string
  severity: Severity
  detectedAt: string
  evidence: string
}

export type DocumentMeta = {
  id: string
  filename: string
  docType: string
  chunks: number
  ingestedAt: string
}

export type ComplianceRow = {
  clauseId: string
  title: string
  status: ComplianceStatus
  confidence: number
  clauseQuote: string
  plantEvidence: string
  remediation: string
}

export type GraphNode = {
  id: string
  label: string
  type: 'Equipment' | 'Document' | 'Regulation' | 'Person' | 'Alert'
  score: number
  details: Record<string, string>
}

export type GraphEdge = {
  source: string
  target: string
  relationship: string
}

export type BenchmarkResult = {
  question: string
  expected: string
  answer: string
  correct: boolean
  latencyS: number
}

export const alerts: Alert[] = [
  {
    id: 'alert-p204b',
    tag: 'P-204B',
    severity: 'HIGH',
    message: 'Seal failure recurrence detected across July 2023 and January 2022 work orders.',
    detectedAt: '2026-07-07T18:20:00Z',
    evidence: 'Incident-2023-07-15-P204B-Seal-Failure.pdf and work-orders-2022-2024.csv both mention high vibration before seal failure.'
  },
  {
    id: 'alert-v301',
    tag: 'V-301',
    severity: 'MEDIUM',
    message: 'Pressure vessel wall thickness trend is approaching the inspection threshold.',
    detectedAt: '2026-07-07T18:18:00Z',
    evidence: 'Pressure-Vessel-V301-PV-Report-2023.pdf shows declining readings across two survey points.'
  },
  {
    id: 'alert-he101',
    tag: 'HE-101',
    severity: 'LOW',
    message: 'Tube leak history suggests gasket kit should be pre-positioned before shutdown.',
    detectedAt: '2026-07-07T18:12:00Z',
    evidence: 'Alfa-Laval-HE101-Manual.pdf and NDT-Report-HE101-2024.pdf share tube bundle references.'
  }
]

export const documents: DocumentMeta[] = [
  { id: 'pid-cdu', filename: 'PID-CDU-001.pdf', docType: 'P&ID', chunks: 42, ingestedAt: '2026-07-07' },
  { id: 'pid-vdu', filename: 'PID-VDU-002.pdf', docType: 'P&ID', chunks: 37, ingestedAt: '2026-07-07' },
  { id: 'pid-fcu', filename: 'PID-FCU-003.pdf', docType: 'P&ID', chunks: 39, ingestedAt: '2026-07-07' },
  { id: 'oisd-116', filename: 'OISD-116-Fired-Heater-Procedure.pdf', docType: 'Safety Procedure', chunks: 28, ingestedAt: '2026-07-07' },
  { id: 'oisd-117', filename: 'OISD-117-LPG-Handling.pdf', docType: 'Safety Procedure', chunks: 26, ingestedAt: '2026-07-07' },
  { id: 'peso-tank', filename: 'PESO-Tank-Inspection-SOP.pdf', docType: 'Regulatory', chunks: 24, ingestedAt: '2026-07-07' },
  { id: 'erp', filename: 'Emergency-Response-Plan.pdf', docType: 'Safety Procedure', chunks: 31, ingestedAt: '2026-07-07' },
  { id: 'wo', filename: 'work-orders-2022-2024.csv', docType: 'Work Orders', chunks: 60, ingestedAt: '2026-07-07' },
  { id: 'ndt-he101', filename: 'NDT-Report-HE101-2024.pdf', docType: 'Inspection Report', chunks: 21, ingestedAt: '2026-07-07' },
  { id: 'tank-t201', filename: 'Tank-T201-Annual-Inspection-2023.pdf', docType: 'Inspection Report', chunks: 20, ingestedAt: '2026-07-07' },
  { id: 'pump-vibration', filename: 'Pump-P204-Vibration-Analysis-2024.pdf', docType: 'Inspection Report', chunks: 23, ingestedAt: '2026-07-07' },
  { id: 'v301-pv', filename: 'Pressure-Vessel-V301-PV-Report-2023.pdf', docType: 'Inspection Report', chunks: 22, ingestedAt: '2026-07-07' },
  { id: 'pump-manual', filename: 'Flowserve-Pump-P204-Manual.pdf', docType: 'OEM Manual', chunks: 31, ingestedAt: '2026-07-07' },
  { id: 'alfa-he101', filename: 'Alfa-Laval-HE101-Manual.pdf', docType: 'OEM Manual', chunks: 30, ingestedAt: '2026-07-07' },
  { id: 'compressor-k101', filename: 'Compressor-K101-Manual.pdf', docType: 'OEM Manual', chunks: 27, ingestedAt: '2026-07-07' },
  { id: 'incident-p204', filename: 'Incident-2023-07-15-P204B-Seal-Failure.pdf', docType: 'Incident Report', chunks: 17, ingestedAt: '2026-07-07' },
  { id: 'incident-he101', filename: 'Incident-2022-11-03-HE101-Tube-Leak.pdf', docType: 'Incident Report', chunks: 16, ingestedAt: '2026-07-07' },
  { id: 'incident-v301', filename: 'Incident-2024-02-28-V301-Safety-Valve-Lift.pdf', docType: 'Incident Report', chunks: 18, ingestedAt: '2026-07-07' },
  { id: 'peso-license', filename: 'PESO-License-Renewal-2024.pdf', docType: 'Regulatory', chunks: 19, ingestedAt: '2026-07-07' },
  { id: 'factory-return', filename: 'Factory-Act-Annual-Return-2023.pdf', docType: 'Regulatory', chunks: 18, ingestedAt: '2026-07-07' }
]

export const complianceRows: ComplianceRow[] = [
  {
    clauseId: 'OISD-116-4.1',
    title: 'Fired Heater - Fuel System',
    status: 'COMPLIANT',
    confidence: 0.94,
    clauseQuote: 'Auto fuel cutoff shall activate on loss of flame or high temperature.',
    plantEvidence: 'OISD-116-Fired-Heater-Procedure.pdf confirms flame scanner interlock testing every shift.',
    remediation: 'Continue weekly proof testing and attach signed interlock sheets to the heater record.'
  },
  {
    clauseId: 'OISD-116-4.2',
    title: 'Fired Heater - Shutdown',
    status: 'NON_COMPLIANT',
    confidence: 0.91,
    clauseQuote: 'Automatic shutdown is required when combustible gas exceeds 25% LEL.',
    plantEvidence: 'Emergency-Response-Plan.pdf mentions manual evacuation but no automatic heater trip path.',
    remediation: 'Wire gas detector high-high output to the heater trip relay and update cause-effect diagrams.'
  },
  {
    clauseId: 'PESO-PV-8',
    title: 'Pressure Vessel - Safety Valve',
    status: 'PARTIAL',
    confidence: 0.82,
    clauseQuote: 'Safety valves shall be tested annually and records shall be retained.',
    plantEvidence: 'V-301 report has calibration evidence for 2023 but no 2024 certificate.',
    remediation: 'Upload the 2024 PSV test certificate or schedule an immediate bench test.'
  },
  {
    clauseId: 'PESO-Tank-15',
    title: 'Tank Inspection - Records',
    status: 'COMPLIANT',
    confidence: 0.88,
    clauseQuote: 'Inspection records shall be retained for a minimum of ten years.',
    plantEvidence: 'PESO-Tank-Inspection-SOP.pdf maps document retention to DMS class REG-TANK.',
    remediation: 'No action required.'
  },
  {
    clauseId: 'Factory-Act-13',
    title: 'Accident Reporting',
    status: 'UNKNOWN',
    confidence: 0.44,
    clauseQuote: 'Major accidents shall be reported to the Inspector within 24 hours.',
    plantEvidence: 'Incident records include internal notifications but no inspector acknowledgement receipt.',
    remediation: 'Attach statutory acknowledgement receipts to each major incident package.'
  },
  {
    clauseId: 'OISD-116-5.1',
    title: 'Fired Heater - Inspection',
    status: 'COMPLIANT',
    confidence: 0.88,
    clauseQuote: 'Annual external inspection plus 5-year internal inspection.',
    plantEvidence: 'Inspection schedule references annual external checks and next internal due date.',
    remediation: 'No action required.'
  },
  {
    clauseId: 'OISD-117-3.1',
    title: 'LPG Handling - Storage',
    status: 'PARTIAL',
    confidence: 0.77,
    clauseQuote: 'LPG vessels shall be at least 30m from process equipment.',
    plantEvidence: 'Plot plan confirms distance for T-201 but not temporary cylinder staging.',
    remediation: 'Add field-verified distance evidence for temporary staging.'
  },
  {
    clauseId: 'OISD-117-4.2',
    title: 'LPG Handling - Transfer',
    status: 'NON_COMPLIANT',
    confidence: 0.89,
    clauseQuote: 'Deadman valve required during LPG transfer.',
    plantEvidence: 'Transfer SOP includes manual isolation but no deadman valve reference.',
    remediation: 'Install or document deadman valve controls in LPG transfer SOP.'
  },
  {
    clauseId: 'OISD-118-6.1',
    title: 'Tank Farm - Bunding',
    status: 'COMPLIANT',
    confidence: 0.86,
    clauseQuote: 'Bund capacity at least 110% of largest tank.',
    plantEvidence: 'Tank inspection record calculates bund volume at 114% of T-201 capacity.',
    remediation: 'No action required.'
  },
  {
    clauseId: 'OISD-118-6.3',
    title: 'Tank Farm - Vents',
    status: 'PARTIAL',
    confidence: 0.73,
    clauseQuote: 'Vents shall be fitted with flame arrestors.',
    plantEvidence: 'T-201 vent has flame arrestor tag; T-204 evidence is missing.',
    remediation: 'Upload vent flame arrestor inspection record for T-204.'
  },
  {
    clauseId: 'OISD-149-3.1',
    title: 'Static Electricity - Bonding',
    status: 'COMPLIANT',
    confidence: 0.83,
    clauseQuote: 'All transfer lines earthed and bonded before transfer.',
    plantEvidence: 'Static bonding checklist exists for LPG bay and tank truck loading.',
    remediation: 'No action required.'
  },
  {
    clauseId: 'PESO-Tank-12',
    title: 'Tank Inspection - Frequency',
    status: 'COMPLIANT',
    confidence: 0.9,
    clauseQuote: 'Above-ground tanks inspection every 5 years.',
    plantEvidence: 'PESO SOP lists last T-201 inspection in 2023 and next due in 2028.',
    remediation: 'No action required.'
  },
  {
    clauseId: 'PESO-Tank-22',
    title: 'Tank Repair - Permits',
    status: 'PARTIAL',
    confidence: 0.72,
    clauseQuote: 'Hot work permit required for any tank repair.',
    plantEvidence: 'Hot work permit template exists but is not linked to the 2023 T-201 shell repair package.',
    remediation: 'Attach permit number and closeout copy to the T-201 repair record.'
  },
  {
    clauseId: 'PESO-PV-11',
    title: 'Pressure Vessel - NDT',
    status: 'COMPLIANT',
    confidence: 0.87,
    clauseQuote: 'NDT every 2 years for high-temperature vessels.',
    plantEvidence: 'V-301 NDT record completed in 2023 with next due in 2025.',
    remediation: 'No action required.'
  },
  {
    clauseId: 'PESO-PV-14',
    title: 'Pressure Vessel - Registration',
    status: 'UNKNOWN',
    confidence: 0.48,
    clauseQuote: 'All pressure vessels registered with PESO.',
    plantEvidence: 'PESO renewal package lists V-301 but omits registration certificate attachment.',
    remediation: 'Upload registration certificate or add certificate number to renewal package.'
  },
  {
    clauseId: 'Factory-Act-7',
    title: 'Working Environment - Ventilation',
    status: 'COMPLIANT',
    confidence: 0.8,
    clauseQuote: 'Adequate ventilation in confined process areas.',
    plantEvidence: 'Annual return references ventilation audit for compressor house and process shelters.',
    remediation: 'No action required.'
  },
  {
    clauseId: 'Factory-Act-11',
    title: 'Safety Officer',
    status: 'COMPLIANT',
    confidence: 0.92,
    clauseQuote: 'Designated safety officer mandatory above 1000 workers.',
    plantEvidence: 'Factory Act annual return names designated safety officer and deputy.',
    remediation: 'No action required.'
  },
  {
    clauseId: 'Factory-Act-45',
    title: 'First Aid',
    status: 'COMPLIANT',
    confidence: 0.85,
    clauseQuote: 'First aid boxes for every 150 workers.',
    plantEvidence: 'Annual return lists 18 first-aid boxes for 2,300 workers.',
    remediation: 'No action required.'
  }
]

export const graphNodes: GraphNode[] = [
  { id: 'P-204B', label: 'P-204B Pump', type: 'Equipment', score: 8, details: { unit: 'CDU', health: 'Watchlist', failures: '2 seal failures' } },
  { id: 'HE-101', label: 'HE-101 Exchanger', type: 'Equipment', score: 7, details: { unit: 'CDU', health: 'Stable', failures: '2 tube leaks' } },
  { id: 'V-301', label: 'V-301 Vessel', type: 'Equipment', score: 6, details: { unit: 'VDU', health: 'Inspection due', pressure: '18 bar' } },
  { id: 'OISD-116-4.2', label: 'OISD-116 4.2', type: 'Regulation', score: 5, details: { status: 'Non compliant', owner: 'Process Safety' } },
  { id: 'Incident-P204', label: 'P-204B Incident', type: 'Document', score: 4, details: { file: 'Incident-2023-07-15-P204B-Seal-Failure.pdf' } },
  { id: 'Alert-P204B', label: 'Seal Recurrence Alert', type: 'Alert', score: 3, details: { severity: 'HIGH', evidence: '2 recurring incidents' } },
  { id: 'Rao', label: 'A. Rao', type: 'Person', score: 2, details: { role: 'Maintenance expert', tenure: '31 years' } }
]

export const graphEdges: GraphEdge[] = [
  { source: 'P-204B', target: 'Incident-P204', relationship: 'MENTIONED_IN' },
  { source: 'P-204B', target: 'Alert-P204B', relationship: 'TRIGGERS' },
  { source: 'P-204B', target: 'Rao', relationship: 'MAINTAINED_BY' },
  { source: 'HE-101', target: 'Incident-P204', relationship: 'SAME_UNIT' },
  { source: 'V-301', target: 'OISD-116-4.2', relationship: 'GOVERNED_BY' },
  { source: 'OISD-116-4.2', target: 'Alert-P204B', relationship: 'GAP_RELATED' }
]

export const benchmarkResults: BenchmarkResult[] = [
  {
    question: 'What caused the P-204B seal failure?',
    expected: 'Seal failure caused by elevated vibration and delayed bearing replacement.',
    answer: 'The strongest evidence points to elevated vibration after bearing wear, followed by seal face damage.',
    correct: true,
    latencyS: 4.8
  },
  {
    question: 'What does OISD-116 4.2 require?',
    expected: 'Auto shutdown when gas detection exceeds 25% LEL.',
    answer: 'OISD-116 4.2 requires automatic heater shutdown at combustible gas levels above 25% LEL.',
    correct: true,
    latencyS: 3.9
  },
  {
    question: 'Which vessel needs follow-up inspection?',
    expected: 'V-301.',
    answer: 'V-301 needs follow-up because wall thickness is trending toward the minimum allowable threshold.',
    correct: true,
    latencyS: 4.2
  },
  {
    question: 'Which document backs the HE-101 tube leak pattern?',
    expected: 'NDT report and incident report.',
    answer: 'The NDT report and November 2022 incident report support the HE-101 tube leak pattern.',
    correct: true,
    latencyS: 5.1
  },
  {
    question: 'Which equipment has repeated seal failures?',
    expected: 'P-204B.',
    answer: 'P-204B appears in January 2022 and July 2023 seal-failure records.',
    correct: true,
    latencyS: 3.7
  },
  {
    question: 'What is the KG completeness score?',
    expected: '87.7%.',
    answer: 'The demo graph reports 87.7% completeness across 73 equipment and document relationships.',
    correct: true,
    latencyS: 2.9
  },
  {
    question: 'Which tank bunding clause is satisfied?',
    expected: 'OISD-118-6.1.',
    answer: 'OISD-118-6.1 is compliant because T-201 bund capacity is calculated at 114%.',
    correct: true,
    latencyS: 3.4
  },
  {
    question: 'What is missing for V-301 safety valve compliance?',
    expected: '2024 certificate.',
    answer: 'The 2024 PSV certificate is missing or must be attached.',
    correct: true,
    latencyS: 4
  },
  {
    question: 'Which clause requires deadman valve controls?',
    expected: 'OISD-117-4.2.',
    answer: 'OISD-117-4.2 requires deadman valve controls during LPG transfer.',
    correct: true,
    latencyS: 3.6
  },
  {
    question: 'Which expert is linked to P-204B?',
    expected: 'A. Rao.',
    answer: 'A. Rao is linked as the maintenance expert for P-204B.',
    correct: true,
    latencyS: 2.8
  },
  {
    question: 'Which compressor manual is in the corpus?',
    expected: 'Compressor-K101-Manual.pdf.',
    answer: 'The K-101 compressor manual is part of the OEM manual corpus.',
    correct: true,
    latencyS: 3.1
  },
  {
    question: 'Which documents cite P-204B?',
    expected: 'Incident report, work orders, vibration analysis, OEM manual.',
    answer: 'P-204B is cited in incident, work order, vibration, and Flowserve OEM manual records.',
    correct: true,
    latencyS: 4.7
  },
  {
    question: 'What records prove tank inspection frequency?',
    expected: 'PESO tank SOP and T-201 annual inspection.',
    answer: 'The PESO SOP and T-201 annual inspection prove tank inspection frequency.',
    correct: true,
    latencyS: 3.5
  },
  {
    question: 'Which compliance rows are unknown?',
    expected: 'PESO-PV-14 and Factory-Act-13.',
    answer: 'PESO-PV-14 and Factory-Act-13 are unknown due to missing statutory attachments.',
    correct: true,
    latencyS: 4.5
  },
  {
    question: 'What should the next action be for P-204B?',
    expected: 'Inspect bearings, verify alignment, pre-stage seal kit.',
    answer: 'Inspect bearings, verify alignment, and pre-stage the Flowserve seal kit.',
    correct: true,
    latencyS: 4.1
  },
  {
    question: 'What is the current discharge temperature of P-204B?',
    expected: 'Insufficient evidence in the corpus.',
    answer: 'Insufficient evidence: the corpus has no current operating temperature.',
    correct: true,
    latencyS: 1.2
  },
  {
    question: 'Who approved the missing 2024 V-301 PSV certificate?',
    expected: 'Insufficient evidence in the corpus.',
    answer: 'Insufficient evidence: the 2024 certificate and approver record are missing.',
    correct: true,
    latencyS: 1.1
  },
  {
    question: 'What is the exact remaining useful life of HE-101?',
    expected: 'Insufficient evidence in the corpus.',
    answer: 'Insufficient evidence: an exact remaining-life calculation is not present.',
    correct: true,
    latencyS: 1.3
  },
  {
    question: 'Did a January 2025 repair eliminate P-204B vibration?',
    expected: 'Insufficient evidence in the corpus.',
    answer: 'Insufficient evidence: no January 2025 post-repair record is available.',
    correct: true,
    latencyS: 1.2
  },
  {
    question: 'Which operator caused the P-204B failure?',
    expected: 'Insufficient evidence in the corpus.',
    answer: 'Insufficient evidence: the records do not attribute the failure to an operator.',
    correct: true,
    latencyS: 1
  }
]

export const scaleData = [
  { corpus: '20 docs', latency: 6.2, accuracy: 87 },
  { corpus: '500 docs', latency: 6.4, accuracy: 86 },
  { corpus: '1,000 docs', latency: 6.8, accuracy: 85 }
]

export const answerTemplates: Record<string, string> = {
  p204: 'P-204B seal failure was most likely caused by elevated vibration after bearing wear. The incident report describes rising vibration before the July 2023 seal damage, and the work-order history shows a similar seal-failure pattern in January 2022. Recommended action: inspect bearings, verify alignment, and pre-stage the Flowserve seal kit.',
  oisd: 'OISD-116 clause 4.2 requires automatic shutdown when combustible gas detection exceeds 25% LEL. Brian AI found a gap: the emergency response document describes manual evacuation but does not prove an automatic heater trip path.',
  v301: 'V-301 needs follow-up. The pressure vessel report shows declining wall thickness and incomplete 2024 safety-valve certificate evidence. Brian AI recommends uploading the certificate or scheduling an immediate bench test.',
  default: 'Brian AI found matching evidence across the refinery document set. The highest-confidence sources are the P&ID package, the inspection report, and the relevant safety procedure. The answer should be reviewed by operations before work execution.'
}
