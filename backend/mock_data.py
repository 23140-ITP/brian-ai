from __future__ import annotations

from datetime import datetime


DOCUMENTS = [
    {"id": "pid-cdu-001", "filename": "PID-CDU-001.pdf", "docType": "P&ID", "chunks": 42, "ingestedAt": "2026-07-07"},
    {"id": "pid-vdu-002", "filename": "PID-VDU-002.pdf", "docType": "P&ID", "chunks": 37, "ingestedAt": "2026-07-07"},
    {"id": "pid-fcu-003", "filename": "PID-FCU-003.pdf", "docType": "P&ID", "chunks": 39, "ingestedAt": "2026-07-07"},
    {"id": "oisd-116-fired-heater", "filename": "OISD-116-Fired-Heater-Procedure.pdf", "docType": "Safety Procedure", "chunks": 28, "ingestedAt": "2026-07-07"},
    {"id": "oisd-117-lpg", "filename": "OISD-117-LPG-Handling.pdf", "docType": "Safety Procedure", "chunks": 26, "ingestedAt": "2026-07-07"},
    {"id": "peso-tank-sop", "filename": "PESO-Tank-Inspection-SOP.pdf", "docType": "Safety Procedure", "chunks": 24, "ingestedAt": "2026-07-07"},
    {"id": "emergency-response", "filename": "Emergency-Response-Plan.pdf", "docType": "Safety Procedure", "chunks": 31, "ingestedAt": "2026-07-07"},
    {"id": "work-orders", "filename": "work-orders-2022-2024.csv", "docType": "Work Orders", "chunks": 60, "ingestedAt": "2026-07-07"},
    {"id": "ndt-he101", "filename": "NDT-Report-HE101-2024.pdf", "docType": "Inspection Report", "chunks": 21, "ingestedAt": "2026-07-07"},
    {"id": "tank-t201", "filename": "Tank-T201-Annual-Inspection-2023.pdf", "docType": "Inspection Report", "chunks": 20, "ingestedAt": "2026-07-07"},
    {"id": "pump-p204-vibration", "filename": "Pump-P204-Vibration-Analysis-2024.pdf", "docType": "Inspection Report", "chunks": 23, "ingestedAt": "2026-07-07"},
    {"id": "v301-pv-report", "filename": "Pressure-Vessel-V301-PV-Report-2023.pdf", "docType": "Inspection Report", "chunks": 22, "ingestedAt": "2026-07-07"},
    {"id": "flowserve-p204", "filename": "Flowserve-Pump-P204-Manual.pdf", "docType": "OEM Manual", "chunks": 31, "ingestedAt": "2026-07-07"},
    {"id": "alfa-he101", "filename": "Alfa-Laval-HE101-Manual.pdf", "docType": "OEM Manual", "chunks": 30, "ingestedAt": "2026-07-07"},
    {"id": "compressor-k101", "filename": "Compressor-K101-Manual.pdf", "docType": "OEM Manual", "chunks": 27, "ingestedAt": "2026-07-07"},
    {"id": "incident-p204b", "filename": "Incident-2023-07-15-P204B-Seal-Failure.pdf", "docType": "Incident Report", "chunks": 17, "ingestedAt": "2026-07-07"},
    {"id": "incident-he101", "filename": "Incident-2022-11-03-HE101-Tube-Leak.pdf", "docType": "Incident Report", "chunks": 16, "ingestedAt": "2026-07-07"},
    {"id": "incident-v301", "filename": "Incident-2024-02-28-V301-Safety-Valve-Lift.pdf", "docType": "Incident Report", "chunks": 18, "ingestedAt": "2026-07-07"},
    {"id": "peso-license", "filename": "PESO-License-Renewal-2024.pdf", "docType": "Regulatory", "chunks": 19, "ingestedAt": "2026-07-07"},
    {"id": "factory-return", "filename": "Factory-Act-Annual-Return-2023.pdf", "docType": "Regulatory", "chunks": 18, "ingestedAt": "2026-07-07"},
]

