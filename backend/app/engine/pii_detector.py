"""
PrivacyGuard AI - Real-World Multi-Entity PII Detection & Privacy Risk Engine
Detects Indian and Global identity credentials, financial records, contact numbers, and secrets.
Calculates dynamic risk confidence and threat tiering with 100% deterministic local offline reliability.
"""

import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.core.config import settings


class PIIEntity(BaseModel):
    id: str
    entity_type: str
    raw_value: str
    masked_value: str
    start: int
    end: int
    confidence: float
    severity_weight: int
    explanation: str


class RiskAssessment(BaseModel):
    risk_score: float  # 0.0 to 100.0
    risk_level: str    # LOW, MEDIUM, HIGH, CRITICAL
    total_entities_found: int
    entity_counts: Dict[str, int]
    mean_confidence: float
    recommendation: str
    entities: List[PIIEntity]


def _luhn_check(card_number_str: str) -> bool:
    """Verifies Luhn checksum for payment cards."""
    digits = [int(d) for d in re.sub(r"\D", "", card_number_str)]
    if len(digits) < 13 or len(digits) > 19:
        return False
    checksum = 0
    reverse_digits = digits[::-1]
    for i, digit in enumerate(reverse_digits):
        if i % 2 == 1:
            doubled = digit * 2
            checksum += doubled if doubled < 10 else doubled - 9
        else:
            checksum += digit
    return checksum % 10 == 0


