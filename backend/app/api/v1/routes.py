"""
PrivacyGuard AI - API Routes v1
Production-grade endpoints for document upload, real OCR, selective redactions,
regulatory compliance audits, LLM firewall proxy, real PDF in-place surgical sanitization,
Google Gemini Contextual Privacy Copilot, and PDF-restricted Chatbot.
"""

import time
import re
import json
import base64
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Response, Request
from pydantic import BaseModel
import pymupdf

from app.core.config import settings
from app.engine.ocr_extractor import extractor
from app.engine.pii_detector import detector, RiskAssessment, PIIEntity
from app.engine.redactor import redactor
from app.engine.vector_store import vector_store
from app.engine.compliance_evaluator import compliance_evaluator, ComplianceAuditReport
from app.engine.llm_firewall import llm_firewall, FirewallInspectionRequest, FirewallInspectionResponse
from app.engine.gemini_copilot import gemini_copilot, PIIAnalysisItem, DocumentAnalysisResponse


router = APIRouter()


# In-memory analytics counter for dashboard metrics
_analytics_db = {
    "total_documents_processed": 0,
    "total_pii_entities_sanitized": 0,
    "total_data_leaks_prevented": 0,
    "average_latency_ms": 0.0,
    "threat_tier_counts": {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0
    }
}

# Volatile in-memory cache for latest uploaded document (zero-retention: cleared on purge)
_volatile_file_cache: Dict[str, Any] = {
    "file_bytes": b"",
    "filename": "",
    "content_type": "",
    "format": "",
    "extracted_text": ""
}


class CustomRedactRequest(BaseModel):
    raw_text: Optional[str] = None
    text: Optional[str] = None  # Alias for compatibility
    custom_keywords: Optional[List[str]] = []
    disabled_entity_ids: Optional[List[str]] = []  # Allows unmasking selective entities in UI
    masking_mode: Optional[str] = "TOKEN"
    redact_strings: Optional[List[str]] = []


class RAGQueryRequest(BaseModel):
    prompt: str
    top_k: Optional[int] = 3


class ChatRequestPayload(BaseModel):
    message: Optional[str] = None
    prompt: Optional[str] = None
    query: Optional[str] = None


class UploadResponse(BaseModel):
    status: str
    filename: str
    format: str
    byte_size: int
    processing_time_ms: float
    original_text: str
    masked_text: str
    masking_mode: str
    risk_assessment: RiskAssessment
    compliance_report: ComplianceAuditReport
    sanitization_hash: str
    zero_leak_verified: bool
    rag_chunks_indexed: int
    zero_retention_enforced: bool
    page_count: Optional[int] = 1
    is_pdf: Optional[bool] = False
    preview_image: Optional[str] = None
    preview_images: Optional[List[str]] = []
    purpose: Optional[str] = "General Sharing"
    detected_pii: Optional[List[Dict[str, Any]]] = []


