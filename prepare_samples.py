#!/usr/bin/env python3
"""Generates sample cover images and sample secret files (txt, pdf, doc, png, jpg) for quick testing."""
import os
import math
from PIL import Image, ImageDraw

SAMPLES_DIR = os.path.join(os.path.dirname(__file__), "public", "samples")
os.makedirs(SAMPLES_DIR, exist_ok=True)

# 1. Generate Cover Images
def make_gradient_cover(filename, title, w=800, h=600):
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        r = int(24 + (y / h) * 120)
        g = int(45 + (math.sin(y / 40.0) + 1.0) * 40)
        b = int(140 + (y / h) * 90)
        draw.line([(0, y), (w, y)], fill=(min(255, r), min(255, g), min(255, b)))
    
    # Draw geometric decorative elements
    for i in range(10):
        cx = 80 * (i + 1)
        cy = int(300 + 150 * math.sin(i))
        rad = 30 + (i * 4)
        draw.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], outline=(220, 240, 255), width=3)
    
    img.save(os.path.join(SAMPLES_DIR, filename), format="PNG")
    print(f"Generated {filename}")

def make_nature_cover(filename, w=900, h=600):
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    # Sky & Sunset
    for y in range(h):
        t = y / h
        if t < 0.6:
            r = int(255 - t * 150)
            g = int(180 - t * 80)
            b = int(120 + t * 80)
        else:
            # Mountains / Forest
            r = int(20 + (t - 0.6) * 40)
            g = int(80 + (t - 0.6) * 60)
            b = int(50 + (t - 0.6) * 30)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    
    # Sun
    draw.ellipse([450 - 60, 240 - 60, 450 + 60, 240 + 60], fill=(255, 235, 150))
    img.save(os.path.join(SAMPLES_DIR, filename), format="PNG")
    print(f"Generated {filename}")

# 2. Generate Sample Secret Files
def make_secret_files():
    # secret.txt
    txt_path = os.path.join(SAMPLES_DIR, "secret.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(
            "=== TOP SECRET MEMORANDUM ===\n"
            "Project: Python Steganography Engine (StegoPy)\n"
            "Status: Confidential Payload\n"
            "Date: 2026-09-02\n\n"
            "Payload successfully concealed within Least Significant Bits (LSB) of cover pixels.\n"
            "The image visually remains 100% natural, while this secret message is protected!\n"
        )
    print("Generated secret.txt")

    # secret.pdf (Valid standard minimal PDF)
    pdf_path = os.path.join(SAMPLES_DIR, "secret.pdf")
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
        b"4 0 obj\n<< /Length 75 >>\nstream\n"
        b"BT /F1 24 Tf 100 700 Td (CONFIDENTIAL RESEARCH BRIEFING - PYTHON STEGANOGRAPHY) Tj ET\n"
        b"endstream\nendobj\n"
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
        b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000369 00000 n \n"
        b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n448\n%%EOF\n"
    )
    with open(pdf_path, "wb") as f:
        f.write(pdf_content)
    print("Generated secret.pdf")

    # secret.doc (simulated binary document container)
    doc_path = os.path.join(SAMPLES_DIR, "secret.doc")
    with open(doc_path, "wb") as f:
        f.write(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 40 + b"CLASSIFIED_DOCUMENT_SPECIFICATION_PYTHON_STEGANOGRAPHY" + b"\x00" * 200)
    print("Generated secret.doc")

    # secret.png (Secret image)
    secret_png = Image.new("RGB", (120, 120), color=(220, 38, 38))
    draw_png = ImageDraw.Draw(secret_png)
    draw_png.rectangle([20, 20, 100, 100], fill=(254, 240, 138), outline=(255, 255, 255), width=3)
    draw_png.ellipse([40, 40, 80, 80], fill=(37, 99, 235))
    secret_png.save(os.path.join(SAMPLES_DIR, "secret.png"), format="PNG")
    print("Generated secret.png")

    # secret.jpg (Secret jpg)
    secret_jpg = Image.new("RGB", (140, 140), color=(16, 185, 129))
    draw_jpg = ImageDraw.Draw(secret_jpg)
    draw_jpg.polygon([(70, 20), (120, 110), (20, 110)], fill=(245, 158, 11))
    secret_jpg.save(os.path.join(SAMPLES_DIR, "secret.jpg"), format="JPEG", quality=90)
    print("Generated secret.jpg")

if __name__ == "__main__":
    make_gradient_cover("sample_cover_cyber.png", "Cyber Blue Wave", 800, 600)
    make_nature_cover("sample_cover_landscape.png", 900, 600)
    make_secret_files()
    print("All sample files generated successfully.")
