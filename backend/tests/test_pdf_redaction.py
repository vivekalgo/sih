"""
Unit and Integration Tests for Real PDF In-Place Surgical Redaction & Download
"""

import pytest
import pymupdf
import httpx
from app.main import app
from app.engine.redactor import redactor
from app.engine.pii_detector import detector, PIIEntity


def _create_sample_pdf() -> bytes:
    """Helper to generate a realistic sample PDF with sensitive credentials in memory."""
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    page.insert_text((50, 80), "OFFICIAL KYC & IDENTITY VERIFICATION", fontsize=14, fontname="helv")
    page.insert_text((50, 120), "Applicant: Vikram Aditya Singhania", fontsize=11, fontname="helv")
    page.insert_text((50, 140), "Aadhaar UID: 4589 1234 5678", fontsize=11, fontname="helv")
    page.insert_text((50, 160), "Permanent Account Number: ABCDE1234F", fontsize=11, fontname="helv")
    page.insert_text((50, 180), "Contact Mobile: +91 9876543210", fontsize=11, fontname="helv")
    page.insert_text((50, 200), "Email: vikram.singhania@corpsecure.in", fontsize=11, fontname="helv")
    page.insert_text((50, 220), "Visa Signature Card: 4532 7890 1234 5678", fontsize=11, fontname="helv")
    page.insert_text((50, 240), "Internal Project Secret: Project-Zeus-Confidential", fontsize=11, fontname="helv")
    
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_real_pdf_surgical_blackout_redaction():
    """Verifies that PyMuPDF physically redacts sensitive text from PDF stream with zero leaks."""
    raw_pdf_bytes = _create_sample_pdf()
    
    # Detect PII
    doc = pymupdf.open(stream=raw_pdf_bytes, filetype="pdf")
    extracted_text = doc[0].get_text()
    doc.close()

    entities = detector.detect_entities(extracted_text)
    assert len(entities) >= 5

    # Redact in BLACKOUT mode
    redaction_res = redactor.redact_pdf_bytes(
        file_bytes=raw_pdf_bytes,
        entities=entities,
        masking_mode="BLACKOUT",
        custom_keywords=["Project-Zeus-Confidential"]
    )

    sanitized_pdf = redaction_res["pdf_bytes"]
    assert len(sanitized_pdf) > 0
    assert redaction_res["zero_leak_verified"] is True
    assert redaction_res["redacted_count"] >= 5

    # Verify underlying PDF text stream
    verify_doc = pymupdf.open(stream=sanitized_pdf, filetype="pdf")
    sanitized_text = verify_doc[0].get_text()
    verify_doc.close()

    # Zero leaks guarantee
    assert "4589 1234 5678" not in sanitized_text
    assert "ABCDE1234F" not in sanitized_text
    assert "+91 9876543210" not in sanitized_text
    assert "vikram.singhania@corpsecure.in" not in sanitized_text
    assert "4532 7890 1234 5678" not in sanitized_text
    assert "Project-Zeus-Confidential" not in sanitized_text

    # Non-sensitive labels should still be present
    assert "OFFICIAL KYC & IDENTITY VERIFICATION" in sanitized_text
    assert "Permanent Account Number:" in sanitized_text


def test_real_pdf_token_masking_mode():
    """Verifies TOKEN masking mode on real PDF."""
    raw_pdf_bytes = _create_sample_pdf()
    doc = pymupdf.open(stream=raw_pdf_bytes, filetype="pdf")
    text = doc[0].get_text()
    doc.close()

    entities = detector.detect_entities(text)
    redaction_res = redactor.redact_pdf_bytes(
        file_bytes=raw_pdf_bytes,
        entities=entities,
        masking_mode="TOKEN"
    )

    assert redaction_res["zero_leak_verified"] is True
    assert len(redaction_res["pdf_bytes"]) > 0


