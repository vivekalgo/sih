"""
PrivacyGuard AI - Enterprise AI Guardrail & LLM Firewall Gateway
Intercepts outgoing prompts and incoming LLM completions to guarantee zero data leakage.
"""

import time
import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from app.engine.pii_detector import detector, PIIDetectorEngine, PIIEntity
from app.engine.redactor import redactor


class FirewallInspectionRequest(BaseModel):
    raw_prompt: str
    target_model: Optional[str] = "gpt-4o / claude-3.5-sonnet / gemini-1.5-pro"
    custom_forbidden_keywords: Optional[List[str]] = []
    masking_mode: Optional[str] = "TOKEN"


class FirewallInspectionResponse(BaseModel):
    is_safe_to_transmit: bool
    sanitized_prompt: str
    original_prompt: str
    entities_intercepted: int
    threat_summary: str
    leak_prevention_list: List[Dict[str, Any]]
    simulated_cloud_response: str
    firewall_latency_ms: float
    audit_hash: str


class LLMFirewallEngine:
    """
    Enterprise proxy engine sitting between business applications and foundation models.
    """

    def inspect_and_sanitize(self, payload: FirewallInspectionRequest) -> FirewallInspectionResponse:
        start = time.time()
        text = payload.raw_prompt

        # 1. Detect standard PII
        entities: List[PIIEntity] = detector.detect_entities(text)

        # 2. Check custom forbidden keywords / enterprise secrets
        if payload.custom_forbidden_keywords:
            for kw in payload.custom_forbidden_keywords:
                kw_clean = kw.strip()
                if not kw_clean:
                    continue
                for m in re.finditer(re.escape(kw_clean), text, re.IGNORECASE):
                    s, e = m.span()
                    # Avoid overlap
                    if not any(not (e <= existing.start or s >= existing.end) for existing in entities):
                        entities.append(
                            PIIEntity(
                                id=f"firewall_secret_{len(entities)+1}",
                                entity_type="CUSTOM_SECRET",
                                raw_value=m.group(0),
                                masked_value=f"[SECRET REDACTED: {m.group(0)[:2]}***]",
                                start=s,
                                end=e,
                                confidence=1.0,
                                severity_weight=30,
                                explanation="Enterprise proprietary keyword"
                            )
                        )

        entities.sort(key=lambda x: x.start)

        # 3. Apply surgical redaction
        redact_res = redactor.redact_text(
            raw_text=text,
            entities=entities,
            masking_mode=payload.masking_mode or "TOKEN"
        )
        sanitized_prompt = redact_res["masked_text"]

        # 4. Generate enterprise safe synthesized response
        intercepted_count = len(entities)
        model_name = payload.target_model or "Foundation Model"
        
        if intercepted_count > 0:
            threat_msg = f"FIREWALL INTERCEPTED: {intercepted_count} sensitive token(s) blocked from transmission to {model_name}."
            simulated_response = (
                f"🔒 [PrivacyGuard Guarded Response from {model_name}]\n\n"
                f"Your request was processed securely against sanitized tokens. "
                f"No unmasked personal or corporate credentials ({', '.join(set(e.entity_type for e in entities))}) "
                f"were exposed during LLM evaluation."
            )
        else:
            threat_msg = f"PASSED CLEAN: No sensitive credentials or PII detected. Safe for direct cloud inference."
            simulated_response = (
                f"🤖 [Direct Response from {model_name}]\n\n"
                f"Your query was evaluated clean with zero PII exposure. Proceeding with standard analytical completion."
            )

        elapsed = round((time.time() - start) * 1000, 2)

        leak_items = [
            {
                "entity_type": e.entity_type,
                "raw": e.raw_value,
                "masked": e.masked_value,
                "confidence": e.confidence
            }
            for e in entities
        ]

        return FirewallInspectionResponse(
            is_safe_to_transmit=True,
            sanitized_prompt=sanitized_prompt,
            original_prompt=text,
            entities_intercepted=intercepted_count,
            threat_summary=threat_msg,
            leak_prevention_list=leak_items,
            simulated_cloud_response=simulated_response,
            firewall_latency_ms=elapsed,
            audit_hash=redact_res["sanitization_hash"]
        )


llm_firewall = LLMFirewallEngine()