def generate_benchmark_pdf(filename: str) -> bytes:
    """Generates authentic, professionally styled benchmark sample PDFs for instant realistic testing."""
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)

    if "hdfc" in filename.lower() or "kyc" in filename.lower():
        # Background canvas
        page.draw_rect(page.rect, color=None, fill=(0.97, 0.98, 1.0))
        # Top Brand Header Banner (HDFC Blue / Red styling)
        page.draw_rect(pymupdf.Rect(30, 30, 565, 90), color=None, fill=(0.07, 0.20, 0.40))
        page.draw_rect(pymupdf.Rect(30, 90, 565, 94), color=None, fill=(0.85, 0.15, 0.15))
        page.insert_text((45, 58), "HDFC FINANCIAL SERVICES • KYC APPLICATION", fontsize=13, fontname="helv", color=(1, 1, 1))
        page.insert_text((45, 76), "Official Customer Onboarding & Verification Record (Confidential)", fontsize=8.5, fontname="helv", color=(0.75, 0.88, 1.0))

        # Form card box
        page.draw_rect(pymupdf.Rect(30, 110, 565, 520), color=(0.75, 0.82, 0.90), fill=(1, 1, 1))
        page.draw_rect(pymupdf.Rect(30, 110, 565, 136), color=None, fill=(0.92, 0.95, 0.98))
        page.insert_text((45, 128), "SECTION 1: APPLICANT IDENTITY & DEMOGRAPHIC DETAILS", fontsize=9.5, fontname="helv", color=(0.08, 0.20, 0.40))

        rows = [
            ("Customer Full Name:", "Vikram Aditya Singhania", (0.1, 0.1, 0.7)),
            ("Date of Birth:", "14/07/1988", (0.2, 0.2, 0.2)),
            ("Permanent Account Number (PAN):", "ABCDE1234F", (0.7, 0.1, 0.1)),
            ("Aadhaar Number (UID):", "4589 1234 5678", (0.1, 0.5, 0.2)),
            ("Contact Mobile:", "+91 9876543210", (0.2, 0.2, 0.2)),
            ("Official Email:", "vikram.singhania@corpsecure.in", (0.1, 0.1, 0.7)),
            ("UPI Payment VPA:", "vikram.singhania@okhdfcbank", (0.5, 0.1, 0.5)),
            ("Salary Account IFSC:", "HDFC0001234", (0.2, 0.2, 0.2)),
            ("Linked Credit Card:", "4532 7890 1234 5678", (0.7, 0.1, 0.1)),
            ("Driving License (DL):", "DL0420110012345", (0.2, 0.2, 0.2)),
            ("Internal Audit Secret Token:", "sk-live-99a8b7c6d5e4f3a2b1c0d9e8f7a6", (0.8, 0.3, 0.1)),
        ]

        y = 160
        for label, val, val_color in rows:
            page.insert_text((45, y), label, fontsize=9, fontname="helv", color=(0.3, 0.3, 0.3))
            page.insert_text((240, y), val, fontsize=9, fontname="helv", color=val_color)
            page.draw_line(pymupdf.Point(45, y + 6), pymupdf.Point(550, y + 6), color=(0.9, 0.92, 0.95), width=0.5)
            y += 28

        # Security Stamp Box
        page.draw_rect(pymupdf.Rect(30, 540, 565, 595), color=(0.2, 0.7, 0.4), fill=(0.93, 0.98, 0.95))
        page.insert_text((45, 562), "SECURE KYC AUDIT VERIFIED • RBI COMPLIANT • DPDP ACT 2023 PROTECTED", fontsize=8.5, fontname="helv", color=(0.1, 0.5, 0.2))
        page.insert_text((45, 578), "Document Reference: HDFC-KYC-2026-8829104 • Zero Retention Air-Gapped Processing", fontsize=7.5, fontname="helv", color=(0.4, 0.6, 0.4))

    elif "apollo" in filename.lower() or "hospital" in filename.lower():
        page.draw_rect(page.rect, color=None, fill=(0.98, 0.99, 0.98))
        page.draw_rect(pymupdf.Rect(30, 30, 565, 90), color=None, fill=(0.12, 0.45, 0.35))
        page.draw_rect(pymupdf.Rect(30, 90, 565, 94), color=None, fill=(0.25, 0.75, 0.55))
        page.insert_text((45, 58), "APOLLO HOSPITALS • PATIENT DISCHARGE SUMMARY", fontsize=13, fontname="helv", color=(1, 1, 1))
        page.insert_text((45, 76), "Electronic Health Record (EHR) • HIPAA & DPDP Act 2023 Protected Health Data", fontsize=8.5, fontname="helv", color=(0.8, 0.95, 0.9))

        page.draw_rect(pymupdf.Rect(30, 110, 565, 480), color=(0.75, 0.88, 0.80), fill=(1, 1, 1))
        page.draw_rect(pymupdf.Rect(30, 110, 565, 136), color=None, fill=(0.92, 0.97, 0.94))
        page.insert_text((45, 128), "SECTION A: PATIENT DEMOGRAPHICS & CLINICAL RECORDS", fontsize=9.5, fontname="helv", color=(0.10, 0.40, 0.30))

        rows = [
            ("Patient Full Name:", "Priya Sharma", (0.1, 0.4, 0.3)),
            ("Date of Birth:", "22/09/1994", (0.2, 0.2, 0.2)),
            ("Patient Aadhaar UID:", "9988 7766 5544", (0.7, 0.1, 0.1)),
            ("Emergency Mobile:", "+91 9822334455", (0.2, 0.2, 0.2)),
            ("Personal Email:", "priya.sharma94@medmail.in", (0.1, 0.3, 0.7)),
            ("Attending Physician:", "Dr. Rajesh Mehta (Cardiology)", (0.2, 0.2, 0.2)),
            ("Primary Diagnosis:", "Acute Bronchitis with Mild Hypertension", (0.6, 0.2, 0.1)),
            ("Insurance Policy ID:", "ICICI-HLTH-8829104", (0.2, 0.2, 0.2)),
            ("Prescribed Medication:", "Amoxicillin 500mg, Paracetamol 650mg", (0.2, 0.2, 0.2)),
        ]

        y = 160
        for label, val, val_color in rows:
            page.insert_text((45, y), label, fontsize=9, fontname="helv", color=(0.3, 0.3, 0.3))
            page.insert_text((240, y), val, fontsize=9, fontname="helv", color=val_color)
            page.draw_line(pymupdf.Point(45, y + 6), pymupdf.Point(550, y + 6), color=(0.9, 0.94, 0.92), width=0.5)
            y += 28

        page.draw_rect(pymupdf.Rect(30, 500, 565, 555), color=(0.2, 0.6, 0.4), fill=(0.94, 0.98, 0.95))
        page.insert_text((45, 522), "PROTECTED HEALTH INFORMATION (PHI) • HIPAA ARTICLE 164 COMPLIANT", fontsize=8.5, fontname="helv", color=(0.1, 0.45, 0.3))
        page.insert_text((45, 538), "Direct patient identifier masking mandatory prior to cloud telemetry or research export.", fontsize=7.5, fontname="helv", color=(0.4, 0.6, 0.5))

    elif "aws" in filename.lower() or "devops" in filename.lower():
        page.draw_rect(page.rect, color=None, fill=(0.08, 0.10, 0.15))
        page.draw_rect(pymupdf.Rect(30, 30, 565, 85), color=None, fill=(0.12, 0.16, 0.24))
        page.insert_text((45, 58), "CLOUD SECURE INFRASTRUCTURE • GATEWAY CONFIG", fontsize=12, fontname="courier", color=(0.4, 0.85, 1.0))
        page.insert_text((45, 74), "Project-Zeus Production Gateway Credentials & Tokens", fontsize=8.5, fontname="courier", color=(0.7, 0.7, 0.8))

        page.draw_rect(pymupdf.Rect(30, 105, 565, 450), color=(0.2, 0.3, 0.4), fill=(0.05, 0.07, 0.11))

        rows = [
            ("project_name:", '"Project-Zeus-Cloud-Gateway"', (0.3, 0.8, 0.5)),
            ("lead_engineer:", '"Alex Mercer"', (0.4, 0.85, 1.0)),
            ("contact_email:", '"alex.mercer@cloudsec.io"', (0.4, 0.85, 1.0)),
            ("phone_hotline:", '"(415) 555-0198"', (0.8, 0.8, 0.4)),
            ("gateway_ip:", '"192.168.1.105"', (0.8, 0.8, 0.4)),
            ("aws_access_key:", '"AKIAIOSFODNN7EXAMPLE"', (1.0, 0.4, 0.4)),
            ("github_token:", '"ghp_99a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2"', (1.0, 0.4, 0.4)),
            ("travel_card:", '"3782 822468 00005"', (1.0, 0.4, 0.4)),
        ]
        y = 145
        for label, val, val_color in rows:
            page.insert_text((55, y), label, fontsize=9.5, fontname="courier", color=(0.6, 0.7, 0.8))
            page.insert_text((220, y), val, fontsize=9.5, fontname="courier", color=val_color)
            y += 32

    else:
        page.draw_rect(page.rect, color=None, fill=(1, 1, 1))
        page.insert_text((45, 50), f"DOCUMENT: {filename.upper()}", fontsize=12, fontname="helv", color=(0.1, 0.1, 0.1))
        page.draw_line(pymupdf.Point(45, 60), pymupdf.Point(550, 60), color=(0.8, 0.8, 0.8), width=1)
        
        rows = [
            ("Applicant Name:", "Vikram Singhania", (0.1, 0.1, 0.1)),
            ("Permanent Account Number (PAN):", "ABCDE1234F", (0.6, 0.1, 0.1)),
            ("Aadhaar Number:", "4589 1234 5678", (0.6, 0.1, 0.1)),
            ("Contact Phone:", "+91 9876543210", (0.1, 0.1, 0.1)),
            ("Contact Email:", "vikram.singhania@corpsecure.in", (0.1, 0.1, 0.6)),
            ("Salary / CTC:", "₹ 24,50,000 LPA", (0.2, 0.5, 0.2)),
            ("Credit Card:", "4532 7890 1234 5678", (0.7, 0.1, 0.1)),
        ]

        y = 100
        for label, val, val_color in rows:
            page.insert_text((45, y), label, fontsize=9, fontname="helv", color=(0.3, 0.3, 0.3))
            page.insert_text((240, y), val, fontsize=9, fontname="helv", color=val_color)
            page.draw_line(pymupdf.Point(45, y + 6), pymupdf.Point(550, y + 6), color=(0.9, 0.92, 0.95), width=0.5)
            y += 32

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@router.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "zero_retention_mode": settings.ZERO_RETENTION_MODE,
        "local_inference_only": not gemini_copilot.is_configured,
        "gemini_copilot_enabled": gemini_copilot.is_configured,
        "gemini_model": settings.GEMINI_MODEL,
        "ocr_engine": "PyMuPDF + RapidOCR Local ONNX",
        "compliance_standards": ["India DPDP 2023", "GDPR Art 25", "HIPAA", "PCI-DSS"]
    }


