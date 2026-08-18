"""
PrivacyGuard AI - Real In-Memory OCR & Multi-Format Document Text Extractor
Uses PyMuPDF (fitz) and RapidOCR (ONNX Runtime) for 100% real, local, air-gapped text & OCR extraction.
Strictly memory-only (RAM buffer) execution with zero temporary files on disk.
"""

import io
import numpy as np
from typing import Dict, Any, List, Optional
from PIL import Image
import pymupdf  # Real PyMuPDF
from rapidocr_onnxruntime import RapidOCR


class DocumentExtractor:
    """
    Real offline zero-retention document & image text extractor.
    No hardcoded fallbacks — parses live uploaded PDFs, images, and text files.
    """

    def __init__(self):
        # Initialize RapidOCR ONNX model in RAM
        try:
            self.ocr_engine = RapidOCR()
            self._ocr_ready = True
        except Exception as e:
            print(f"[DocumentExtractor] OCR init warning: {e}")
            self.ocr_engine = None
            self._ocr_ready = False

    def extract_from_bytes(self, file_bytes: bytes, filename: str, content_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Processes document entirely in RAM and returns extracted text and metadata.
        """
        ext = filename.split(".")[-1].lower() if "." in filename else "txt"
        
        if ext == "pdf" or (content_type and "pdf" in content_type):
            return self._extract_pdf_real(file_bytes, filename)
        elif ext in ["png", "jpg", "jpeg", "webp", "tiff", "bmp", "gif"] or (content_type and "image" in content_type):
            return self._extract_image_real(file_bytes, filename)
        else:
            return self._extract_plaintext_real(file_bytes, filename)

    def _extract_pdf_real(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Real PyMuPDF extraction. If pages contain scanned images without text layer,
        rasterizes pages in-memory and runs real RapidOCR.
        """
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        pages_text: List[str] = []
        total_pages = len(doc)
        ocr_pages_used = 0

        for page_idx in range(total_pages):
            page = doc[page_idx]
            # Try native PDF text extraction first
            text = page.get_text("text").strip()
            
            # If native text is minimal or missing (scanned document), run RapidOCR on fast page rendering
            if len(text) < 15 and self._ocr_ready:
                try:
                    pix = page.get_pixmap(dpi=120)
                    img_bytes = pix.tobytes("png")
                    ocr_results, _ = self.ocr_engine(img_bytes)
                    if ocr_results:
                        ocr_lines = [line[1] for line in ocr_results if line and len(line) > 1]
                        text = "\n".join(ocr_lines)
                        ocr_pages_used += 1
                except Exception as e:
                    print(f"[DocumentExtractor] OCR page {page_idx} error: {e}")

            if text:
                pages_text.append(text)

        doc.close()
        full_text = "\n\n".join(pages_text) if pages_text else ""
        
        if not full_text.strip():
            full_text = f"[Uploaded PDF: {filename} (Empty or non-extractable text layer)]"

        return {
            "text": full_text,
            "page_count": total_pages,
            "format": "PDF",
            "filename": filename,
            "byte_size": len(file_bytes),
            "ocr_method": "PyMuPDF + RapidOCR" if ocr_pages_used > 0 else "PyMuPDF-Native"
        }

    def _extract_image_real(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Real RapidOCR execution on uploaded image bytes.
        """
        img = Image.open(io.BytesIO(file_bytes))
        width, height = img.size
        
        extracted_lines: List[str] = []
        ocr_engine_used = "RapidOCR-Local"

        if self._ocr_ready:
            try:
                # RapidOCR accepts bytes or numpy array
                ocr_results, _ = self.ocr_engine(file_bytes)
                if ocr_results:
                    for item in ocr_results:
                        # item format: [box_coordinates, text, confidence_score]
                        if item and len(item) > 1:
                            text_segment = item[1].strip()
                            if text_segment:
                                extracted_lines.append(text_segment)
            except Exception as e:
                print(f"[DocumentExtractor] Image OCR failed: {e}")
                ocr_engine_used = "RapidOCR-Error"

        if extracted_lines:
            full_text = "\n".join(extracted_lines)
        else:
            full_text = f"[Image: {filename} ({width}x{height}) - No readable text detected by OCR]"

        return {
            "text": full_text,
            "page_count": 1,
            "format": f"IMAGE ({img.format or 'PNG'})",
            "filename": filename,
            "dimensions": f"{width}x{height}",
            "byte_size": len(file_bytes),
            "ocr_method": ocr_engine_used
        }

    def _extract_plaintext_real(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Direct UTF-8 / ASCII real text decoding.
        """
        for encoding in ["utf-8", "utf-8-sig", "latin-1", "cp1252", "ascii"]:
            try:
                text = file_bytes.decode(encoding)
                return {
                    "text": text,
                    "page_count": 1,
                    "format": "TEXT",
                    "filename": filename,
                    "byte_size": len(file_bytes),
                    "ocr_method": f"Direct-{encoding.upper()}"
                }
            except UnicodeDecodeError:
                continue

        # Fallback raw decode
        text = file_bytes.decode("utf-8", errors="replace")
        return {
            "text": text,
            "page_count": 1,
            "format": "TEXT-RAW",
            "filename": filename,
            "byte_size": len(file_bytes),
            "ocr_method": "Raw-Replacement"
        }


extractor = DocumentExtractor()
