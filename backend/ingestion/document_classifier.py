from __future__ import annotations


def classify_document(filename: str) -> str:
    name = filename.lower()
    if name.startswith("pid-"):
        return "P&ID"
    if "oisd" in name or "sop" in name or "emergency" in name:
        return "Safety Procedure"
    if "work-order" in name or name.endswith(".csv"):
        return "Work Orders"
    if "inspection" in name or "ndt" in name or "vibration" in name or "pv-report" in name:
        return "Inspection Report"
    if "manual" in name:
        return "OEM Manual"
    if "incident" in name:
        return "Incident Report"
    if "peso" in name or "factory" in name or "license" in name or "return" in name:
        return "Regulatory"
    if name.startswith("expert-"):
        return "Expert Knowledge"
    return "Uploaded"
