from pathlib import Path
from math import cos, pi, sin

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "pitch-deck-v2"
ASSETS = OUT / "assets"
W, H, SCALE = 1920, 1080, 2

COBALT = "#2F47D7"
COBALT_2 = "#4058E4"
NAVY = "#15224F"
NAVY_2 = "#1D2C63"
PAPER = "#F3F2EF"
WHITE = "#FFFFFF"
INK = "#101114"
MUTED = "#676A72"
LINE = "#C9C9C5"
PALE_BLUE = "#DDE2FF"


def font(name, size):
    return ImageFont.truetype(str(ASSETS / name), size * SCALE)


SERIF = "InstrumentSerif-Regular.ttf"
SANS = "InstrumentSans-Regular.ttf"
BOLD = "InstrumentSans-Bold.ttf"


def canvas(color):
    return Image.new("RGB", (W * SCALE, H * SCALE), color)


def xy(values):
    return tuple(int(v * SCALE) for v in values)


def text(draw, pos, value, size, fill=INK, face=SANS, anchor=None, spacing=4, align="left"):
    draw.multiline_text(
        xy(pos), value, font=font(face, size), fill=fill, anchor=anchor,
        spacing=spacing * SCALE, align=align,
    )


def rule(draw, a, b, fill=LINE, width=1):
    draw.line([xy(a), xy(b)], fill=fill, width=width * SCALE)