class PIIDetectorEngine:
    """
    Production-grade multi-entity PII detection engine.
    Supports comprehensive Indian & Global document identifiers with zero-failure local fallback.
    """

    PATTERNS = [
        # 1. Indian PAN Card (5 letters, 4 digits, 1 letter)
        {
            "type": "PAN",
            "regex": re.compile(r"\b([A-Za-z]{5}[0-9]{4}[A-Za-z]{1})\b"),
            "base_confidence": 0.98,
            "weight": 30,
            "explanation": "Indian Permanent Account Number (Income Tax Dept Format)",
            "mask_func": lambda s: f"[PAN REDACTED: {s[:2].upper()}XXXXX{s[-1].upper()}]"
        },
        # 2. Indian Aadhaar UID (12 digits, spaced or hyphenated)
        {
            "type": "AADHAAR",
            "regex": re.compile(r"\b([0-9]{4}[ \-][0-9]{4}[ \-][0-9]{4})\b(?![ \-][0-9])"),
            "base_confidence": 0.98,
            "weight": 35,
            "explanation": "Indian Aadhaar Unique Identification 12-digit UID",
            "mask_func": lambda s: f"[AADHAAR REDACTED: XXXX-XXXX-{re.sub(r'[^0-9]', '', s)[-4:]}]"
        },
        # 3. Masked Aadhaar (e.g. XXXX XXXX 1234 or •••• •••• 1234)
        {
            "type": "AADHAAR",
            "regex": re.compile(r"\b((?:[XxX\*\•]{4}[ \-]){2}[0-9]{4}|(?:[XxX\*\•]{8}[0-9]{4}))\b"),
            "base_confidence": 0.95,
            "weight": 25,
            "explanation": "Masked Indian Aadhaar Number",
            "mask_func": lambda s: f"[AADHAAR REDACTED: XXXX-XXXX-{re.sub(r'[^0-9]', '', s)[-4:]}]"
        },
        # 4. Continuous 12-digit Aadhaar UID
        {
            "type": "AADHAAR",
            "regex": re.compile(r"(?i)(?:Aadhaar|UIDAI|UID|Mera Aadhaar|Enrolment)[\s:\.\#\-]*\b([0-9]{12})\b"),
            "base_confidence": 0.96,
            "weight": 35,
            "explanation": "Continuous 12-digit Aadhaar UID number",
            "mask_func": lambda s: f"[AADHAAR REDACTED: XXXX-XXXX-{s[-4:]}]"
        },
        # 5. Indian Aadhaar Virtual ID (VID - 16 digits)
        {
            "type": "AADHAAR_VID",
            "regex": re.compile(r"(?i)(?:VID[\s:\.\-]*)\b([0-9]{4}[ \-][0-9]{4}[ \-][0-9]{4}[ \-][0-9]{4}|[0-9]{16})\b"),
            "base_confidence": 0.99,
            "weight": 30,
            "explanation": "Indian Aadhaar 16-Digit Virtual ID (VID)",
            "mask_func": lambda s: f"[AADHAAR_VID REDACTED: XXXX-XXXX-XXXX-{re.sub(r'[^0-9]', '', s)[-4:]}]"
        },
        # 6. Credit / Debit Payment Cards (Visa, Master, Amex, RuPay, Discover)
        {
            "type": "CREDIT_CARD",
            "regex": re.compile(r"\b(?:\d{4}[ -]){3}\d{4}\b|\b(?:\d{4}[ -]){2}\d{4}[ -]\d{3}\b|\b\d{15,16}\b"),
            "base_confidence": 0.95,
            "weight": 35,
            "explanation": "PCI-DSS Payment Card / Credit Card Number",
            "mask_func": lambda s: f"[CARD REDACTED: ****-****-****-{re.sub(r'[^0-9]', '', s)[-4:]}]"
        },
        # 7. US Social Security Number (SSN)
        {
            "type": "SSN",
            "regex": re.compile(r"\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b"),
            "base_confidence": 0.98,
            "weight": 35,
            "explanation": "US Social Security Number",
            "mask_func": lambda s: "[SSN REDACTED: ***-**-****]"
        },
        # 8. Indian Passport & Global Passport
        {
            "type": "PASSPORT",
            "regex": re.compile(r"\b([A-PR-WYa-pr-wy][1-9]\d\s?\d{4}[1-9]|[A-Z]{1}[0-9]{7})\b"),
            "base_confidence": 0.90,
            "weight": 25,
            "explanation": "National Passport Document Number",
            "mask_func": lambda s: "[PASSPORT REDACTED: *******]"
        },
        # 9. Indian Driving License
        {
            "type": "DRIVING_LICENSE",
            "regex": re.compile(r"\b([A-Z]{2}[0-9]{2}[ -]?[0-9]{4}[ -]?[0-9]{7}|[A-Z]{2}[0-9]{13})\b", re.IGNORECASE),
            "base_confidence": 0.93,
            "weight": 25,
            "explanation": "Indian Driving License Number",
            "mask_func": lambda s: f"[DL REDACTED: {s[:4].upper()}XXXXXXXX]"
        },
        # 10. Indian Voter ID (EPIC Number)
        {
            "type": "VOTER_ID",
            "regex": re.compile(r"\b([A-Z]{3}[0-9]{7})\b"),
            "base_confidence": 0.92,
            "weight": 20,
            "explanation": "Indian Election Commission Voter ID (EPIC)",
            "mask_func": lambda s: f"[VOTER_ID REDACTED: {s[:3]}XXXXXXX]"
        },
        # 11. Indian Bank IFSC Code
        {
            "type": "IFSC_CODE",
            "regex": re.compile(r"\b([A-Z]{4}0[A-Z0-9]{6})\b"),
            "base_confidence": 0.95,
            "weight": 15,
            "explanation": "Indian Financial System Code (IFSC)",
            "mask_func": lambda s: f"[IFSC REDACTED: {s[:4]}0XXXXXX]"
        },
        # 12. Bank Account Number
        {
            "type": "BANK_ACCOUNT",
            "regex": re.compile(r"(?i)(?:A/C|Account No|Account Number|Acc No|Bank Account|Khata No)[\s:\.\#\-]*\b([0-9]{9,18})\b"),
            "base_confidence": 0.94,
            "weight": 25,
            "explanation": "Bank Account Number",
            "mask_func": lambda s: f"[ACCOUNT REDACTED: XXXXXXXX{s[-4:]}]"
        },
        # 13. UPI Virtual Payment Address (VPA)
        {
            "type": "UPI_ID",
            "regex": re.compile(r"\b([a-zA-Z0-9.\-_]{2,30}@(okhdfcbank|okaxis|okicici|oksbi|paytm|ybl|apl|ibl|upi|axisbank|icici|sbi|hdfcbank))\b", re.IGNORECASE),
            "base_confidence": 0.96,
            "weight": 20,
            "explanation": "Unified Payments Interface (UPI) VPA Address",
            "mask_func": lambda s: f"[UPI REDACTED: {s.split('@')[0][:2]}***@{s.split('@')[1]}]"
        },
        # 14. Email Address
        {
            "type": "EMAIL",
            "regex": re.compile(r"\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b"),
            "base_confidence": 0.95,
            "weight": 10,
            "explanation": "Electronic Mail Address",
            "mask_func": lambda s: f"[EMAIL REDACTED: {s.split('@')[0][:2]}***@{s.split('@')[1]}]" if '@' in s else "[EMAIL REDACTED]"
        },
        # 15. Phone Number (Indian 10-digit mobile, +91, US formats)
        {
            "type": "PHONE_NUMBER",
            "regex": re.compile(r"(?:\+?91[\-\s]?)?[6789]\d{4}[\-\s]?\d{5}\b|\b(?:\+1[\-\s]?)?\(?\d{3}\)?[\-\s]?\d{3}[\-\s]?\d{4}\b"),
            "base_confidence": 0.93,
            "weight": 15,
            "explanation": "Direct Mobile / Telephone Contact Number",
            "mask_func": lambda s: f"[PHONE REDACTED: +XX-XXXXX-{re.sub(r'[^0-9]', '', s)[-4:]}]"
        },
        # 16. API Keys, Tokens & Secrets (sk-live-, sk-proj-, ghp_, AKIA, JWT)
        {
            "type": "API_KEY",
            "regex": re.compile(r"\b(sk-[a-zA-Z0-9_\-]{16,}|ghp_[a-zA-Z0-9]{30,}|gho_[a-zA-Z0-9]{30,}|AKIA[0-9A-Z]{16}|ey[a-zA-Z0-9_-]{10,}\.ey[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})\b"),
            "base_confidence": 0.99,
            "weight": 30,
            "explanation": "High-entropy API Secret / Token / Private Key",
            "mask_func": lambda s: "[API SECRET REDACTED: *************]"
        },
        # 17. Date of Birth
        {
            "type": "DATE_OF_BIRTH",
            "regex": re.compile(r"(?i)(?:DOB|Date of Birth|जन्म तिथि|Year of Birth|YOB|Born|Birthdate)[\s:\-\/]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4})"),
            "base_confidence": 0.92,
            "weight": 12,
            "explanation": "Date of Birth Demographic Identifier",
            "mask_func": lambda s: "[DOB REDACTED: DD/MM/YYYY]"
        },
        # 18. Person Full Name
        {
            "type": "PERSON_NAME",
            "regex": re.compile(r"(?i)\b(?:Customer Full Name|Customer Name|Patient Name|Applicant Name|Full Name|Lead Engineer|Patient|Applicant|Physician|Attending Physician|Name|नाम|Resident|Cardholder|Holder Name|To:)[\s:\-]+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})(?=\r?\n|$|\s*[\|,])"),
            "base_confidence": 0.92,
            "weight": 20,
            "explanation": "Customer / Patient / Applicant Full Legal Name",
            "mask_func": lambda s: f"[NAME REDACTED: {s.split()[0][0]}*** {s.split()[-1][0]}***]" if len(s.split()) > 1 else "[NAME REDACTED]"
        },
        # 19. Father / Guardian / Relative Name
        {
            "type": "RELATIVE_NAME",
            "regex": re.compile(r"(?i)\b(?:Father|Father's Name|Husband|Husband's Name|S/O|D/O|W/O|C/O|Guardian|पिता)[\s:\-]+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})(?=\r?\n|$|\s*[\|,])"),
            "base_confidence": 0.90,
            "weight": 15,
            "explanation": "Father / Guardian / Relative Name",
            "mask_func": lambda s: f"[NAME REDACTED: {s.split()[0][0]}*** {s.split()[-1][0]}***]" if len(s.split()) > 1 else "[NAME REDACTED]"
        },
        # 20. Residential Address
        {
            "type": "ADDRESS",
            "regex": re.compile(r"(?i)\b(?:Current Address|Permanent Address|Residential Address|Flat No|House No|Address|पता)[\s:\-]+([^\r\n]{10,120})(?=\r?\n|$)"),
            "base_confidence": 0.88,
            "weight": 15,
            "explanation": "Residential / Permanent Street Address",
            "mask_func": lambda s: "[ADDRESS REDACTED: Flat XX, City, PIN: XXXXXX]"
        }
    ]

    def detect_entities(self, text: str) -> List[PIIEntity]:
        if not text:
            return []

        detected: List[PIIEntity] = []
        entity_id_counter = 1

        is_aadhaar_doc = bool(re.search(r"(?i)(?:aadhaar|uidai|unique identification|mera aadhaar|enrolment|government of india|resident|vid\b)", text))

        for pattern_cfg in self.PATTERNS:
            ptype = pattern_cfg["type"]
            regex: re.Pattern = pattern_cfg["regex"]
            conf = pattern_cfg["base_confidence"]
            weight = pattern_cfg["weight"]
            desc = pattern_cfg["explanation"]
            mask_fn = pattern_cfg["mask_func"]

            for match in regex.finditer(text):
                # If regex has capture group 1 (e.g. for DOB, Person Name), extract only the target value
                if match.groups():
                    raw = match.group(1).strip()
                    start, end = match.span(1)
                else:
                    raw = match.group(0).strip()
                    start, end = match.span(0)

                if not raw or len(raw) < 2:
                    continue

                # Specific validations & disambiguation
                if ptype == "CREDIT_CARD":
                    clean_num = re.sub(r"\D", "", raw)
                    if len(clean_num) not in (15, 16):
                        continue
                    
                    # Check if preceded by VID or Virtual ID
                    pre_text = text[max(0, start-25):start].lower()
                    if "vid" in pre_text or "virtual" in pre_text:
                        ptype = "AADHAAR_VID"
                        desc = "Indian Aadhaar 16-Digit Virtual ID (VID)"
                        weight = 30
                        mask_fn = lambda s: f"[AADHAAR_VID REDACTED: XXXX-XXXX-XXXX-{re.sub(r'[^0-9]', '', s)[-4:]}]"
                    elif is_aadhaar_doc:
                        nearby = text[max(0, start-40):min(len(text), end+40)].lower()
                        has_card_keyword = any(k in nearby for k in ["visa", "mastercard", "rupay", "amex", "credit", "debit", "card", "cvv", "expiry"])
                        if not has_card_keyword:
                            ptype = "AADHAAR_VID"
                            desc = "Indian Aadhaar 16-Digit Virtual ID (VID)"
                            weight = 30
                            mask_fn = lambda s: f"[AADHAAR_VID REDACTED: XXXX-XXXX-XXXX-{re.sub(r'[^0-9]', '', s)[-4:]}]"

                # Avoid duplicate overlapping entities
                overlap = False
                for ex in detected:
                    if ex.raw_value.lower() == raw.lower() or (start >= ex.start and end <= ex.end):
                        overlap = True
                        break

                if not overlap:
                    masked = mask_fn(raw)
                    detected.append(
                        PIIEntity(
                            id=f"pii_{entity_id_counter:03d}",
                            entity_type=ptype,
                            raw_value=raw,
                            masked_value=masked,
                            start=start,
                            end=end,
                            confidence=conf,
                            severity_weight=weight,
                            explanation=desc
                        )
                    )
                    entity_id_counter += 1

        return detected

    def assess_risk(self, text_or_entities: Any, entities: Optional[List[PIIEntity]] = None) -> RiskAssessment:
        """
        Calculates dynamic privacy threat level and quantitative risk score (0-100%).
        Supports both assess_risk(entities) and assess_risk(text, entities).
        """
        if entities is not None:
            target_entities = entities
        elif isinstance(text_or_entities, list):
            target_entities = text_or_entities
        else:
            target_entities = []

        if not target_entities:
            return RiskAssessment(
                risk_score=0.0,
                risk_level="LOW",
                total_entities_found=0,
                entity_counts={},
                mean_confidence=1.0,
                recommendation="Document is clean of standard sensitive personal identifiers. Safe for downstream processing.",
                entities=[]
            )

        total_weight = sum(e.severity_weight for e in entities)
        entity_counts: Dict[str, int] = {}
        for e in entities:
            entity_counts[e.entity_type] = entity_counts.get(e.entity_type, 0) + 1

        mean_conf = sum(e.confidence for e in entities) / len(entities)

        # Scale score dynamically
        raw_score = min(100.0, total_weight * 1.35)
        score = round(raw_score, 1)

        if score >= 65.0:
            level = "CRITICAL"
            rec = "High-risk personal credentials detected. Direct unmasked sharing poses identity theft & regulatory compliance violations."
        elif score >= 40.0:
            level = "HIGH"
            rec = "Direct personal and financial identifiers present. Redaction is strongly recommended before external transmission."
        elif score >= 20.0:
            level = "MEDIUM"
            rec = "Moderate identifiable information found. Consider masking non-essential fields."
        else:
            level = "LOW"
            rec = "Low-risk attributes found. Minimum privacy precautions are sufficient."

        return RiskAssessment(
            risk_score=score,
            risk_level=level,
            total_entities_found=len(entities),
            entity_counts=entity_counts,
            mean_confidence=round(mean_conf, 2),
            recommendation=rec,
            entities=entities
        )


detector = PIIDetectorEngine()