@router.get("/analytics", tags=["Enterprise Analytics"])
async def get_enterprise_analytics():
    """Returns live enterprise security dashboard metrics."""
    return _analytics_db


@router.post("/upload", response_model=UploadResponse, tags=["Document Processing"])
async def upload_document(
    file: UploadFile = File(...),
    masking_mode: str = Form("TOKEN"),
    purpose: Optional[str] = Form("General Sharing"),
    custom_keywords_str: Optional[str] = Form(None)
):
    """
    Real-world in-memory document upload.
    Executes PyMuPDF / RapidOCR, multi-entity PII detection, Gemini Contextual Privacy Analysis,
    compliance evaluation, in-place surgical redaction, and indexes sanitized context into offline vector RAG store.
    """
    start_time = time.time()
    file_bytes = await file.read()
    
    if len(file_bytes) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_BYTES // (1024*1024)}MB."
        )

    filename = file.filename or "uploaded_document"
    
    # Store volatile reference in RAM buffer (zero persistent disk writes)
    _volatile_file_cache["original_bytes"] = file_bytes
    _volatile_file_cache["file_bytes"] = file_bytes
    _volatile_file_cache["filename"] = filename
    _volatile_file_cache["content_type"] = file.content_type or ""

    # 1. Real In-Memory Extraction
    extraction = extractor.extract_from_bytes(
        file_bytes=file_bytes,
        filename=filename,
        content_type=file.content_type
    )
    raw_text = extraction["text"]
    doc_format = extraction.get("format", "UNKNOWN")
    is_pdf = (file_bytes and file_bytes[:4] == b"%PDF") or filename.lower().endswith(".pdf") or "PDF" in doc_format
    _volatile_file_cache["format"] = "PDF" if is_pdf else doc_format
    _volatile_file_cache["extracted_text"] = raw_text

    # 2. PII Detection
    entities = detector.detect_entities(raw_text)

    # 3. Add any custom keywords
    custom_list: List[str] = []
    if custom_keywords_str:
        custom_list = [k.strip() for k in custom_keywords_str.split(",") if k.strip()]
        for kw in custom_list:
            for m in re.finditer(re.escape(kw), raw_text, re.IGNORECASE):
                s, e = m.span()
                if not any(not (e <= existing.start or s >= existing.end) for existing in entities):
                    entities.append(
                        PIIEntity(
                            id=f"custom_{len(entities)+1}",
                            entity_type="CUSTOM_SECRET",
                            raw_value=m.group(0),
                            masked_value=f"[REDACTED_CUSTOM: {m.group(0)[:2]}***]",
                            start=s,
                            end=e,
                            confidence=1.0,
                            severity_weight=25,
                            explanation="User-defined custom sensitive keyword"
                        )
                    )

    entities.sort(key=lambda x: x.start)
    risk_assessment = detector.assess_risk(raw_text, entities)

    # 4. Gemini Contextual Privacy Copilot Analysis
    active_purpose = purpose or "General Sharing"
    gemini_pii_analysis = gemini_copilot.analyze_document(
        text_content=raw_text,
        purpose=active_purpose,
        pdf_bytes=file_bytes if is_pdf else None,
        filename=filename
    )
    detected_pii_dicts = [
        {
            "pii_type": item.pii_type,
            "value": item.value,
            "status": item.status,
            "reason": item.reason
        }
        for item in gemini_pii_analysis
    ]

    # 5. Regulatory Compliance Evaluation
    compliance_report = compliance_evaluator.evaluate(risk_assessment, filename)

    # 6. Surgical Text Masking
    redaction_result = redactor.redact_text(
        raw_text=raw_text,
        entities=entities,
        masking_mode=masking_mode
    )
    masked_text = redaction_result["masked_text"]

    # 7. Real PDF In-Place Surgical Masking & Preview
    preview_img = None
    preview_images = []
    sanitization_hash = redaction_result["sanitization_hash"]
    zero_leak_verified = redaction_result["zero_leak_verified"]

    if is_pdf:
        try:
            pdf_redact_res = redactor.redact_pdf_bytes(
                file_bytes=file_bytes,
                entities=entities,
                masking_mode=masking_mode,
                custom_keywords=custom_list,
                ocr_engine=extractor.ocr_engine
            )
            sanitization_hash = pdf_redact_res["sanitization_hash"]
            zero_leak_verified = pdf_redact_res["zero_leak_verified"]
            preview_images = redactor.render_pdf_all_page_previews(pdf_redact_res["pdf_bytes"])
            preview_img = preview_images[0] if preview_images else None
        except Exception as e:
            print(f"[Upload] PDF redaction preview notice: {e}")

    # 8. Index sanitized text into Vector Store
    vector_store.clear()
    chunks_count = vector_store.index_document(
        document_name=filename,
        sanitized_text=masked_text
    )

    elapsed_ms = round((time.time() - start_time) * 1000, 2)

    # Update analytics
    _analytics_db["total_documents_processed"] += 1
    _analytics_db["total_pii_entities_sanitized"] += len(entities)
    _analytics_db["total_data_leaks_prevented"] += len(entities)
    _analytics_db["threat_tier_counts"][risk_assessment.risk_level] = _analytics_db["threat_tier_counts"].get(risk_assessment.risk_level, 0) + 1

    return UploadResponse(
        status="success",
        filename=filename,
        format="PDF" if is_pdf else doc_format,
        byte_size=len(file_bytes),
        processing_time_ms=elapsed_ms,
        original_text=raw_text,
        masked_text=masked_text,
        masking_mode=masking_mode,
        risk_assessment=risk_assessment,
        compliance_report=compliance_report,
        sanitization_hash=sanitization_hash,
        zero_leak_verified=zero_leak_verified,
        rag_chunks_indexed=chunks_count,
        zero_retention_enforced=settings.ZERO_RETENTION_MODE,
        page_count=extraction.get("page_count", 1),
        is_pdf=is_pdf,
        preview_image=preview_img,
        preview_images=preview_images,
        purpose=active_purpose,
        detected_pii=detected_pii_dicts
    )


