from __future__ import annotations

import csv
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.getenv("BRIAN_AI_DATA_DIR", ROOT / "data"))
CORPUS = DATA_DIR / "corpus"


PDF_DOCS = {
    "PID-CDU-001.pdf": "P&ID CDU 001\nEquipment tags: P-204B, HE-101, V-301, K-101, T-201, XV-101, FV-204, PSV-301.\nProcess notes: P-204B feeds CDU charge flow through HE-101. V-301 relief discharges to flare. Valve bypasses are locked closed.",
    "PID-VDU-002.pdf": "P&ID VDU 002\nEquipment tags: V-301, P-205A, HE-202, T-201, PSV-301, LG-301, TI-302.\nProcess notes: V-301 operates at 18 bar with PSV annual test requirement.",
    "PID-FCU-003.pdf": "P&ID FCU 003\nEquipment tags: K-101, P-204B, HE-101, FCU-RX-01, PSV-401, XV-401.\nProcess notes: K-101 compressor trip cascades to FCC feed isolation.",
    "OISD-116-Fired-Heater-Procedure.pdf": "OISD 116 Fired Heater Procedure\nClause 4.1: Auto fuel cutoff on loss of flame or high temperature.\nClause 4.2: Automatic shutdown is required when combustible gas exceeds 25 percent LEL.\nClause 5.1: Annual external inspection and five-year internal inspection are required.",
    "OISD-117-LPG-Handling.pdf": "OISD 117 LPG Handling\nClause 3.1: LPG vessels shall be at least 30m from process equipment.\nClause 4.2: Deadman valve required during LPG transfer.\nPlant note: Temporary LPG cylinder staging needs updated survey evidence.",
    "PESO-Tank-Inspection-SOP.pdf": "PESO Tank Inspection SOP\nClause 12: Above-ground tanks inspection every 5 years.\nClause 15: Inspection records retained for minimum 10 years.\nClause 22: Hot work permit required for any tank repair.",
    "Emergency-Response-Plan.pdf": "Emergency Response Plan\nGas detector alarms trigger evacuation and field muster. Current document describes manual heater isolation but does not prove automatic trip at 25 percent LEL.",
    "NDT-Report-HE101-2024.pdf": "NDT Report HE-101 2024\nTube sheet scan shows localized thinning near pass partition. Prior incident in 2022 involved tube leak. Recommended gasket kit pre-positioning before shutdown.",
    "Tank-T201-Annual-Inspection-2023.pdf": "Tank T-201 Annual Inspection 2023\nBund capacity calculated at 114 percent of largest tank volume. Flame arrestor record present for T-201 vent. Shell repair requires permit linkage.",
    "Pump-P204-Vibration-Analysis-2024.pdf": "Pump P-204 Vibration Analysis 2024\nP-204B vibration exceeded alert threshold before seal leak. Bearing outer race defect signature observed. Alignment verification recommended.",
    "Pressure-Vessel-V301-PV-Report-2023.pdf": "Pressure Vessel V-301 PV Report 2023\nWall thickness trend is declining but above minimum. PSV certificate exists for 2023; 2024 certificate not attached.",
    "Flowserve-Pump-P204-Manual.pdf": "Flowserve Pump P-204 Manual\nSeal kit SK-P204 should be pre-staged for recurrent seal failures. Bearing inspection and laser alignment are mandatory after high vibration events.",
    "Alfa-Laval-HE101-Manual.pdf": "Alfa Laval HE101 Manual\nTube bundle pass partition inspection required after repeated tube leak. Recommended gasket kit AL-HE101-GK before shutdown.",
    "Compressor-K101-Manual.pdf": "Compressor K101 Manual\nK-101 compressor maintenance interval is 6 months. Trip events require vibration review, lube oil analysis, and cause-effect verification.",
    "Incident-2023-07-15-P204B-Seal-Failure.pdf": "Incident 2023-07-15 P204B Seal Failure\nRoot cause: elevated vibration due to bearing wear damaged seal faces. Corrective action: bearing replacement, alignment check, seal kit replacement.",
    "Incident-2022-11-03-HE101-Tube-Leak.pdf": "Incident 2022-11-03 HE101 Tube Leak\nRoot cause: tube thinning near pass partition. Corrective action: plug damaged tubes, revise inspection frequency, pre-stage gasket kit.",
    "Incident-2024-02-28-V301-Safety-Valve-Lift.pdf": "Incident 2024-02-28 V301 Safety Valve Lift\nSafety valve lifted during pressure excursion. Follow-up: verify PSV certificate, review pressure control loop, update operator response card.",
    "PESO-License-Renewal-2024.pdf": "PESO License Renewal 2024\nLists T-201, V-301, LPG transfer area, and pressure vessel register summary. V-301 certificate number is referenced but attachment is missing.",
    "Factory-Act-Annual-Return-2023.pdf": "Factory Act Annual Return 2023\nSafety officer and deputy named. 18 first-aid boxes for 2300 workers. Ventilation audit completed for compressor house and process shelters.",
}


