# Native DOCX acceptance procedure

Status: BLOCKED until a human inspects these synthetic files in Word, LibreOffice or another native-compatible layout engine. Current machine checks found no compatible viewer in PATH/standard locations and no connected Word session. PDF screenshots and XML checks are separate evidence.

## Files

Open the DOCX and matching PDF from the task outputs folder:

- milestone-6-short-cv.docx / .pdf — short CV, PDF1 page.
- milestone-6-native-cv.docx / .pdf — long CV, PDF5 pages, ending with Synthetic project11 and Education and Certifications.
- milestone-6-native-cover.docx / .pdf — cover letter, PDF1 page.

Do not use a real personal CV. Keep cloud sharing private if a web viewer is used. No upload is needed for a local Word/LibreOffice viewer.

## Acceptance

1. Record viewer name/version, operating system and actual DOCX page count for each file. Inspect every page in Print Layout and Print Preview. A different page count from PDF is not automatically a failure, but missing text or bad breaks are.
2. Verify A4 portrait and 0.75-inch/1.905cm margins. Look for clipping, overlaps, unexpected blank pages, orphan headings, broken words and date lines separated ambiguously from their roles.
3. Check the Title/Heading1 hierarchy and body paragraphs. DOCX structure currently specifies Noto Sans consistently; record any font substitution or missing-glyph warning. Do not mark visual consistency PASS solely because XML names the font.
4. Confirm contact details across all three: Synthetic Candidate; synthetic@example.test; +27 00 000 0000; South Africa; https://portfolio.example.test. These are synthetic placeholders.
5. Verify employment2020-01-01 to2024-12-31, paid freelance2021-01-01 to2022-12-31, and project2023-01-01 to2025-12-31. Distinct experience categories must remain separate; no added years, technologies, proficiency or qualifications.
6. Check all long-project paragraphs, including project0 through11 and the last date2025-12-31. Ensure no final paragraph or section is dropped.
7. The current renderer uses plain paragraphs, not native bullet lists. Mark bullet-style appearance N/A for these fixtures, and check that no stray bullets, numbering or hidden text appeared. A future bullet-list template needs its own native verification.
8. Compare CV/cover text to the matching PDF. PDF extraction and python-docx paragraph equivalence already pass; now inspect native pagination, margins and spacing. Copy the whole DOCX body into plain text and confirm sensible reading order.
9. For the cover letter, check employer/role heading, greeting, paragraph spacing, signature and full contact details. No unsupported statement should be introduced by layout repair.
10. Return only: viewer/version, each filename and page count, PASS/FAIL for layout/margins/headings/fonts/dates/contact/reading order, bullet N/A, and a short defect description/page number. Screenshots may contain these synthetic fixtures only. Do not send credentials, cookies or tokens.

Native document readiness stays BLOCKED until these results are received and any layout defect is repaired and rerendered. No native visual PASS is inferred from PDF, XML, python-docx or a successful download.
