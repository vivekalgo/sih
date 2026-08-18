"""
PrivacyGuard AI - Regulatory Compliance Evaluation Engine
Evaluates documents against India DPDP Act 2023, GDPR Art. 25, HIPAA, and PCI-DSS standards.
"""

from typing import List, Dict, Any
from pydantic import BaseModel
from app.engine.pii_detector import PIIEntity, RiskAssessment


class ComplianceRuleResult(BaseModel):
    standard: str
    regulation_name: str
    status: str  # "COMPLIANT" or "VIOLATION_DETECTED"
    severity: str # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    summary: str
    violated_clauses: List[str]
    remediation_advice: str
    entities_affected: List[str]


class ComplianceAuditReport(BaseModel):
    overall_compliance_score: float  # 0 to 100%
    compliance_grade: str            # A+, A, B, C, F
    is_safe_for_cloud_llm: bool
    summary: str
    standards: Dict[str, ComplianceRuleResult]


class ComplianceEvaluator:
    """
    Evaluates risk and PII findings against enterprise legal and privacy frameworks.
    """

    def evaluate(self, assessment: RiskAssessment, filename: str = "document") -> ComplianceAuditReport:
        entities = assessment.entities
        entity_types = set(e.entity_type for e in entities)
        
        # 1. India DPDP Act 2023 Evaluation
        dpdp_violations = []
        dpdp_entities = []
        if "AADHAAR" in entity_types:
            dpdp_violations.append("Section 6(1) & Aadhaar Act Sec 29: Unauthorized storage/exposure of 12-digit biometric UID.")
            dpdp_entities.append("AADHAAR")
        if "PAN" in entity_types:
            dpdp_violations.append("Section 4(2): Permanent Account Number requires strict purpose-bound processing.")
            dpdp_entities.append("PAN")
        if "PHONE_NUMBER" in entity_types or "EMAIL" in entity_types:
            dpdp_violations.append("Section 7: Personal contact identifiers require explicit opt-in data principal consent.")
            dpdp_entities.extend([t for t in ["PHONE_NUMBER", "EMAIL"] if t in entity_types])
        
        dpdp_status = "VIOLATION_DETECTED" if dpdp_violations else "COMPLIANT"
        dpdp_result = ComplianceRuleResult(
            standard="DPDP_2023",
            regulation_name="India Digital Personal Data Protection (DPDP) Act 2023",
            status=dpdp_status,
            severity="CRITICAL" if ("AADHAAR" in entity_types or "PAN" in entity_types) else ("HIGH" if dpdp_violations else "LOW"),
            summary="Requires localization, zero-retention defaults, and explicit masking of government IDs." if dpdp_violations else "Document adheres to DPDP Act data minimization requirements.",
            violated_clauses=dpdp_violations,
            remediation_advice="Apply zero-retention token masking on government identifiers before cloud ingestion.",
            entities_affected=dpdp_entities
        )

        # 2. GDPR (General Data Protection Regulation)
        gdpr_violations = []
        gdpr_entities = []
        if "SSN" in entity_types or "PASSPORT" in entity_types or "DRIVING_LICENSE" in entity_types:
            gdpr_violations.append("Article 87: Special national identification numbers require special protection safeguard.")
            gdpr_entities.extend([t for t in ["SSN", "PASSPORT", "DRIVING_LICENSE"] if t in entity_types])
        if "EMAIL" in entity_types or "PHONE_NUMBER" in entity_types or "IP_ADDRESS" in entity_types:
            gdpr_violations.append("Article 5(1)(c) Data Minimisation: Direct personal identifiers present without pseudonymization.")
            gdpr_entities.extend([t for t in ["EMAIL", "PHONE_NUMBER", "IP_ADDRESS"] if t in entity_types])
        if "DATE_OF_BIRTH" in entity_types:
            gdpr_violations.append("Article 6: Demographic profiling identifiers present.")
            gdpr_entities.append("DATE_OF_BIRTH")

        gdpr_status = "VIOLATION_DETECTED" if gdpr_violations else "COMPLIANT"
        gdpr_result = ComplianceRuleResult(
            standard="GDPR",
            regulation_name="EU General Data Protection Regulation (GDPR Art. 25 & 32)",
            status=gdpr_status,
            severity="HIGH" if gdpr_violations else "LOW",
            summary="Article 25 mandates Privacy by Design and Pseudonymisation before transmitting data across third-party processors." if gdpr_violations else "Complies with GDPR pseudonymisation standards.",
            violated_clauses=gdpr_violations,
            remediation_advice="Pseudonymize all direct contact and identity references using surgical token replacement.",
            entities_affected=gdpr_entities
        )

        # 3. PCI-DSS (Payment Card Industry Data Security Standard)
        pci_violations = []
        pci_entities = []
        if "CREDIT_CARD" in entity_types:
            pci_violations.append("PCI-DSS Req 3.4: Primary Account Number (PAN) must be rendered unreadable anywhere it is stored or transmitted.")
            pci_entities.append("CREDIT_CARD")
        if "IFSC_CODE" in entity_types or "UPI_ID" in entity_types:
            pci_violations.append("PCI-DSS Req 3.2: Financial routing identifiers require access control segregation.")
            pci_entities.extend([t for t in ["IFSC_CODE", "UPI_ID"] if t in entity_types])

        pci_status = "VIOLATION_DETECTED" if pci_violations else "COMPLIANT"
        pci_result = ComplianceRuleResult(
            standard="PCI_DSS",
            regulation_name="PCI-DSS v4.0 (Payment Card Security)",
            status=pci_status,
            severity="CRITICAL" if "CREDIT_CARD" in entity_types else ("MEDIUM" if pci_violations else "LOW"),
            summary="Payment credentials detected. Immediate masking required to prevent financial credential compromise." if pci_violations else "Zero unmasked cardholder data found.",
            violated_clauses=pci_violations,
            remediation_advice="Ensure credit card numbers are truncated to first 6 and last 4 digits or completely masked.",
            entities_affected=pci_entities
        )

        # 4. HIPAA (Health Insurance Portability and Accountability Act - Safe Harbor 18 Identifiers)
        hipaa_violations = []
        hipaa_entities = []
        if "DATE_OF_BIRTH" in entity_types:
            hipaa_violations.append("HIPAA Safe Harbor Rule: All elements of dates directly related to an individual must be removed.")
            hipaa_entities.append("DATE_OF_BIRTH")
        if "PHONE_NUMBER" in entity_types or "EMAIL" in entity_types:
            hipaa_violations.append("HIPAA Safe Harbor Rule: Telephone numbers and electronic mail addresses must be scrubbed.")
            hipaa_entities.extend([t for t in ["PHONE_NUMBER", "EMAIL"] if t in entity_types])
        if "SSN" in entity_types or "AADHAAR" in entity_types or "PASSPORT" in entity_types:
            hipaa_violations.append("HIPAA Safe Harbor Rule: Social security & national identification numbers prohibited.")
            hipaa_entities.extend([t for t in ["SSN", "AADHAAR", "PASSPORT"] if t in entity_types])

        hipaa_status = "VIOLATION_DETECTED" if hipaa_violations else "COMPLIANT"
        hipaa_result = ComplianceRuleResult(
            standard="HIPAA",
            regulation_name="HIPAA Safe Harbor De-Identification Standard (§ 164.514(b))",
            status=hipaa_status,
            severity="HIGH" if hipaa_violations else "LOW",
            summary="Medical / demographic PII elements detected that violate Safe Harbor de-identification." if hipaa_violations else "Adheres to HIPAA Safe Harbor de-identification rules.",
            violated_clauses=hipaa_violations,
            remediation_advice="Redact all 18 HIPAA Safe Harbor identifiers prior to analytics or LLM pipeline input.",
            entities_affected=hipaa_entities
        )

        # Compute composite compliance score (100 = perfectly safe, 0 = severe non-compliance)
        total_violations = len(dpdp_violations) + len(gdpr_violations) + len(pci_violations) + len(hipaa_violations)
        compliance_score = max(5.0, round(100.0 - (total_violations * 12.5), 1))
        
        if compliance_score >= 90:
            grade = "A+"
        elif compliance_score >= 75:
            grade = "B"
        elif compliance_score >= 50:
            grade = "C"
        else:
            grade = "F"

        is_safe = (compliance_score >= 80 and len(pci_violations) == 0 and "AADHAAR" not in entity_types)

        summary_text = (
            f"Audit Complete: {len(entities)} sensitive identifiers mapped across 4 global regulatory frameworks. "
            f"{'Redaction required before external LLM ingestion.' if not is_safe else 'Document meets privacy safety criteria.'}"
        )

        return ComplianceAuditReport(
            overall_compliance_score=compliance_score,
            compliance_grade=grade,
            is_safe_for_cloud_llm=is_safe,
            summary=summary_text,
            standards={
                "DPDP_2023": dpdp_result,
                "GDPR": gdpr_result,
                "PCI_DSS": pci_result,
                "HIPAA": hipaa_result
            }
        )


compliance_evaluator = ComplianceEvaluator()