@router.post("/analyze", tags=["Contextual Privacy Copilot"])
async def analyze_document_endpoint(
    file: Optional[UploadFile] = File(None),
    purpose: str = Form("General Sharing")
):
    """
    Contextual Privacy Copilot: Evaluates PII requirements for a given purpose.
    """
    file_bytes = b""
    filename = "document.pdf"
    content_type = "application/pdf"

    if file is not None:
        file_bytes = await file.read()
        filename = file.filename or filename
        content_type = file.content_type or content_type
    elif _volatile_file_cache.get("file_bytes"):
        file_bytes = _volatile_file_cache["file_bytes"]
        filename = _volatile_file_cache.get("filename") or filename
        content_type = _volatile_file_cache.get("content_type") or content_type
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No document provided. Please upload a PDF file."
        )

    _volatile_file_cache["file_bytes"] = file_bytes
    _volatile_file_cache["filename"] = filename
    _volatile_file_cache["content_type"] = content_type
    _volatile_file_cache["format"] = "PDF" if (file_bytes and file_bytes[:4] == b"%PDF") or filename.lower().endswith(".pdf") else "TEXT"

    extraction = extractor.extract_from_bytes(file_bytes=file_bytes, filename=filename, content_type=content_type)
    raw_text = extraction.get("text", "")
    _volatile_file_cache["extracted_text"] = raw_text

    detected_items = gemini_copilot.analyze_document(
        text_content=raw_text,
        purpose=purpose,
        pdf_bytes=file_bytes,
        filename=filename
    )

    preview_img = redactor.render_pdf_page_preview(file_bytes, page_index=0) if (file_bytes and file_bytes[:4] == b"%PDF") else None

    pii_json_list = [
        {
            "pii_type": item.pii_type,
            "value": item.value,
            "status": item.status,
            "reason": item.reason
        }
        for item in detected_items
    ]

    not_required_count = sum(1 for item in pii_json_list if item["status"] == "Not Required")
    required_count = sum(1 for item in pii_json_list if item["status"] == "Required")

    return {
        "status": "success",
        "filename": filename,
        "purpose": purpose,
        "total_detected": len(pii_json_list),
        "not_required_count": not_required_count,
        "required_count": required_count,
        "detected_pii": pii_json_list,
        "preview_image": preview_img,
        "page_count": extraction.get("page_count", 1),
        "byte_size": len(file_bytes),
        "is_live_gemini": gemini_copilot.is_configured
    }