def test_real_pdf_hash_and_synthetic_masking_modes():
    """Verifies HASH and SYNTHETIC masking modes on real PDF and string redactions."""
    raw_pdf_bytes = _create_sample_pdf()
    doc = pymupdf.open(stream=raw_pdf_bytes, filetype="pdf")
    text = doc[0].get_text()
    doc.close()

    entities = detector.detect_entities(text)
    
    # Test HASH
    hash_res = redactor.redact_pdf_bytes(
        file_bytes=raw_pdf_bytes,
        entities=entities,
        masking_mode="HASH"
    )
    assert hash_res["zero_leak_verified"] is True
    assert len(hash_res["pdf_bytes"]) > 0

    # Test SYNTHETIC
    synth_res = redactor.redact_pdf_bytes(
        file_bytes=raw_pdf_bytes,
        entities=entities,
        masking_mode="SYNTHETIC"
    )
    assert synth_res["zero_leak_verified"] is True
    assert len(synth_res["pdf_bytes"]) > 0

    # Test redact_pdf_strings with TOKEN mode
    target_strings = ["4589 1234 5678", "ABCDE1234F"]
    sanitized_bytes = redactor.redact_pdf_strings(
        file_bytes=raw_pdf_bytes,
        target_strings=target_strings,
        masking_mode="TOKEN",
        detected_entities=entities
    )
    assert len(sanitized_bytes) > 0
    verify_doc = pymupdf.open(stream=sanitized_bytes, filetype="pdf")
    sanitized_text = verify_doc[0].get_text()
    verify_doc.close()
    assert "4589 1234 5678" not in sanitized_text
    assert "ABCDE1234F" not in sanitized_text


def test_pdf_preview_renderer():
    """Verifies base64 PNG preview image generation from PDF."""
    raw_pdf_bytes = _create_sample_pdf()
    preview = redactor.render_pdf_page_preview(raw_pdf_bytes, page_index=0)
    assert preview is not None
    assert preview.startswith("data:image/png;base64,")


def test_create_pdf_from_text():
    """Verifies plain text / benchmark conversion to clean PDF."""
    text = "CONFIDENTIAL BENCHMARK DATA\nApplicant: [REDACTED_NAME]\nPAN: [REDACTED_PAN]"
    pdf_bytes = redactor.create_pdf_from_text(text, title="benchmark_test.txt", masking_mode="TOKEN")
    assert len(pdf_bytes) > 0

    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    assert len(doc) >= 1
    assert "CONFIDENTIAL BENCHMARK DATA" in doc[0].get_text()
    doc.close()


@pytest.mark.anyio
async def test_api_download_sanitized_real_pdf():
    """Integration test: uploads a real PDF and downloads the masked PDF file."""
    raw_pdf = _create_sample_pdf()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Upload
        files = {"file": ("hdfc_applicant.pdf", raw_pdf, "application/pdf")}
        data = {"masking_mode": "BLACKOUT", "custom_keywords_str": "Project-Zeus-Confidential"}
        upload_res = await client.post("/api/upload", files=files, data=data)
        assert upload_res.status_code == 200
        res_data = upload_res.json()
        assert res_data["is_pdf"] is True
        assert res_data["preview_image"] is not None

        # Download Sanitized Real PDF
        download_data = {
            "masking_mode": "BLACKOUT",
            "filename": "hdfc_applicant.pdf",
            "custom_keywords_str": "Project-Zeus-Confidential"
        }
        dl_res = await client.post("/api/download/sanitized", data=download_data)
        assert dl_res.status_code == 200
        assert dl_res.headers["content-type"] == "application/pdf"
        assert "attachment; filename=\"sanitized_hdfc_applicant.pdf\"" in dl_res.headers["content-disposition"]

        # Parse downloaded binary to verify
        dl_doc = pymupdf.open(stream=dl_res.content, filetype="pdf")
        dl_text = dl_doc[0].get_text()
        dl_doc.close()

        assert "4589 1234 5678" not in dl_text
        assert "ABCDE1234F" not in dl_text
        assert "Project-Zeus-Confidential" not in dl_text