def rr(draw, box, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(xy(box), radius * SCALE, fill=fill, outline=outline, width=width * SCALE)


def ellipse(draw, box, fill=None, outline=None, width=1):
    draw.ellipse(xy(box), fill=fill, outline=outline, width=width * SCALE)


def logo_mark(draw, x, y, size, color):
    cx, cy = x + size / 2, y + size / 2
    r = size * 0.42
    pts = []
    for i in range(6):
        angle = -pi / 2 + i * pi / 3
        pts.append((cx + cos(angle) * r, cy + sin(angle) * r))
    pts2 = [xy(p) for p in pts]
    draw.line(pts2 + [pts2[0]], fill=color, width=max(2, int(size * .035 * SCALE)), joint="curve")
    top = (cx, cy - r)
    left = (cx - r * .84, cy + r * .5)
    right = (cx + r * .84, cy + r * .5)
    for a, b in [(top, (cx, cy + r * .45)), (left, right)]:
        rule(draw, a, b, color, max(2, int(size * .025)))
    for px, py in [top, left, right]:
        ellipse(draw, (px - size * .07, py - size * .07, px + size * .07, py + size * .07), fill=color)


def footer(draw, dark=False):
    color = WHITE if dark else INK
    muted = "#BAC3F3" if dark else MUTED
    logo_mark(draw, 66, 1008, 28, color)
    text(draw, (105, 1022), "Brian AI", 17, color, SERIF, anchor="lm")
    text(draw, (1850, 1022), "Industrial knowledge, ready when it matters", 12, muted, SANS, anchor="rm")


def finish(img, filename):
    img.resize((W, H), Image.Resampling.LANCZOS).save(OUT / filename, quality=96)


def slide_1():
    im = canvas(COBALT)
    d = ImageDraw.Draw(im)
    # Evidence network watermark.
    nodes = [(1280, 140, 19), (1505, 255, 11), (1710, 160, 16), (1360, 520, 25),
             (1650, 560, 14), (1480, 820, 21), (1790, 900, 13), (1170, 860, 10)]
    for i, (x, y, r) in enumerate(nodes):
        for j in range(i + 1, len(nodes)):
            x2, y2, _ = nodes[j]
            if ((x - x2) ** 2 + (y - y2) ** 2) ** .5 < 420:
                rule(d, (x, y), (x2, y2), "#4057D8", 2)
        ellipse(d, (x - r, y - r, x + r, y + r), outline="#5368E1", width=2)
        ellipse(d, (x - 4, y - 4, x + 4, y + 4), fill="#6375E5")
    text(d, (78, 72), "THE EVIDENCE INTELLIGENCE LAYER\nFOR INDUSTRIAL OPERATIONS", 16, PALE_BLUE, BOLD, spacing=6)
    text(d, (78, 172), "Industrial knowledge,\nready when it matters.", 82, WHITE, SERIF, spacing=-4)
    logo_mark(d, 80, 785, 94, WHITE)
    text(d, (198, 852), "Brian AI", 116, WHITE, SERIF, anchor="lm")
    finish(im, "slide-01-cover.png")


def slide_2():
    im = canvas(PAPER)
    d = ImageDraw.Draw(im)
    text(d, (64, 62), "Critical plant knowledge is everywhere,\nexcept where it is needed.", 74, INK, SERIF, spacing=-5)
    labels = [
        (90, 440, 380, 620, "P&IDs", "asset context", -4),
        (470, 515, 770, 690, "Work orders", "maintenance history", 2),
        (890, 410, 1190, 590, "Incidents", "failure evidence", -2),
        (1280, 520, 1595, 700, "Regulations", "compliance clauses", 4),
        (1510, 340, 1815, 500, "Experts", "tacit knowledge", -3),
    ]
    center = (985, 760)
    for x1, y1, x2, y2, title, sub, _ in labels:
        rr(d, (x1, y1, x2, y2), 3, fill=WHITE, outline=LINE, width=1)
        text(d, (x1 + 24, y1 + 30), title, 34, INK, SERIF)
        text(d, (x1 + 25, y2 - 28), sub.upper(), 11, MUTED, BOLD, anchor="ls")
        # Broken path toward the missing center.
        sx, sy = (x1 + x2) / 2, y2
        rule(d, (sx, sy), ((sx + center[0]) / 2, (sy + center[1]) / 2), "#AEB0B6", 1)
    ellipse(d, (900, 685, 1070, 855), outline=COBALT, width=2)
    text(d, (985, 758), "?", 70, COBALT, SERIF, anchor="mm")
    text(d, (985, 886), "THE MISSING CONNECTION", 12, COBALT, BOLD, anchor="mm")
    footer(d)
    finish(im, "slide-02-problem.png")


def slide_3():
    im = canvas(NAVY)
    d = ImageDraw.Draw(im)
    text(d, (64, 62), "One command center for\nevidence-backed decisions.", 74, WHITE, SERIF, spacing=-5)
    cx, cy = 1000, 650
    cards = [
        (530, 370, 800, 505, "AI Copilot", "cited answers"),
        (870, 345, 1130, 480, "Compliance", "evidence gaps"),
        (1210, 370, 1480, 505, "Knowledge graph", "connected context"),
        (530, 760, 800, 895, "Failure alerts", "recurring patterns"),
        (870, 785, 1130, 920, "Field PWA", "offline access"),
        (1210, 760, 1480, 895, "Expert capture", "knowledge retained"),
    ]
    for x1, y1, x2, y2, title, sub in cards:
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        rule(d, (cx, cy), (mx, my), "#52639D", 2)
        rr(d, (x1, y1, x2, y2), 2, fill=NAVY_2, outline="#5C6CA0")
        text(d, (mx, my - 15), title, 27, WHITE, SERIF, anchor="mm")
        text(d, (mx, my + 28), sub.upper(), 10, "#BFC8F0", BOLD, anchor="mm")
    ellipse(d, (875, 525, 1125, 775), fill=WHITE)
    logo_mark(d, 950, 565, 100, COBALT)
    text(d, (1000, 705), "Brian AI", 34, COBALT, SERIF, anchor="mm")
    footer(d, dark=True)
    finish(im, "slide-03-solution.png")


def slide_4():
    im = canvas(COBALT)
    d = ImageDraw.Draw(im)
    text(d, (62, 80), "Six capabilities.\nOne connected\nknowledge system.", 78, WHITE, SERIF, spacing=-7)
    text(d, (65, 770), "FROM SEARCHING FOR DOCUMENTS", 12, PALE_BLUE, BOLD)
    text(d, (65, 805), "to acting on verified evidence", 31, WHITE, SERIF)
    x0, y0, cw, ch = 800, 105, 500, 265
    modules = [
        ("01", "AI Copilot", "Answers with citations"),
        ("02", "Compliance", "Clauses to evidence"),
        ("03", "Knowledge graph", "Relationships revealed"),
        ("04", "Failure alerts", "Patterns made visible"),
        ("05", "Field PWA", "Intelligence on site"),
        ("06", "Expert capture", "Experience preserved"),
    ]
    for i, (num, title, sub) in enumerate(modules):
        col, row = i % 2, i // 2
        x1, y1 = x0 + col * cw, y0 + row * ch
        x2, y2 = x1 + cw, y1 + ch
        fill = NAVY if (row + col) % 2 == 0 else "#24336F"
        d.rectangle(xy((x1, y1, x2, y2)), fill=fill, outline="#5262AA", width=2)
        text(d, (x1 + 28, y1 + 32), num, 12, "#8996D7", BOLD)
        text(d, (x1 + 28, y1 + 102), title, 35, WHITE, SERIF)
        text(d, (x1 + 28, y2 - 35), sub.upper(), 11, "#BFC8F0", BOLD, anchor="ls")
    footer(d, dark=True)
    finish(im, "slide-04-product.png")


def bezier_points(p0, p1, p2, p3, n=80):
    points = []
    for i in range(n + 1):
        t = i / n
        x = (1-t)**3*p0[0] + 3*(1-t)**2*t*p1[0] + 3*(1-t)*t*t*p2[0] + t**3*p3[0]
        y = (1-t)**3*p0[1] + 3*(1-t)**2*t*p1[1] + 3*(1-t)*t*t*p2[1] + t**3*p3[1]
        points.append(xy((x, y)))
    return points


def slide_5():
    im = canvas(PAPER)
    d = ImageDraw.Draw(im)
    text(d, (64, 62), "Industrial AI is finally possible,\nbut trust determines adoption.", 70, INK, SERIF, spacing=-5)
    # Axes and rising capability curve.
    rule(d, (100, 830), (1800, 830), LINE, 1)
    curve = bezier_points((120, 800), (690, 780), (1220, 640), (1775, 305))
    d.line(curve, fill=COBALT, width=7 * SCALE, joint="curve")
    events = [
        (310, 782, "Language", "technical documents"),
        (650, 742, "Vision", "equipment imagery"),
        (1000, 660, "Graphs", "plant relationships"),
        (1340, 530, "Workforce", "knowledge urgency"),
        (1640, 360, "Compliance", "proof required"),
    ]
    for x, y, title, sub in events:
        ellipse(d, (x - 11, y - 11, x + 11, y + 11), fill=COBALT)
        rule(d, (x, y + 16), (x, 845), "#D7D7D2", 1)
        text(d, (x, 875), title, 24, INK, SERIF, anchor="ma")
        text(d, (x, 914), sub.upper(), 9, MUTED, BOLD, anchor="ma")
    text(d, (1545, 675), "THE MISSING LAYER", 11, COBALT, BOLD)
    text(d, (1545, 715), "AI that can\nprove every answer", 39, INK, SERIF, spacing=-2)
    footer(d)
    finish(im, "slide-05-why-now.png")


def slide_6():
    im = canvas(PAPER)
    d = ImageDraw.Draw(im)
    text(d, (64, 62), "A working evidence-to-action system.", 74, INK, SERIF)
    text(d, (66, 165), "HACKATHON PROTOTYPE INDICATORS", 12, COBALT, BOLD)
    metrics = [
        ("3.5h", "saved per\nevidence search"),
        ("2", "critical compliance\ngaps surfaced"),
        ("3", "failure patterns\nmade actionable"),
    ]
    x_edges = [62, 660, 1260, 1858]
    for i, (value, label) in enumerate(metrics):
        x1, x2 = x_edges[i], x_edges[i + 1]
        d.rectangle(xy((x1, 238, x2, 700)), outline=LINE, width=2)
        text(d, (x1 + 32, 315), value, 100, COBALT, SERIF)
        text(d, (x1 + 34, 515), label, 34, INK, SANS, spacing=2)
    proofs = [("20", "documents unified"), ("18", "clauses evaluated"), ("P-204B", "cited root cause"), ("FIELD", "OCR, voice, offline")]
    start = 65
    for i, (value, label) in enumerate(proofs):
        x = start + i * 450
        text(d, (x, 790), value, 25, INK, SERIF)
        text(d, (x, 833), label.upper(), 10, MUTED, BOLD)
        rule(d, (x, 866), (x + 350, 866), LINE, 1)
    text(d, (66, 930), "Prototype results on the hackathon corpus. Not production customer traction.", 13, MUTED, SANS)
    footer(d)
    finish(im, "slide-06-prototype-proof.png")


def slide_7():
    im = canvas(NAVY)
    d = ImageDraw.Draw(im)
    text(d, (64, 62), "Grounded AI built\nfor traceability.", 74, WHITE, SERIF, spacing=-5)
    text(d, (66, 270), "EVERY ANSWER RETAINS A PATH\nBACK TO PLANT EVIDENCE", 12, "#BFC8F0", BOLD, spacing=5)
    levels = [
        ("EXPERIENCE", "React 19  •  TypeScript  •  Field PWA", COBALT_2),
        ("APPLICATION", "FastAPI  •  REST  •  streaming events", "#354A9B"),
        ("KNOWLEDGE", "PDF extraction  •  entities  •  vector retrieval", "#2B3D82"),
        ("INTELLIGENCE", "Cited RAG  •  compliance  •  graph  •  alerts", "#22346F"),
        ("INFRASTRUCTURE", "OpenRouter  •  Neo4j AuraDB  •  Vercel  •  Railway", "#1A2A5F"),
    ]
    x1, x2, y0, h = 670, 1815, 165, 146
    for i, (label, body, fill) in enumerate(levels):
        y1 = y0 + i * h
        y2 = y1 + h - 12
        rr(d, (x1, y1, x2, y2), 3, fill=fill, outline="#6071AF")
        text(d, (x1 + 28, (y1 + y2) / 2), label, 11, "#C9D0F5", BOLD, anchor="lm")
        text(d, (x1 + 270, (y1 + y2) / 2), body, 26, WHITE, SERIF, anchor="lm")
        if i < len(levels) - 1:
            text(d, ((x1 + x2) / 2, y2 + 10), "↓", 24, "#8794D0", SANS, anchor="ma")
    text(d, (670, 915), "SERVER-SIDE CREDENTIALS  •  PROTECTED WRITES  •  PERSISTENT INDEX", 10, "#BFC8F0", BOLD)
    footer(d, dark=True)
    finish(im, "slide-07-technical-architecture.png")


def slide_8():
    im = canvas(PAPER)
    d = ImageDraw.Draw(im)
    text(d, (64, 62), "Start with refinery knowledge.\nExpand across industrial operations.", 70, INK, SERIF, spacing=-5)
    cx, cy = 660, 640
    rings = [(340, "#E2E5F6"), (250, "#C9D0F6"), (165, "#AAB7F2"), (82, COBALT)]
    for r, fill in rings:
        ellipse(d, (cx - r, cy - r, cx + r, cy + r), fill=fill)
    text(d, (cx, cy - 12), "REFINERY", 15, WHITE, BOLD, anchor="mm")
    text(d, (cx, cy + 22), "operations", 18, WHITE, SERIF, anchor="mm")
    text(d, (660, 420), "PETROCHEMICALS", 10, NAVY, BOLD, anchor="mm")
    text(d, (660, 310), "POWER  •  MANUFACTURING  •  MINING", 10, NAVY, BOLD, anchor="mm")
    text(d, (660, 202), "DOCUMENT-HEAVY PROCESS INDUSTRIES", 10, NAVY, BOLD, anchor="mm")
    x = 1160
    text(d, (x, 395), "Business model", 18, COBALT, BOLD)
    text(d, (x, 440), "Annual enterprise license\nper plant", 42, INK, SERIF, spacing=-2)
    rule(d, (x, 560), (1780, 560), LINE, 1)
    text(d, (x, 610), "PILOT MEASURES", 11, MUTED, BOLD)
    measures = ["Time to evidence", "Cited-answer accuracy", "Compliance gaps closed", "Repeat failures prevented"]
    for i, label in enumerate(measures):
        yy = 665 + i * 58
        ellipse(d, (x, yy - 5, x + 10, yy + 5), fill=COBALT)
        text(d, (x + 28, yy), label, 22, INK, SANS, anchor="lm")
    footer(d)
    finish(im, "slide-08-business-opportunity.png")


def slide_9():
    im = canvas(PAPER)
    d = ImageDraw.Draw(im)
    text(d, (64, 62), "Builder at the intersection\nof AI, data, and business.", 72, INK, SERIF, spacing=-5)
    text(d, (66, 245), "YASH DUGAR", 13, COBALT, BOLD)
    text(d, (66, 285), "Technology and Business Management, Masters' Union\nCFA Level II candidate", 25, INK, SANS, spacing=8)
    proofs = [
        ("5+", "agentic automations built"),
        ("20+", "demo AI agents created"),
        ("1", "secure Python diligence tool"),
    ]
    for i, (value, label) in enumerate(proofs):
        x1 = 65 + i * 395
        rule(d, (x1, 480), (x1 + 330, 480), LINE, 1)
        text(d, (x1, 525), value, 58, COBALT, SERIF)
        text(d, (x1, 615), label, 18, INK, SANS)
    text(d, (66, 790), "PRODUCT  •  ANALYTICS  •  AUTOMATION  •  GO-TO-MARKET", 11, MUTED, BOLD)
    text(d, (66, 845), "Built across product, analytics, fundraising,\noperations, and commercial execution.", 30, INK, SERIF, spacing=-1)
    # Portrait, kept compact to preserve source sharpness.
    portrait = Image.open(ASSETS / "yash-dugar.png").convert("RGB")
    portrait = ImageOps.fit(portrait, (390 * SCALE, 390 * SCALE), method=Image.Resampling.LANCZOS)
    mask = Image.new("L", portrait.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, portrait.width - 1, portrait.height - 1), fill=255)
    px, py = 1390 * SCALE, 365 * SCALE
    im.paste(portrait, (px, py), mask)
    d = ImageDraw.Draw(im)
    ellipse(d, (1372, 347, 1798, 773), outline=COBALT, width=3)
    text(d, (1585, 820), "yashdugar.com", 14, COBALT, BOLD, anchor="mm")
    footer(d)
    finish(im, "slide-09-team.png")