ALERTS = [
    {
        "id": "alert-p204b",
        "tag": "P-204B",
        "severity": "HIGH",
        "message": "Seal failure recurrence detected across July 2023 and January 2022 work orders.",
        "detectedAt": "2026-07-07T18:20:00Z",
        "evidence": "Incident-2023-07-15-P204B-Seal-Failure.pdf and work-orders-2022-2024.csv both mention high vibration before seal failure.",
    },
    {
        "id": "alert-v301",
        "tag": "V-301",
        "severity": "MEDIUM",
        "message": "Pressure vessel wall thickness trend is approaching the inspection threshold.",
        "detectedAt": "2026-07-07T18:18:00Z",
        "evidence": "Pressure-Vessel-V301-PV-Report-2023.pdf shows declining readings across two survey points.",
    },
    {
        "id": "alert-he101",
        "tag": "HE-101",
        "severity": "LOW",
        "message": "Tube leak history suggests gasket kit should be pre-positioned before shutdown.",
        "detectedAt": "2026-07-07T18:12:00Z",
        "evidence": "Alfa-Laval-HE101-Manual.pdf and NDT-Report-HE101-2024.pdf share tube bundle references.",
    },
]

COMPLIANCE = [
    ("OISD-116-4.1", "Fired Heater - Fuel System", "COMPLIANT", 0.94, "Auto fuel cutoff on loss of flame or high temp", "Heater package confirms flame scanner interlock and high-temperature trip proof testing.", "Continue weekly proof testing and attach signed interlock sheets."),
    ("OISD-116-4.2", "Fired Heater - Shutdown", "NON_COMPLIANT", 0.91, "Auto shutdown on gas detection >25% LEL", "Emergency response plan describes manual evacuation but does not prove an automatic heater trip path.", "Wire gas detector high-high output to heater trip relay and update cause-effect diagrams."),
    ("OISD-116-5.1", "Fired Heater - Inspection", "COMPLIANT", 0.88, "Annual external inspection plus 5-year internal inspection", "Inspection schedule references annual external checks and next internal due date.", "No action required."),
    ("OISD-117-3.1", "LPG Handling - Storage", "PARTIAL", 0.77, "LPG vessels at least 30m from process equipment", "Plot plan confirms distance for T-201 but not for temporary cylinder staging area.", "Add field-verified distance evidence for temporary staging."),
    ("OISD-117-4.2", "LPG Handling - Transfer", "NON_COMPLIANT", 0.89, "Deadman valve required during LPG transfer", "Transfer SOP includes manual isolation but no deadman valve reference.", "Install or document deadman valve controls in LPG transfer SOP."),
    ("OISD-118-6.1", "Tank Farm - Bunding", "COMPLIANT", 0.86, "Bund capacity at least 110% of largest tank", "Tank inspection record calculates bund volume at 114% of T-201 capacity.", "No action required."),
    ("OISD-118-6.3", "Tank Farm - Vents", "PARTIAL", 0.73, "Vents shall be fitted with flame arrestors", "T-201 vent has flame arrestor tag; T-204 evidence is missing.", "Upload vent flame arrestor inspection record for T-204."),
    ("OISD-149-3.1", "Static Electricity - Bonding", "COMPLIANT", 0.83, "All transfer lines earthed and bonded before transfer", "Static bonding checklist exists for LPG bay and tank truck loading.", "No action required."),
    ("PESO-Tank-12", "Tank Inspection - Frequency", "COMPLIANT", 0.90, "Above-ground tanks inspection every 5 years", "PESO tank inspection SOP lists last T-201 inspection in 2023 and next due in 2028.", "No action required."),
    ("PESO-Tank-15", "Tank Inspection - Records", "COMPLIANT", 0.88, "Inspection records retained for minimum 10 years", "Document retention matrix maps tank records to REG-TANK retention class.", "No action required."),
    ("PESO-Tank-22", "Tank Repair - Permits", "PARTIAL", 0.72, "Hot work permit required for any tank repair", "Hot work permit template exists but is not linked to the 2023 T-201 shell repair package.", "Attach permit number and closeout copy to the T-201 repair record."),
    ("PESO-PV-8", "Pressure Vessel - Safety Valve", "PARTIAL", 0.82, "Safety valves tested annually, records maintained", "V-301 report has 2023 calibration evidence but no 2024 certificate.", "Upload 2024 PSV certificate or schedule an immediate bench test."),
    ("PESO-PV-11", "Pressure Vessel - NDT", "COMPLIANT", 0.87, "NDT every 2 years for high-temperature vessels", "V-301 NDT record completed in 2023 with next due in 2025.", "No action required."),
    ("PESO-PV-14", "Pressure Vessel - Registration", "UNKNOWN", 0.48, "All pressure vessels registered with PESO", "PESO renewal package lists V-301 but omits registration certificate attachment.", "Upload registration certificate or add certificate number to renewal package."),
    ("Factory-Act-7", "Working Environment - Ventilation", "COMPLIANT", 0.80, "Adequate ventilation in confined process areas", "Annual return references ventilation audit for compressor house and process shelters.", "No action required."),
    ("Factory-Act-11", "Safety Officer", "COMPLIANT", 0.92, "Designated safety officer mandatory above 1000 workers", "Factory Act annual return names designated safety officer and deputy.", "No action required."),
    ("Factory-Act-13", "Accident Reporting", "UNKNOWN", 0.44, "Major accidents reported to Inspector within 24h", "Incident records include internal notifications but no inspector acknowledgement receipt.", "Attach statutory acknowledgement receipts to each major incident package."),
    ("Factory-Act-45", "First Aid", "COMPLIANT", 0.85, "First aid boxes for every 150 workers", "Annual return lists 18 first-aid boxes for 2,300 workers across process units.", "No action required."),
]