def pdf_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def write_pdf(path: Path, text: str) -> None:
    lines = []
    y = 780
    for raw in text.splitlines():
        lines.append(f"BT /F1 11 Tf 54 {y} Td ({pdf_escape(raw)}) Tj ET")
        y -= 18
    stream = "\n".join(lines).encode("ascii")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    offsets = []
    output = bytearray(b"%PDF-1.4\n")
    for number, obj in enumerate(objects, start=1):
        offsets.append(len(output))
        output.extend(f"{number} 0 obj\n".encode("ascii"))
        output.extend(obj)
        output.extend(b"\nendobj\n")
    xref = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("ascii"))
    for offset in offsets:
        output.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    output.extend(f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode("ascii"))
    path.write_bytes(output)


def write_work_orders(path: Path) -> None:
    rows = []
    base = [
        ("WO-2022-014", "P-204B", "seal_failure", "Seal failure after high vibration and bearing noise", "2022-01-18", "A. Rao", "closed"),
        ("WO-2023-177", "P-204B", "seal_failure", "Repeat seal face damage after vibration alert", "2023-07-15", "A. Rao", "closed"),
        ("WO-2022-211", "HE-101", "tube_leak", "Tube leak near pass partition", "2022-11-03", "M. Patel", "closed"),
        ("WO-2024-071", "HE-101", "tube_leak", "NDT follow-up after suspected tube leak", "2024-03-22", "M. Patel", "closed"),
        ("WO-2024-090", "V-301", "psv_review", "Safety valve certificate missing for 2024", "2024-04-02", "S. Iyer", "open"),
    ]
    rows.extend(base)
    tags = ["P-204B", "HE-101", "V-301", "K-101", "T-201"]
    modes = ["inspection", "lubrication", "calibration", "alignment", "visual_check"]
    for index in range(55):
        rows.append((
            f"WO-2024-{200 + index}",
            tags[index % len(tags)],
            modes[index % len(modes)],
            f"Routine {modes[index % len(modes)].replace('_', ' ')} for {tags[index % len(tags)]}",
            f"2024-{(index % 12) + 1:02d}-{(index % 27) + 1:02d}",
            ["A. Rao", "M. Patel", "S. Iyer", "K. Shah"][index % 4],
            "closed" if index % 6 else "open",
        ))
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["work_order_id", "equipment_tag", "failure_mode", "description", "date", "technician", "status"])
        writer.writerows(rows)


def main() -> None:
    CORPUS.mkdir(parents=True, exist_ok=True)
    for filename, text in PDF_DOCS.items():
        write_pdf(CORPUS / filename, text)
    write_work_orders(CORPUS / "work-orders-2022-2024.csv")
    print(f"Generated {len(PDF_DOCS) + 1} corpus files in {CORPUS}")


if __name__ == "__main__":
    main()
