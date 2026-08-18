"""
Unit tests for PrivacyGuard AI PII Detection and Redaction Engines.
"""

import pytest
from app.engine.pii_detector import PIIDetectorEngine
from app.engine.redactor import RedactionEngine


@pytest.fixture
def detector():
    return PIIDetectorEngine()


@pytest.fixture
def redactor():
    return RedactionEngine()


def test_pan_card_detection(detector):
    text = "The applicant PAN number is ABCDE1234F for verification."
    entities = detector.detect_entities(text)
    assert len(entities) == 1
    assert entities[0].entity_type == "PAN"
    assert entities[0].raw_value == "ABCDE1234F"
    assert entities[0].confidence >= 0.95


def test_aadhaar_card_detection(detector):
    # Formatted Aadhaar
    text1 = "Aadhaar UID: 4589 1234 5678."
    entities1 = detector.detect_entities(text1)
    assert len(entities1) == 1
    assert entities1[0].entity_type == "AADHAAR"
    assert "4589 1234 5678" in entities1[0].raw_value

    # Continuous Aadhaar
    text2 = "Aadhaar UID: 458912345678."
    entities2 = detector.detect_entities(text2)
    assert len(entities2) == 1
    assert entities2[0].entity_type == "AADHAAR"


def test_contact_details_detection(detector):
    text = "Contact Priya at priya.sharma@example.com or mobile +91 9876543210."
    entities = detector.detect_entities(text)
    types = [e.entity_type for e in entities]
    assert "EMAIL" in types
    assert "PHONE_NUMBER" in types


def test_risk_scoring_calculation(detector):
    # Clean text
    clean_text = "This document discusses open source privacy architectures and system design."
    assessment_clean = detector.assess_risk(clean_text)
    assert assessment_clean.risk_level == "LOW"
    assert assessment_clean.risk_score == 0.0

    # High risk document with PAN and Aadhaar
    sensitive_text = "PAN: ABCDE1234F, Aadhaar: 5432 9876 1234, Credit Card: 4532 7890 1234 5678."
    assessment_sensitive = detector.assess_risk(sensitive_text)
    assert assessment_sensitive.risk_level in ["HIGH", "CRITICAL"]
    assert assessment_sensitive.risk_score > 70.0
    assert assessment_sensitive.total_entities_found >= 3


def test_redaction_masking_modes(detector, redactor):
    text = "User PAN is ABCDE1234F and phone is +91 9876543210."
    entities = detector.detect_entities(text)
    
    # Token mode
    res_token = redactor.redact_text(text, entities, masking_mode="TOKEN")
    assert "ABCDE1234F" not in res_token["masked_text"]
    assert "[PAN REDACTED" in res_token["masked_text"]
    assert res_token["zero_leak_verified"] is True

    # Blackout mode
    res_blackout = redactor.redact_text(text, entities, masking_mode="BLACKOUT")
    assert "█" in res_blackout["masked_text"]
    assert "ABCDE1234F" not in res_blackout["masked_text"]


def test_aadhaar_vid_detection_not_credit_card(detector):
    """Verifies that a 16-digit Aadhaar VID on an Aadhaar card is detected as AADHAAR_VID, NOT CREDIT_CARD."""
    # Aadhaar card text with UID and VID
    aadhaar_text = (
        "GOVERNMENT OF INDIA\n"
        "Unique Identification Authority of India\n"
        "Enrollment No: 1234/56789/01234\n"
        "To: Rohan Verma\n"
        "DOB: 12/05/1995\n"
        "Male\n"
        "Aadhaar Number: 4589 1234 5678\n"
        "VID: 9190 1234 5678 9012\n"
        "Mera Aadhaar, Meri Pehchan"
    )
    entities = detector.detect_entities(aadhaar_text)
    types = [e.entity_type for e in entities]
    
    assert "AADHAAR_VID" in types
    assert "CREDIT_CARD" not in types
    
    vid_entity = next(e for e in entities if e.entity_type == "AADHAAR_VID")
    assert "9190 1234 5678 9012" in vid_entity.raw_value