COMPLIANCE_RESULTS = [
    {
        "clauseId": clause_id,
        "title": title,
        "status": status,
        "confidence": confidence,
        "clauseQuote": requirement,
        "plantEvidence": evidence,
        "remediation": remediation,
    }
    for clause_id, title, status, confidence, requirement, evidence, remediation in COMPLIANCE
]

GRAPH_NODES = [
    {"id": "P-204B", "label": "P-204B Pump", "type": "Equipment", "score": 8, "details": {"unit": "CDU", "health": "Watchlist", "failures": "2 seal failures"}},
    {"id": "HE-101", "label": "HE-101 Exchanger", "type": "Equipment", "score": 7, "details": {"unit": "CDU", "health": "Stable", "failures": "2 tube leaks"}},
    {"id": "V-301", "label": "V-301 Vessel", "type": "Equipment", "score": 6, "details": {"unit": "VDU", "health": "Inspection due", "pressure": "18 bar"}},
    {"id": "K-101", "label": "K-101 Compressor", "type": "Equipment", "score": 5, "details": {"unit": "FCU", "health": "Normal"}},
    {"id": "T-201", "label": "T-201 Tank", "type": "Equipment", "score": 5, "details": {"unit": "Tank Farm", "health": "Compliant"}},
    {"id": "OISD-116-4.2", "label": "OISD-116 4.2", "type": "Regulation", "score": 5, "details": {"status": "Non compliant", "owner": "Process Safety"}},
    {"id": "PESO-PV-8", "label": "PESO PV 8", "type": "Regulation", "score": 4, "details": {"status": "Partial", "owner": "Inspection"}},
    {"id": "Incident-P204", "label": "P-204B Incident", "type": "Document", "score": 4, "details": {"file": "Incident-2023-07-15-P204B-Seal-Failure.pdf"}},
    {"id": "Alert-P204B", "label": "Seal Recurrence Alert", "type": "Alert", "score": 3, "details": {"severity": "HIGH", "evidence": "2 recurring incidents"}},
    {"id": "A-Rao", "label": "A. Rao", "type": "Person", "score": 2, "details": {"role": "Maintenance expert", "tenure": "31 years"}},
]

GRAPH_EDGES = [
    {"source": "P-204B", "target": "Incident-P204", "relationship": "MENTIONED_IN"},
    {"source": "P-204B", "target": "Alert-P204B", "relationship": "TRIGGERS"},
    {"source": "P-204B", "target": "A-Rao", "relationship": "MAINTAINED_BY"},
    {"source": "P-204B", "target": "OISD-116-4.2", "relationship": "GOVERNED_BY"},
    {"source": "V-301", "target": "PESO-PV-8", "relationship": "GOVERNED_BY"},
    {"source": "HE-101", "target": "Incident-P204", "relationship": "SAME_UNIT"},
    {"source": "K-101", "target": "P-204B", "relationship": "PROCESS_LINK"},
    {"source": "T-201", "target": "OISD-116-4.2", "relationship": "NEARBY_RISK"},
    {"source": "OISD-116-4.2", "target": "Alert-P204B", "relationship": "GAP_RELATED"},
]

