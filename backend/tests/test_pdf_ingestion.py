from __future__ import annotations

import sys
import tempfile
import unittest
import zlib
from pathlib import Path


BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from corpus_search import extract_pdf_text  # noqa: E402


def compressed_pdf(text: str) -> bytes:
    stream = zlib.compress(f"BT /F1 11 Tf 54 780 Td ({text}) Tj ET".encode("ascii"))
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" /Filter /FlateDecode >>\nstream\n" + stream + b"\nendstream",
    ]
    offsets: list[int] = []
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
    return bytes(output)


class PdfIngestionTests(unittest.TestCase):
    # Regression: ISSUE-002 — compressed real-world PDF streams were indexed as raw bytes.
    # Found by /qa on 2026-07-22.
    def test_extracts_text_from_compressed_pdf_stream(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "inspection.pdf"
            path.write_bytes(compressed_pdf("P-204B compressed inspection evidence"))

            self.assertIn("P-204B compressed inspection evidence", extract_pdf_text(path))


if __name__ == "__main__":
    unittest.main()