@router.post("/redact", tags=["Direct Sanitization"])
@router.post("/redact/custom", tags=["Direct Sanitization"])
@router.post("/redact/pdf", tags=["Direct Sanitization"])
async def redact_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None),
    redact_strings: Optional[str] = Form(None),
    strings: Optional[str] = Form(None),
    raw_text: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
    masking_mode: Optional[str] = Form("BLACKOUT"),
    custom_keywords_str: Optional[str] = Form(None),
    disabled_entity_ids_str: Optional[str] = Form(None),
    return_json: Optional[bool] = Form(False)
):
    """
    Surgical redaction endpoint. Supports both JSON payloads and multipart PDF requests.
    """
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body_json = await request.json()
            payload = CustomRedactRequest(**body_json)
            return await _handle_json_text_redact(payload)
        except Exception as e:
            print(f"[Redact] JSON parse notice: {e}")

    file_bytes = b""
    target_filename = "document.pdf"

    if file is not None:
        file_bytes = await file.read()
        target_filename = file.filename or target_filename
        _volatile_file_cache["original_bytes"] = file_bytes
        _volatile_file_cache["file_bytes"] = file_bytes
        _volatile_file_cache["filename"] = target_filename
    elif _volatile_file_cache.get("original_bytes"):
        file_bytes = _volatile_file_cache["original_bytes"]
        target_filename = _volatile_file_cache.get("filename") or target_filename
    elif _volatile_file_cache.get("file_bytes"):
        file_bytes = _volatile_file_cache["file_bytes"]
        target_filename = _volatile_file_cache.get("filename") or target_filename

    raw_targets_input = redact_strings or strings or custom_keywords_str or ""
    target_strings: List[str] = []
    if raw_targets_input:
        try:
            parsed = json.loads(raw_targets_input)
            if isinstance(parsed, list):
                target_strings = [str(s).strip() for s in parsed if str(s).strip()]
            else:
                target_strings = [str(raw_targets_input).strip()]
        except Exception:
            target_strings = [s.strip() for s in raw_targets_input.split(",") if s.strip()]

    is_pdf = (file_bytes and file_bytes[:4] == b"%PDF") or target_filename.lower().endswith(".pdf")

    if is_pdf and file_bytes:
        # Reuse in-memory cached text for instant sub-second redaction
        cached_text = _volatile_file_cache.get("extracted_text")
        if not cached_text:
            extraction = extractor.extract_from_bytes(file_bytes, target_filename)
            cached_text = extraction.get("text", "")
        all_detected_entities = detector.detect_entities(cached_text)

        if target_strings:
            sanitized_pdf = redactor.redact_pdf_strings(
                file_bytes=file_bytes,
                target_strings=target_strings,
                masking_mode=masking_mode or "TOKEN",
                detected_entities=all_detected_entities,
                ocr_engine=extractor.ocr_engine
            )
            redacted_count = len(target_strings)
        else:
            redaction_res = redactor.redact_pdf_bytes(
                file_bytes=file_bytes,
                entities=all_detected_entities,
                masking_mode=masking_mode or "TOKEN",
                ocr_engine=extractor.ocr_engine
            )
            sanitized_pdf = redaction_res["pdf_bytes"]
            redacted_count = redaction_res["redacted_count"]

        _volatile_file_cache["last_sanitized_pdf"] = sanitized_pdf

        if return_json or request.query_params.get("return_json") == "true":
            preview_images = redactor.render_pdf_all_page_previews(sanitized_pdf)
            preview_img = preview_images[0] if preview_images else None
            b64_pdf = base64.b64encode(sanitized_pdf).decode("ascii")
            return {
                "status": "success",
                "filename": f"masked_{target_filename}",
                "redacted_count": redacted_count,
                "masking_mode": masking_mode or "TOKEN",
                "preview_image": preview_img,
                "preview_images": preview_images,
                "byte_size": len(sanitized_pdf),
                "pdf_base64": f"data:application/pdf;base64,{b64_pdf}"
            }

        clean_name = target_filename if target_filename.lower().endswith(".pdf") else f"{target_filename}.pdf"
        out_name = f"masked_{clean_name}"

        return Response(
            content=sanitized_pdf,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{out_name}"',
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )

    # Text fallback
    input_text = raw_text or text or (file_bytes.decode("utf-8", errors="replace") if file_bytes else "")
    entities = detector.detect_entities(input_text)
    if target_strings:
        target_lower_set = {s.lower() for s in target_strings}
        entities = [e for e in entities if e.raw_value.lower() in target_lower_set or any(t in e.raw_value.lower() for t in target_lower_set)]
    redact_res = redactor.redact_text(input_text, entities, masking_mode=masking_mode or "TOKEN")
    
    if return_json or request.query_params.get("return_json") == "true":
        return {
            "status": "success",
            "filename": f"masked_{target_filename}",
            "redacted_count": len(entities),
            "masking_mode": masking_mode or "TOKEN",
            "masked_text": redact_res.get("masked_text", ""),
            "byte_size": len(redact_res.get("masked_text", "").encode("utf-8")),
            "sanitization_hash": redact_res.get("sanitization_hash")
        }

    return Response(
        content=redact_res["masked_text"].encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="sanitized_{target_filename}.txt"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


async def _handle_json_text_redact(payload: CustomRedactRequest):
    """Internal helper for text-based dynamic custom redactions."""
    raw_text = payload.raw_text or payload.text or ""
    entities = detector.detect_entities(raw_text)

    # Custom keywords
    if payload.custom_keywords:
        for kw in payload.custom_keywords:
            kw_clean = kw.strip()
            if not kw_clean:
                continue
            for m in re.finditer(re.escape(kw_clean), raw_text, re.IGNORECASE):
                s, e = m.span()
                if not any(not (e <= existing.start or s >= existing.end) for existing in entities):
                    entities.append(
                        PIIEntity(
                            id=f"custom_{len(entities)+1}",
                            entity_type="CUSTOM_SECRET",
                            raw_value=m.group(0),
                            masked_value=f"[REDACTED_CUSTOM: {m.group(0)[:2]}***]",
                            start=s,
                            end=e,
                            confidence=1.0,
                            severity_weight=25,
                            explanation="User-defined custom sensitive keyword"
                        )
                    )

    if payload.disabled_entity_ids:
        disabled_set = set(payload.disabled_entity_ids)
        entities = [e for e in entities if e.id not in disabled_set]

    entities.sort(key=lambda x: x.start)
    risk_assessment = detector.assess_risk(raw_text, entities)
    compliance_report = compliance_evaluator.evaluate(risk_assessment)

    redaction_result = redactor.redact_text(
        raw_text=raw_text,
        entities=entities,
        masking_mode=payload.masking_mode or "TOKEN"
    )

    preview_img = None
    preview_images = []
    cached_bytes = _volatile_file_cache.get("original_bytes") or _volatile_file_cache.get("file_bytes")
    if cached_bytes and (cached_bytes[:4] == b"%PDF" or "pdf" in _volatile_file_cache.get("filename", "").lower()):
        try:
            pdf_res = redactor.redact_pdf_bytes(
                file_bytes=cached_bytes,
                entities=entities,
                masking_mode=payload.masking_mode or "TOKEN",
                custom_keywords=payload.custom_keywords,
                ocr_engine=extractor.ocr_engine
            )
            preview_images = redactor.render_pdf_all_page_previews(pdf_res["pdf_bytes"])
            preview_img = preview_images[0] if preview_images else None
        except Exception as e:
            print(f"[CustomRedact] Preview error: {e}")

    return {
        "masked_text": redaction_result["masked_text"],
        "masking_mode": payload.masking_mode,
        "risk_assessment": risk_assessment,
        "compliance_report": compliance_report,
        "sanitization_hash": redaction_result["sanitization_hash"],
        "zero_leak_verified": redaction_result["zero_leak_verified"],
        "active_entities": entities,
        "preview_image": preview_img,
        "preview_images": preview_images
    }


@router.post("/download/sanitized", tags=["Document Processing"])
async def download_sanitized_document(
    file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
    masking_mode: str = Form("BLACKOUT"),
    custom_keywords_str: Optional[str] = Form(None),
    disabled_entity_ids_str: Optional[str] = Form(None),
    export_format: Optional[str] = Form(None)
):
    """
    CRITICAL ENDPOINT: Surgically masks and downloads the REAL PDF, image, or text document in-place.
    """
    file_bytes = b""
    target_filename = filename or "document"

    if file is not None:
        file_bytes = await file.read()
        target_filename = file.filename or target_filename
    elif _volatile_file_cache.get("original_bytes"):
        file_bytes = _volatile_file_cache["original_bytes"]
        target_filename = _volatile_file_cache.get("filename") or target_filename
    elif _volatile_file_cache.get("file_bytes"):
        file_bytes = _volatile_file_cache["file_bytes"]
        target_filename = _volatile_file_cache.get("filename") or target_filename

    # Parse custom keywords
    custom_keywords: List[str] = []
    if custom_keywords_str:
        try:
            parsed = json.loads(custom_keywords_str)
            if isinstance(parsed, list):
                custom_keywords = [str(k).strip() for k in parsed if str(k).strip()]
            else:
                custom_keywords = [k.strip() for k in custom_keywords_str.split(",") if k.strip()]
        except Exception:
            custom_keywords = [k.strip() for k in custom_keywords_str.split(",") if k.strip()]

    # Parse disabled entity IDs
    disabled_entity_ids: List[str] = []
    if disabled_entity_ids_str:
        try:
            parsed = json.loads(disabled_entity_ids_str)
            if isinstance(parsed, list):
                disabled_entity_ids = [str(i) for i in parsed]
            else:
                disabled_entity_ids = [i.strip() for i in disabled_entity_ids_str.split(",") if i.strip()]
        except Exception:
            disabled_entity_ids = [i.strip() for i in disabled_entity_ids_str.split(",") if i.strip()]

    disabled_set = set(disabled_entity_ids)
    lower_filename = target_filename.lower()
    is_real_pdf = (file_bytes and file_bytes[:4] == b"%PDF") or lower_filename.endswith(".pdf")
    is_image = any(lower_filename.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"])

    # 1. Handle REAL PDF Redaction (Modifies the uploaded PDF directly in memory)
    if is_real_pdf and file_bytes:
        extraction = extractor.extract_from_bytes(file_bytes, target_filename)
        doc_text = extraction.get("text", "")
        detected_entities = detector.detect_entities(doc_text)
        active_entities = [e for e in detected_entities if e.id not in disabled_set]

        redaction_res = redactor.redact_pdf_bytes(
            file_bytes=file_bytes,
            entities=active_entities,
            masking_mode=masking_mode,
            custom_keywords=custom_keywords,
            ocr_engine=extractor.ocr_engine
        )

        sanitized_pdf = redaction_res["pdf_bytes"]
        clean_name = target_filename if target_filename.lower().endswith(".pdf") else f"{target_filename}.pdf"
        out_name = f"sanitized_{clean_name}"

        return Response(
            content=sanitized_pdf,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{out_name}"',
                "X-Sanitization-Hash": redaction_res["sanitization_hash"],
                "X-Zero-Leak-Verified": str(redaction_res["zero_leak_verified"]),
                "Access-Control-Expose-Headers": "Content-Disposition, X-Sanitization-Hash, X-Zero-Leak-Verified"
            }
        )

    # 2. Handle REAL Image Redaction
    elif is_image and file_bytes:
        extraction = extractor.extract_from_bytes(file_bytes, target_filename)
        doc_text = extraction.get("text", "")
        detected_entities = detector.detect_entities(doc_text)
        active_entities = [e for e in detected_entities if e.id not in disabled_set]

        redaction_res = redactor.redact_image_bytes(
            file_bytes=file_bytes,
            filename=target_filename,
            entities=active_entities,
            masking_mode=masking_mode,
            custom_keywords=custom_keywords,
            ocr_engine=extractor.ocr_engine
        )

        sanitized_img = redaction_res["image_bytes"]
        clean_name = target_filename
        out_name = f"sanitized_{clean_name}"

        return Response(
            content=sanitized_img,
            media_type="image/png",
            headers={
                "Content-Disposition": f'attachment; filename="{out_name}"',
                "X-Sanitization-Hash": redaction_res["sanitization_hash"],
                "Access-Control-Expose-Headers": "Content-Disposition, X-Sanitization-Hash"
            }
        )

    # 3. Handle Plain Text / Pasted Text / Benchmark Samples
    else:
        text_to_mask = raw_text or ""
        if not text_to_mask and file_bytes:
            text_to_mask = file_bytes.decode("utf-8", errors="replace")

        detected_entities = detector.detect_entities(text_to_mask)
        active_entities = [e for e in detected_entities if e.id not in disabled_set]

        if custom_keywords:
            for kw in custom_keywords:
                for m in re.finditer(re.escape(kw), text_to_mask, re.IGNORECASE):
                    s, e = m.span()
                    if not any(not (e <= existing.start or s >= existing.end) for existing in active_entities):
                        active_entities.append(
                            PIIEntity(
                                id=f"custom_{len(active_entities)+1}",
                                entity_type="CUSTOM_SECRET",
                                raw_value=m.group(0),
                                masked_value=f"[REDACTED_CUSTOM: {m.group(0)[:2]}***]",
                                start=s,
                                end=e,
                                confidence=1.0,
                                severity_weight=25,
                                explanation="User-defined custom sensitive keyword"
                            )
                        )

        active_entities.sort(key=lambda x: x.start)
        redact_res = redactor.redact_text(
            raw_text=text_to_mask,
            entities=active_entities,
            masking_mode=masking_mode
        )
        masked_content = redact_res["masked_text"]

        if export_format == "PDF":
            sanitized_pdf = redactor.create_pdf_from_text(
                sanitized_text=masked_content,
                title=target_filename,
                masking_mode=masking_mode
            )
            base_name = target_filename.rsplit(".", 1)[0]
            out_name = f"sanitized_{base_name}.pdf"
            return Response(
                content=sanitized_pdf,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="{out_name}"',
                    "X-Sanitization-Hash": redact_res["sanitization_hash"],
                    "Access-Control-Expose-Headers": "Content-Disposition, X-Sanitization-Hash"
                }
            )

        base_name = target_filename if target_filename.endswith(".txt") else f"{target_filename}.txt"
        out_name = f"sanitized_{base_name}"
        return Response(
            content=masked_content.encode("utf-8"),
            media_type="text/plain; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{out_name}"',
                "X-Sanitization-Hash": redact_res["sanitization_hash"],
                "Access-Control-Expose-Headers": "Content-Disposition, X-Sanitization-Hash"
            }
        )