BENCHMARK = [
    ("What caused the P-204B seal failure?", "Elevated vibration and delayed bearing replacement.", "Elevated vibration after bearing wear damaged the seal faces.", True, 4.8),
    ("What does OISD-116 4.2 require?", "Auto shutdown above 25% LEL.", "Automatic heater shutdown when gas detection exceeds 25% LEL.", True, 3.9),
    ("Which vessel needs follow-up inspection?", "V-301.", "V-301 needs follow-up because PSV evidence is incomplete and wall thickness is trending down.", True, 4.2),
    ("Which document backs the HE-101 tube leak pattern?", "NDT report and incident report.", "The NDT report and November 2022 incident report support the HE-101 tube leak pattern.", True, 5.1),
    ("Which equipment has repeated seal failures?", "P-204B.", "P-204B appears in January 2022 and July 2023 seal-failure records.", True, 3.7),
    ("What is the KG completeness score?", "87.7%.", "The demo graph reports 87.7% completeness across 73 equipment and document relationships.", True, 2.9),
    ("Which tank bunding clause is satisfied?", "OISD-118-6.1.", "OISD-118-6.1 is compliant because T-201 bund capacity is calculated at 114%.", True, 3.4),
    ("What is missing for V-301 safety valve compliance?", "2024 certificate.", "The 2024 PSV certificate is missing or must be attached.", True, 4.0),
    ("Which clause requires deadman valve controls?", "OISD-117-4.2.", "OISD-117-4.2 requires deadman valve controls during LPG transfer.", True, 3.6),
    ("Which expert is linked to P-204B?", "A. Rao.", "A. Rao is linked as the maintenance expert for P-204B.", True, 2.8),
    ("Which compressor manual is in the corpus?", "Compressor-K101-Manual.pdf.", "The K-101 compressor manual is part of the OEM manual corpus.", True, 3.1),
    ("Which documents cite P-204B?", "Incident report, work orders, vibration analysis, OEM manual.", "P-204B is cited in incident, work order, vibration, and Flowserve OEM manual records.", True, 4.7),
    ("What records prove tank inspection frequency?", "PESO tank SOP and T-201 annual inspection.", "The PESO SOP and T-201 annual inspection prove tank inspection frequency.", True, 3.5),
    ("Which compliance rows are unknown?", "PESO-PV-14 and Factory-Act-13.", "PESO-PV-14 and Factory-Act-13 are unknown due to missing statutory attachments.", True, 4.5),
    ("What should the next action be for P-204B?", "Inspect bearings, verify alignment, pre-stage seal kit.", "Inspect bearings, verify alignment, and pre-stage the Flowserve seal kit.", True, 4.1),
]

BENCHMARK_RESULTS = [
    {"question": q, "expected": e, "answer": a, "correct": c, "latencyS": latency}
    for q, e, a, c, latency in BENCHMARK
]


def completeness() -> dict:
    linked_tags = 64
    total_tags = 73
    return {"totalTags": total_tags, "linkedTags": linked_tags, "score": round(linked_tags / total_tags, 3)}


def query_answer(query: str) -> dict:
    lower = query.lower()
    if "oisd" in lower or "25%" in lower or "lel" in lower:
        return {
            "answer": "OISD-116 clause 4.2 requires automatic shutdown when combustible gas detection exceeds 25% LEL. Brian AI found a live gap: the emergency response document describes manual evacuation but does not prove an automatic heater trip path.",
            "citations": ["OISD-116-Fired-Heater-Procedure.pdf", "Emergency-Response-Plan.pdf"],
            "confidence": 0.91,
        }
    if "v-301" in lower or "safety valve" in lower:
        return {
            "answer": "V-301 needs follow-up. The pressure vessel report shows declining wall thickness and the 2024 safety-valve certificate is missing from the regulatory evidence set.",
            "citations": ["Pressure-Vessel-V301-PV-Report-2023.pdf", "PESO-License-Renewal-2024.pdf"],
            "confidence": 0.86,
        }
    if "he-101" in lower or "tube" in lower:
        return {
            "answer": "HE-101 has a repeated tube-leak pattern across the November 2022 incident report and the 2024 NDT record. The recommended action is to stage the Alfa Laval gasket kit and inspect tube bundle pass partitions before the next shutdown.",
            "citations": ["Incident-2022-11-03-HE101-Tube-Leak.pdf", "NDT-Report-HE101-2024.pdf"],
            "confidence": 0.84,
        }
    return {
        "answer": "P-204B seal failure was most likely caused by elevated vibration after bearing wear. The incident report describes rising vibration before the July 2023 seal damage, and the work-order history shows a similar pattern in January 2022. Recommended action: inspect bearings, verify alignment, and pre-stage the Flowserve seal kit.",
        "citations": ["Incident-2023-07-15-P204B-Seal-Failure.pdf", "work-orders-2022-2024.csv", "Flowserve-Pump-P204-Manual.pdf"],
        "confidence": 0.93,
    }


def ingest_response(filename: str) -> dict:
    return {
        "doc_id": filename,
        "chunks": 18,
        "entities": 9,
        "alerts_triggered": 1,
        "ingested_at": datetime.utcnow().isoformat() + "Z",
    }
