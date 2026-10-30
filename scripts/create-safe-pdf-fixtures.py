"""Synthetic-only verification inputs. No personal or production documents."""
from pathlib import Path
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import reportlab
from pypdf import PdfReader, PdfWriter
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1] / 'tests' / 'fixtures' / 'pdf'
root.mkdir(parents=True, exist_ok=True)
font_root = Path(reportlab.__file__).parent / 'fonts'
pdfmetrics.registerFont(TTFont('FixtureSans', str(font_root / 'Vera.ttf')))
(root / 'embedded-font-license.txt').write_text((font_root / 'bitstream-vera-license.txt').read_text(), encoding='utf-8')
c = canvas.Canvas(str(root / 'synthetic-two-page.pdf'), pagesize=(612, 792), invariant=1)
for page, text in [(1, 'SYNTHETIC ONLY - PAGE ONE - React fixture'), (2, 'SYNTHETIC ONLY - PAGE TWO - TypeScript fixture')]:
    c.setFont('FixtureSans', 16)
    c.drawString(45, 730, text)
    c.setFont('FixtureSans', 11)
    c.drawString(45, 700, 'Safe fabricated test data; no real candidate information.')
    c.drawString(45, 40, f'Page {page} of 2')
    c.showPage()
c.save()
writer = PdfWriter()
writer.append(PdfReader(root / 'synthetic-two-page.pdf'))
writer.encrypt('fixture-password', algorithm='RC4-128')
with open(root / 'encrypted.pdf', 'wb') as file:
    writer.write(file)
image = Image.new('RGB', (900, 200), 'white')
ImageDraw.Draw(image).text((25, 60), 'SYNTHETIC SCAN ONLY - no text layer', fill='black')
c = canvas.Canvas(str(root / 'scan-no-text.pdf'), pagesize=(612, 792), invariant=1)
c.drawImage(ImageReader(image), 40, 550, width=530, height=118)
c.save()
c = canvas.Canvas(str(root / 'oversized-page.pdf'), pagesize=(20000, 20000), invariant=1)
c.drawString(40, 19900, 'SYNTHETIC OVERSIZED PAGE - DO NOT RENDER WITHOUT LIMITS')
c.save()
(root / 'malformed.pdf').write_bytes(b'%PDF-1.7\nSYNTHETIC INVALID FILE\n%%EOF')
print('Created 5 synthetic fixtures:', ', '.join(p.name for p in root.glob('*.pdf')))