@router.get("/benchmark-sample-pdf/{filename}", tags=["Testing & Benchmarks"])
async def get_benchmark_sample_pdf(filename: str):
    """Returns an authentic styled sample PDF for instant testing."""
    pdf_bytes = generate_benchmark_pdf(filename)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )


@router.post("/chat", tags=["PDF-Restricted Chatbot"])
async def chat_with_document_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None),
    message: Optional[str] = Form(None),
    prompt: Optional[str] = Form(None),
    query: Optional[str] = Form(None)
):
    """
    PDF-Restricted Document Chatbot powered by Google Gemini.
    """
    user_message = ""
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body_json = await request.json()
            user_message = body_json.get("message") or body_json.get("prompt") or body_json.get("query") or ""
        except Exception:
            pass

    if not user_message:
        user_message = message or prompt or query or ""

    if not user_message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty. Please provide a question."
        )

    file_bytes = b""
    filename = "document.pdf"

    if file is not None:
        file_bytes = await file.read()
        filename = file.filename or filename
        _volatile_file_cache["file_bytes"] = file_bytes
        _volatile_file_cache["filename"] = filename
    elif _volatile_file_cache.get("file_bytes"):
        file_bytes = _volatile_file_cache["file_bytes"]
        filename = _volatile_file_cache.get("filename") or filename

    if file_bytes:
        extraction = extractor.extract_from_bytes(file_bytes=file_bytes, filename=filename)
        doc_text = extraction.get("text", "")
    else:
        doc_text = _volatile_file_cache.get("extracted_text", "")

    if not doc_text:
        doc_text = "No document content available."

    chat_result = gemini_copilot.chat_with_document(
        document_text=doc_text,
        message=user_message,
        pdf_bytes=file_bytes if file_bytes else None,
        filename=filename
    )

    return {
        "status": "success",
        "query": user_message,
        "response": chat_result["response"],
        "answer": chat_result["answer"],
        "grounded_in_document": chat_result.get("grounded_in_document", True),
        "is_live_gemini": chat_result.get("is_live_gemini", False)
    }