def slide_10():
    im = canvas(COBALT)
    d = ImageDraw.Draw(im)
    text(
        d, (960, 540),
        "Brian AI turns industrial knowledge into\nevidence-backed action before the next\naudit, shutdown, or failure.",
        72, WHITE, SERIF, anchor="mm", spacing=-4, align="center",
    )
    finish(im, "slide-10-closing.png")


def contact_sheet():
    files = sorted(OUT.glob("slide-*.png"))
    thumb_w, thumb_h = 576, 324
    margin, gap, label_h = 36, 28, 42
    sheet_w = margin * 2 + thumb_w * 2 + gap
    sheet_h = margin * 2 + (thumb_h + label_h + gap) * 5 - gap
    sheet = Image.new("RGB", (sheet_w, sheet_h), "#E6E5E2")
    d = ImageDraw.Draw(sheet)
    label_font = ImageFont.truetype(str(ASSETS / BOLD), 18)
    for i, path in enumerate(files):
        col, row = i % 2, i // 2
        x = margin + col * (thumb_w + gap)
        y = margin + row * (thumb_h + label_h + gap)
        thumb = Image.open(path).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x, y))
        d.text((x, y + thumb_h + 12), f"{i + 1:02d}  {path.stem[9:].replace('-', ' ')}", font=label_font, fill=INK)
    sheet.save(OUT / "brian-ai-deck-contact-sheet.png")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for render in [slide_1, slide_2, slide_3, slide_4, slide_5, slide_6, slide_7, slide_8, slide_9, slide_10]:
        render()
    contact_sheet()
    print(f"Rendered 10 slides and contact sheet to {OUT}")


if __name__ == "__main__":
    main()
