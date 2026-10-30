"""Local synthetic download QA; PDFium rendering is not native DOCX layout QA."""
import argparse
import hashlib
import json
from pathlib import Path
import pypdfium2 as pdfium
from docx import Document

parser = argparse.ArgumentParser()
parser.add_argument('--output-dir', type=Path, default=Path(__file__).resolve().parents[3] / 'outputs')
parser.add_argument('--prefix', default='milestone-4')
parser.add_argument('--file-prefix', default=None)
parser.add_argument('--expected-name', default='José Synthetic')
args = parser.parse_args()
out = args.output_dir.resolve()
file_prefix = args.file_prefix or args.prefix
evidence = []
for kind in ['cv', 'cover']:
    pdf_path = out / f'{file_prefix}-{kind}.pdf'
    docx_path = out / f'{file_prefix}-{kind}.docx'
    pdf = pdfium.PdfDocument(str(pdf_path))
    paths = []
    extracted = ''
    for n in range(len(pdf)):
        page = pdf[n]
        text_page = page.get_textpage()
        extracted += text_page.get_text_range()
        text_page.close()
        bitmap = page.render(scale=1.5)
        image = bitmap.to_pil()
        path = out / f'{args.prefix}-{kind}-page-{n+1}.png'
        image.save(path)
        paths.append(path.name)
        bitmap.close()
        page.close()
    doc = Document(docx_path)
    text = '\n'.join(p.text for p in doc.paragraphs)
    assert args.expected_name in text
    assert len(doc.tables) == 0
    for paragraph in doc.paragraphs:
        assert ''.join(paragraph.text.split()) in ''.join(extracted.split()), paragraph.text
    evidence.append({'kind': kind, 'pdfPages': len(pdf), 'pageImages': paths,
                     'docxParagraphs': len(doc.paragraphs), 'docxTables': len(doc.tables),
                     'allDocxParagraphsPresentInPdf': True,
                     'pdfSHA256': hashlib.sha256(pdf_path.read_bytes()).hexdigest(),
                     'docxSHA256': hashlib.sha256(docx_path.read_bytes()).hexdigest(),
                     'nativeDocxVisual': 'BLOCKED: LibreOffice unavailable'})
    pdf.close()
(out / f'{args.prefix}-document-qa.json').write_text(json.dumps(evidence, indent=2), encoding='utf-8')
print(json.dumps(evidence, indent=2))
