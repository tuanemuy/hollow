# Document parser fixtures

`poi-*` are unmodified Apache POI fixtures at revision `3e24e7d6f4151b993232ee67faae650ade533712`. `pdfjs-basicapi.pdf` is an unmodified Mozilla PDF.js fixture at revision `716aff9d50c08b4bec3e350540a3f05aea89dedc`. Original URLs and SHA-256 values are recorded in `sources.json`; distribution licenses and Apache NOTICE are retained in `../licenses/`.

`generated-*` were created for this project using docx 9.6.0, ExcelJS 4.4.0, PptxGenJS 4.0.1 and PDFKit 0.17.2. The PDF font is Noto Sans CJK JP; its OFL is retained in `../licenses/noto-LICENSE`. The font file is not redistributed here. Scanned PDFs contain a raster rendering of this generated Japanese document. `corrupt.*` and `unsafe-xml.pptx` are deliberate mutations of generated documents. Test-only ZIP mutation helpers add security and related-part cases to the generated OOXML fixtures. Fixture writers are not production dependencies.
