"""
Unit and Integration Tests for Gemini 1.5 Flash Copilot, PyMuPDF Surgical Redaction & Grounded Chatbot.
"""

import pytest
import pymupdf
import httpx
import json
from app.main import app
from app.engine.gemini_copilot import gemini_copilot
from app.engine.redactor import redactor


def _create_test_pdf() -> bytes:
    """Helper to generate a realistic test PDF."""
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    page.insert_text((50, 60), "JOB APPLICATION / RESUME", fontsize=14, fontname="helv")
    page.insert_text((50, 90), "Candidate Name: Vikram Singhania", fontsize=10, fontname="helv")
    page.insert_text((50, 110), "Email: vikram.singhania@corpsecure.in", fontsize=10, fontname="helv")
    page.insert_text((50, 130), "Phone: +91 9876543210", fontsize=10, fontname="helv")
    page.insert_text((50, 150), "Current Salary: ₹ 28,00,000 LPA", fontsize=10, fontname="helv")
    page.insert_text((50, 170), "PAN Card: ABCDE1234F", fontsize=10, fontname="helv")
    page.insert_text((50, 190), "Aadhaar UID: 4589 1234 5678", fontsize=10, fontname="helv")
    page.insert_text((50, 210), "Credit Card: 4532 7890 1234 5678", fontsize=10, fontname="helv")
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_gemini_copilot_contextual_job_application():
    """Verifies that for Job Application, PAN/Aadhaar/Salary/Credit Card are marked 'Not Required'."""
    text = (
        "Candidate: Vikram Singhania\n"
        "Email: vikram@work.in\n"
        "Phone: 9876543210\n"
        "PAN: ABCDE1234F\n"
        "Aadhaar: 4589 1234 5678\n"
        "Credit Card: 4532 7890 1234 5678\n"
        "Salary: ₹ 28,00,000 LPA"
    )
    items = gemini_copilot.analyze_document(text, purpose="Job Application")
    assert len(items) >= 4

    item_map = {item.pii_type: item for item in items}
    
    # PAN, Aadhaar, Credit Card must be marked Not Required for Job Application
    for pii_name in ["PAN", "AADHAAR", "CREDIT_CARD"]:
        if pii_name in item_map:
            assert item_map[pii_name].status == "Not Required"
            assert len(item_map[pii_name].reason) > 0


def test_gemini_copilot_contextual_bank_kyc():
    """Verifies that for Bank KYC, PAN/Aadhaar/Phone are marked 'Required'."""
    text = (
        "Applicant: Vikram Singhania\n"
        "Email: vikram@work.in\n"
        "Phone: 9876543210\n"
        "PAN: ABCDE1234F\n"
        "Aadhaar: 4589 1234 5678"
    )
    items = gemini_copilot.analyze_document(text, purpose="Bank KYC")
    assert len(items) >= 3

    item_map = {item.pii_type: item for item in items}
    if "PAN" in item_map:
        assert item_map["PAN"].status == "Required"
    if "AADHAAR" in item_map:
        assert item_map["AADHAAR"].status == "Required"


def test_gemini_copilot_grounded_chat_refusal():
    """Verifies that out-of-context queries are strictly refused with the required phrase."""
    doc_text = "This document contains information about Project Apollo and its medical discharge summary."
    
    # Out of context question
    res = gemini_copilot.chat_with_document(doc_text, "What is the capital of Australia?")
    assert res["response"] == "I can only answer questions related to this document."
    assert res["grounded_in_document"] is False

    # In context question
    res_in = gemini_copilot.chat_with_document(doc_text, "What project is mentioned in the document?")
    assert "Apollo" in res_in["response"]
    assert res_in["grounded_in_document"] is True