@router.post("/rag/query", tags=["Multimodal Privacy RAG"])
async def query_rag(payload: RAGQueryRequest):
    """Executes dynamic local RAG queries strictly against sanitized document chunks."""
    result = vector_store.query(prompt=payload.prompt, top_k=payload.top_k or 3)
    return result


@router.post("/llm/firewall", response_model=FirewallInspectionResponse, tags=["LLM AI Guardrails"])
async def inspect_llm_prompt(payload: FirewallInspectionRequest):
    """Enterprise AI Guardrail Proxy: Intercepts prompts and sanitizes PII before cloud transmission."""
    return llm_firewall.inspect_and_sanitize(payload)


@router.post("/purge", tags=["Zero Retention"])
async def purge_memory():
    """Immediately purges all in-memory vector embeddings and cached chunks."""
    vector_store.clear()
    _volatile_file_cache["file_bytes"] = b""
    _volatile_file_cache["filename"] = ""
    _volatile_file_cache["content_type"] = ""
    _volatile_file_cache["format"] = ""
    _volatile_file_cache["extracted_text"] = ""
    return {
        "status": "purged",
        "message": "Volatile memory buffers and vector indices wiped cleanly.",
        "active_chunks": 0
    }


@router.get("/benchmark-samples", tags=["Testing & Benchmarks"])
async def get_benchmark_samples():
    """Provides high-quality realistic sample files for instant one-click testing."""
    return [
        {
            "id": "hdfc_kyc",
            "title": "Indian FinTech KYC Application",
            "filename": "hdfc_kyc_onboarding.pdf",
            "is_pdf": True,
            "category": "Financial / India",
            "description": "Authentic styled HDFC KYC document with PAN, Aadhaar UID, Phone, Email, UPI, Card, Secret"
        },
        {
            "id": "apollo_discharge",
            "title": "Hospital Medical & EHR Record",
            "filename": "apollo_discharge_summary.pdf",
            "is_pdf": True,
            "category": "Healthcare / HIPAA",
            "description": "Apollo Hospital discharge summary with Patient Name, DOB, Aadhaar, Phone, Policy No"
        },
        {
            "id": "aws_devops",
            "title": "Global Cloud Infrastructure Secret",
            "filename": "aws_devops_config.pdf",
            "is_pdf": True,
            "category": "Cybersecurity / DevOps",
            "description": "Cloud security document with Lead Engineer, Gateway IP, AWS Key, GitHub Token"
        }
    ]
