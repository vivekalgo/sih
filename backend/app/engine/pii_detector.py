"""
PrivacyGuard AI - Real-World Multi-Entity PII Detection & Privacy Risk Engine
Detects Indian and Global identity credentials, financial records, contact numbers, and secrets.
Calculates dynamic risk confidence and threat tiering.
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
    Supports comprehensive Indian & Global document identifiers.
    """

    PATTERNS = [
        # 1. Indian PAN Card (5 letters, 4 digits, 1 letter)
        {
            "type": "PAN",
            "regex": re.compile(r"\b([A-Za-z]{5}[0-9]{4}[A-Za-z]{1})\b"),
            "base_confidence": 0.97,
            "weight": 30,
            "explanation": "Indian Permanent Account Number (Income Tax Dept Format)",
            "mask_func": lambda s: f"[PAN REDACTED: {s[:2].upper()}XXXXX{s[-1].upper()}]"
        },
        # 2. Indian Aadhaar UID (12 digits, spaced or continuous)
        {
            "type": "AADHAAR",
            "regex": re.compile(r"\b([2-9][0-9]{3}[ \-][0-9]{4}[ \-][0-9]{4})\b(?![ \-][0-9])"),
            "base_confidence": 0.98,
            "weight": 35,
            "explanation": "Indian Aadhaar Unique Identification 12-digit UID",
            "mask_func": lambda s: f"[AADHAAR REDACTED: XXXX-XXXX-{re.sub(r'[^0-9]', '', s)[-4:]}]"
        },
        {
            "type": "AADHAAR",
            "regex": re.compile(r"\b([2-9][0-9]{11})\b"),
            "base_confidence": 0.91,
            "weight": 35,
            "explanation": "Continuous 12-digit Aadhaar UID number",
            "mask_func": lambda s: f"[AADHAAR REDACTED: XXXX-XXXX-{s[-4:]}]"
        },
        # 3. Indian Aadhaar Virtual ID (VID - 16 digits)
        {
            "type": "AADHAAR_VID",
            "regex": re.compile(r"(?i)(?:VID[\s:\.\-]*)\b([2-9][0-9]{3}[ \-][0-9]{4}[ \-][0-9]{4}[ \-][0-9]{4}|[2-9][0-9]{15})\b"),
            "base_confidence": 0.99,
            "weight": 30,
            "explanation": "Indian Aadhaar 16-Digit Virtual ID (VID)",
            "mask_func": lambda s: f"[AADHAAR_VID REDACTED: XXXX-XXXX-XXXX-{re.sub(r'[^0-9]', '', s)[-4:]}]"
        },
        # 4. Credit / Debit Payment Cards (Visa, Master, Amex, RuPay, Discover)
        {
            "type": "CREDIT_CARD",
            "regex": re.compile(r"\b(?:\d{4}[ -]){3}\d{4}\b|\b(?:\d{4}[ -]){2}\d{4}[ -]\d{3}\b|\b\d{15,16}\b"),
            "base_confidence": 0.95,
            "weight": 35,
            "explanation": "PCI-DSS Payment Card / Credit Card Number",
            "mask_func": lambda s: f"[CARD REDACTED: ****-****-****-{re.sub(r'[^0-9]', '', s)[-4:]}]"
        },
        # 4. US Social Security Number (SSN)
        {
            "type": "SSN",
            "regex": re.compile(r"\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b"),
            "base_confidence": 0.98,
            "weight": 35,
            "explanation": "US Social Security Number",
            "mask_func": lambda s: "[SSN REDACTED: ***-**-****]"
        },
        # 5. Indian Passport & Global Passport
        {
            "type": "PASSPORT",
            "regex": re.compile(r"\b([A-PR-WYa-pr-wy][1-9]\d\s?\d{4}[1-9]|[A-Z]{1}[0-9]{7})\b"),
            "base_confidence": 0.90,
            "weight": 25,
            "explanation": "National Passport Document Number",
            "mask_func": lambda s: "[PASSPORT REDACTED: *******]"
        },
        # 6. Indian Driving License
        {
            "type": "DRIVING_LICENSE",
            "regex": re.compile(r"\b([A-Z]{2}[0-9]{2}[ -]?[0-9]{4}[ -]?[0-9]{7}|[A-Z]{2}[0-9]{13})\b", re.IGNORECASE),
            "base_confidence": 0.93,
            "weight": 25,
            "explanation": "Indian Driving License Number",
            "mask_func": lambda s: f"[DL REDACTED: {s[:4].upper()}XXXXXXXX]"
        },
        # 7. Indian Voter ID (EPIC Number)
        {
            "type": "VOTER_ID",
            "regex": re.compile(r"\b([A-Z]{3}[0-9]{7})\b"),
            "base_confidence": 0.92,
            "weight": 20,
            "explanation": "Indian Election Commission Voter ID (EPIC)",
            "mask_func": lambda s: f"[VOTER_ID REDACTED: {s[:3]}XXXXXXX]"
        },
        # 8. Indian Bank IFSC Code
        {
            "type": "IFSC_CODE",
            "regex": re.compile(r"\b([A-Z]{4}0[A-Z0-9]{6})\b"),
            "base_confidence": 0.95,
            "weight": 15,
            "explanation": "Indian Financial System Code (IFSC)",
            "mask_func": lambda s: f"[IFSC REDACTED: {s[:4]}0XXXXXX]"
        },
        # 9. UPI Virtual Payment Address (VPA)
        {
            "type": "UPI_ID",
            "regex": re.compile(r"\b([a-zA-Z0-9.\-_]{2,30}@(okhdfcbank|okaxis|okicici|oksbi|paytm|ybl|apl|ibl|upi|axisbank|icici|sbi|hdfcbank))\b", re.IGNORECASE),
            "base_confidence": 0.96,
            "weight": 20,
            "explanation": "Unified Payments Interface (UPI) VPA Address",
            "mask_func": lambda s: f"[UPI REDACTED: {s.split('@')[0][:2]}***@{s.split('@')[1]}]"
        },
        # 10. Email Address
        {
            "type": "EMAIL",
            "regex": re.compile(r"\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b"),
            "base_confidence": 0.95,
            "weight": 10,
            "explanation": "Electronic Mail Address",
            "mask_func": lambda s: f"[EMAIL REDACTED: {s.split('@')[0][:2]}***@{s.split('@')[1]}]" if '@' in s else "[EMAIL REDACTED]"
        },
        # 11. Phone Number (Indian 10-digit mobile, +91, US formats)
        {
            "type": "PHONE_NUMBER",
            "regex": re.compile(r"(?:\+?91[\-\s]?)?[6789]\d{4}[\-\s]?\d{5}\b|\b(?:\+1[\-\s]?)?\(?\d{3}\)?[\-\s]?\d{3}[\-\s]?\d{4}\b"),
            "base_confidence": 0.93,
            "weight": 15,
            "explanation": "Direct Mobile / Telephone Contact Number",
            "mask_func": lambda s: f"[PHONE REDACTED: +XX-XXXXX-{re.sub(r'[^0-9]', '', s)[-4:]}]"
        },
        # 12. API Keys, Tokens & Secrets (sk-live-, sk-proj-, ghp_, AKIA, JWT)
        {
            "type": "API_KEY",
            "regex": re.compile(r"\b(sk-[a-zA-Z0-9_\-]{16,}|ghp_[a-zA-Z0-9]{30,}|gho_[a-zA-Z0-9]{30,}|AKIA[0-9A-Z]{16}|ey[a-zA-Z0-9_-]{10,}\.ey[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})\b"),
            "base_confidence": 0.99,
            "weight": 30,
            "explanation": "High-entropy API Secret / Token / Private Key",
            "mask_func": lambda s: "[API SECRET REDACTED: *************]"
        },
        # 13. IP Address
        {
            "type": "IP_ADDRESS",
            "regex": re.compile(r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b"),
            "base_confidence": 0.85,
            "weight": 8,
            "explanation": "IPv4 Network Address",
            "mask_func": lambda s: "[IP REDACTED: ***.***.*.*]"
        },
        # 14. Date of Birth (captures only the clean date part in group 1)
        {
            "type": "DATE_OF_BIRTH",
            "regex": re.compile(r"(?i)(?:DOB|Date of Birth|Born|Birthdate)[\s:\-]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})"),
            "base_confidence": 0.89,
            "weight": 12,
            "explanation": "Date of Birth Demographic Identifier",
            "mask_func": lambda s: "[DOB REDACTED: DD/MM/YYYY]"
        },
        # 15. Person Full Name (captures person's full name in group 1)
        {
            "type": "PERSON_NAME",
            "regex": re.compile(r"(?i)\b(?:Customer Full Name|Customer Name|Patient Name|Applicant Name|Full Name|Lead Engineer|Patient|Applicant|Physician|Attending Physician)[\s:\-]+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})(?=\r?\n|$|\s*[\|,])"),
            "base_confidence": 0.92,
            "weight": 20,
            "explanation": "Customer / Patient / Applicant Full Legal Name",
            "mask_func": lambda s: f"[NAME REDACTED: {s.split()[0][0]}*** {s.split()[-1][0]}***]" if len(s.split()) > 1 else "[NAME REDACTED]"
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

                if not raw:
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
                        conf_adj = 0.99
                    elif is_aadhaar_doc:
                        # Check if card keywords exist nearby
                        nearby = text[max(0, start-40):min(len(text), end+40)].lower()
                        has_card_keyword = any(k in nearby for k in ["visa", "mastercard", "rupay", "amex", "credit", "debit", "card", "cvv", "expiry"])
                        if not has_card_keyword:
                            ptype = "AADHAAR_VID"
                            desc = "Indian Aadhaar 16-Digit Virtual ID (VID)"
                            weight = 30
                            mask_fn = lambda s: f"[AADHAAR_VID REDACTED: XXXX-XXXX-XXXX-{re.sub(r'[^0-9]', '', s)[-4:]}]"
                            conf_adj = 0.98
                        else:
                            if not _luhn_check(clean_num):
                                continue
                            conf_adj = 0.95
                    else:
                        if not _luhn_check(clean_num):
                            continue
                        conf_adj = 0.96

                elif ptype == "AADHAAR_VID":
                    clean_vid = re.sub(r"\D", "", raw)
                    if len(clean_vid) != 16:
                        continue
                    conf_adj = conf

                elif ptype == "AADHAAR":
                    clean_aadhaar = re.sub(r"\D", "", raw)
                    if len(clean_aadhaar) != 12:
                        continue
                    conf_adj = conf

                elif ptype == "PAN":
                    raw_upper = raw.upper()
                    if len(raw_upper) == 10 and raw_upper[3] in ['P', 'C', 'H', 'F', 'A', 'T', 'B', 'L', 'J', 'G']:
                        conf_adj = 0.98
                    else:
                        conf_adj = conf
                else:
                    conf_adj = conf

                # Avoid overlapping spans
                overlap = False
                for existing in detected:
                    if not (end <= existing.start or start >= existing.end):
                        overlap = True
                        break

                if not overlap:
                    masked = mask_fn(raw)
                    detected.append(
                        PIIEntity(
                            id=f"pii_{entity_id_counter}",
                            entity_type=ptype,
                            raw_value=raw,
                            masked_value=masked,
                            start=start,
                            end=end,
                            confidence=round(conf_adj, 3),
                            severity_weight=weight,
                            explanation=desc
                        )
                    )
                    entity_id_counter += 1

        detected.sort(key=lambda x: x.start)
        return detected

    def assess_risk(self, text: str, entities: Optional[List[PIIEntity]] = None) -> RiskAssessment:
        if entities is None:
            entities = self.detect_entities(text)

        if not entities:
            return RiskAssessment(
                risk_score=0.0,
                risk_level="LOW",
                total_entities_found=0,
                entity_counts={},
                mean_confidence=1.0,
                recommendation="Document is clean of standard sensitive personal identifiers. Safe for downstream processing.",
                entities=[]
            )

        entity_counts: Dict[str, int] = {}
        raw_weighted_sum = 0
        total_conf = 0.0

        for ent in entities:
            entity_counts[ent.entity_type] = entity_counts.get(ent.entity_type, 0) + 1
            raw_weighted_sum += ent.severity_weight * ent.confidence
            total_conf += ent.confidence

        mean_conf = round(total_conf / len(entities), 3) if entities else 0.0

        # Scale score: 1 - e^(-weighted_sum / 25.0)
        normalized_score = min(100.0, round((1.0 - (0.65 ** (raw_weighted_sum / 25.0))) * 100.0, 1))

        if normalized_score >= settings.RISK_THRESHOLDS["CRITICAL"]:
            risk_level = "CRITICAL"
            rec = "CRITICAL RISK: Contains high-impact government/financial credentials (Aadhaar, PAN, SSN, or Cards). Redaction mandatory before transmission."
        elif normalized_score >= settings.RISK_THRESHOLDS["HIGH"]:
            risk_level = "HIGH"
            rec = "HIGH RISK: Contains multiple sensitive identifiers. Zero-retention sanitization required."
        elif normalized_score >= settings.RISK_THRESHOLDS["MEDIUM"]:
            risk_level = "MEDIUM"
            rec = "MEDIUM RISK: Moderate contact/demographic identifiers detected. Recommended for automated masking."
        else:
            risk_level = "LOW"
            rec = "LOW RISK: Minor non-critical identifiers found. Safe to proceed after reviewing masked output."

        return RiskAssessment(
            risk_score=normalized_score,
            risk_level=risk_level,
            total_entities_found=len(entities),
            entity_counts=entity_counts,
            mean_confidence=mean_conf,
            recommendation=rec,
            entities=entities
        )


detector = PIIDetectorEngine()