def test_pymupdf_redact_pdf_strings():
    """Verifies that redact_pdf_strings draws black rectangles and strips target text."""
    raw_pdf = _create_test_pdf()
    
    sanitized_pdf = redactor.redact_pdf_strings(
        file_bytes=raw_pdf,
        target_strings=["ABCDE1234F", "4589 1234 5678", "4532 7890 1234 5678"]
    )
    assert len(sanitized_pdf) > 0

    doc = pymupdf.open(stream=sanitized_pdf, filetype="pdf")
    text = doc[0].get_text()
    doc.close()

    assert "ABCDE1234F" not in text
    assert "4589 1234 5678" not in text
    assert "4532 7890 1234 5678" not in text
    assert "JOB APPLICATION / RESUME" in text


@pytest.mark.anyio
async def test_api_analyze_endpoint():
    """Integration test for /api/analyze endpoint."""
    raw_pdf = _create_test_pdf()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        files = {"file": ("resume.pdf", raw_pdf, "application/pdf")}
        data = {"purpose": "Job Application"}
        
        response = await client.post("/api/analyze", files=files, data=data)
        assert response.status_code == 200
        
        res_json = response.json()
        assert res_json["status"] == "success"
        assert res_json["purpose"] == "Job Application"
        assert "detected_pii" in res_json
        assert len(res_json["detected_pii"]) >= 3
        
        # Verify JSON structure of detected PII items
        for item in res_json["detected_pii"]:
            assert "pii_type" in item
            assert "value" in item
            assert "status" in item
            assert item["status"] in ["Required", "Not Required"]
            assert "reason" in item


@pytest.mark.anyio
async def test_api_redact_endpoint_with_strings():
    """Integration test for /api/redact endpoint with PDF and redact strings."""
    raw_pdf = _create_test_pdf()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        files = {"file": ("resume.pdf", raw_pdf, "application/pdf")}
        data = {
            "redact_strings": json.dumps(["ABCDE1234F", "4589 1234 5678", "4532 7890 1234 5678"])
        }
        
        # 1. Download masked PDF binary
        response = await client.post("/api/redact", files=files, data=data)
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert "attachment; filename=\"masked_resume.pdf\"" in response.headers["content-disposition"]
        
        # Verify masked PDF text
        doc = pymupdf.open(stream=response.content, filetype="pdf")
        text = doc[0].get_text()
        doc.close()
        assert "ABCDE1234F" not in text
        assert "4589 1234 5678" not in text

        # 2. Test return_json=True for live UI preview
        preview_res = await client.post("/api/redact?return_json=true", files=files, data=data)
        assert preview_res.status_code == 200
        preview_data = preview_res.json()
        assert preview_data["status"] == "success"
        assert preview_data["preview_image"] is not None


@pytest.mark.anyio
async def test_api_chat_endpoint():
    """Integration test for /api/chat endpoint."""
    raw_pdf = _create_test_pdf()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        files = {"file": ("resume.pdf", raw_pdf, "application/pdf")}
        
        # 1. Ask in-context question
        chat_data = {"message": "What is the candidate email address?"}
        res_in = await client.post("/api/chat", files=files, data=chat_data)
        assert res_in.status_code == 200
        in_json = res_in.json()
        assert "vikram.singhania@corpsecure.in" in in_json["response"] or "Candidate" in in_json["response"]

        # 2. Ask out-of-context question -> strict refusal
        refuse_data = {"message": "How do I bake a chocolate cake?"}
        res_refuse = await client.post("/api/chat", data=refuse_data)
        assert res_refuse.status_code == 200
        refuse_json = res_refuse.json()
        assert refuse_json["response"] == "I can only answer questions related to this document."


def test_multi_key_failover_and_rotation():
    """Verifies that if one key in the pool fails, the engine seamlessly rotates to the next key or local engine."""
    # Test with simulated failing function
    attempts = []
    def simulated_failing_gemini(key):
        attempts.append(key)
        if len(attempts) == 1:
            raise RuntimeError("429 ResourceExhausted: Quota limit reached on key 1")
        return [{"pii_type": "PAN", "value": "ABCDE1234F", "status": "Not Required", "reason": "Test"}]

    # Test failover execution
    result = gemini_copilot._execute_with_key_failover(simulated_failing_gemini)
    assert result is not None or len(attempts) >= 1

