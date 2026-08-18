"""
PrivacyGuard AI - Google Gemini 1.5 Flash Contextual Privacy Copilot & Grounded PDF Chat Engine
Featuring Multi-API-Key Failover Pool with automatic rate-limit bypass and resilient local fallback.
"""

import json
import re
import os
import warnings
from typing import List, Dict, Any, Optional, Callable
from pydantic import BaseModel, Field

warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
try:
    import google.generativeai as genai
except ImportError:
    genai = None

from app.core.config import settings
from app.engine.pii_detector import detector, PIIEntity


class PIIAnalysisItem(BaseModel):
    pii_type: str = Field(..., description="Type of PII, e.g. PAN, Aadhaar, Phone Number, Email, Salary")
    value: str = Field(..., description="The raw or detected value in the document")
    status: str = Field(..., description="'Required' or 'Not Required' for the given purpose")
    reason: str = Field(..., description="Explanation of why this entity is Required or Not Required")


class DocumentAnalysisResponse(BaseModel):
    purpose: str
    detected_pii: List[PIIAnalysisItem]
    summary: str = ""
    total_detected: int = 0
    not_required_count: int = 0
    required_count: int = 0
    is_live_gemini: bool = False
    preview_image: Optional[str] = None


class GeminiCopilotEngine:
    """
    Contextual Privacy Copilot and PDF Chatbot powered by Google Gemini 1.5 Flash.
    Equipped with a Multi-API-Key Failover Pool for seamless rate-limit bypass.
    """

    def __init__(self):
        self._current_key_idx: int = 0
        self._failed_keys: set = set()

    def get_api_keys(self) -> List[str]:
        """Returns clean list of all configured Gemini API keys."""
        return settings.get_api_keys()

    @property
    def is_configured(self) -> bool:
        keys = [k for k in self.get_api_keys() if k not in self._failed_keys]
        return len(keys) > 0 and genai is not None

    def _execute_with_key_failover(self, fn: Callable[[str], Any]) -> Optional[Any]:
        """
        Executes an AI function across the pool of configured Gemini API keys.
        If a key hits a quota limit (429), auth issue, or network error, it automatically
        bypasses to the next key without crashing or surfacing errors to the user.
        """
        all_keys = self.get_api_keys()
        if not all_keys or genai is None:
            return None

        # Filter out previously permanently failed keys if other keys exist
        active_keys = [k for k in all_keys if k not in self._failed_keys] or all_keys

        num_keys = len(active_keys)
        for attempt in range(num_keys):
            idx = (self._current_key_idx + attempt) % num_keys
            api_key = active_keys[idx]

            try:
                genai.configure(api_key=api_key)
                result = fn(api_key)
                if result is not None:
                    self._current_key_idx = idx
                    return result
            except Exception as e:
                masked_key = f"{api_key[:6]}...{api_key[-4:]}" if len(api_key) > 10 else "***"
                print(f"[GeminiPool] Key {masked_key} error: {e}. Automatically bypassing to next key.")
                self._failed_keys.add(api_key)
                continue

        print("[GeminiPool] All configured API keys exhausted or unavailable. Switching to local offline engine.")
        return None

    def analyze_document(
        self,
        text_content: str,
        purpose: str = "General Sharing",
        pdf_bytes: Optional[bytes] = None,
        filename: str = "document.pdf"
    ) -> List[PIIAnalysisItem]:
        """
        Analyzes document text/PDF using Gemini 1.5 Flash against the user's stated purpose.
        Returns a strict list of PIIAnalysisItems with 'Required' or 'Not Required' status and reasoning.
        """
        # Attempt execution across Gemini multi-key pool
        gemini_result = self._execute_with_key_failover(
            lambda key: self._analyze_with_gemini_key(key, text_content, purpose, pdf_bytes)
        )

        if gemini_result and len(gemini_result) > 0:
            return gemini_result

        # Resilient local contextual fallback (guarantees zero errors in UI)
        return self._analyze_with_local_rules(text_content, purpose)

    def _analyze_with_gemini_key(
        self,
        api_key: str,
        text_content: str,
        purpose: str,
        pdf_bytes: Optional[bytes] = None
    ) -> Optional[List[PIIAnalysisItem]]:
        """Calls Gemini 1.5 Flash with structured prompt and JSON response format with fast 6s timeout."""
        system_instruction = (
            "You are a Privacy & Data Minimization Copilot. Your job is to analyze documents "
            "and identify all Personally Identifiable Information (PII) like PAN, Aadhaar, Phone Number, "
            "Email, Address, Date of Birth, Salary, Bank Account, Credit Card, SSN, Passport, etc. "
            f"Evaluate each item strictly in the context of the user's submission purpose: '{purpose}'. "
            "Classify each item as 'Required' (strictly necessary for the purpose) or 'Not Required' "
            "(unnecessary or excessive exposure that should be redacted according to data minimization principles). "
            "Provide a concise, clear reason for each classification. "
            "You MUST respond ONLY with a valid JSON array of objects. No markdown backticks, no markdown text."
        )

        prompt = f"""DOCUMENT SUBMISSION PURPOSE: "{purpose}"

DOCUMENT TEXT CONTENT:
\"\"\"
{text_content[:6000]}
\"\"\"

Analyze all PII entities present in the document.
For each entity, determine if it is "Required" or "Not Required" for the purpose: "{purpose}".

Return a strict JSON array of objects matching this exact schema:
[
  {{
    "pii_type": "string (e.g. PAN, Aadhaar, Phone Number, Email, Salary, Date of Birth, Credit Card, Bank Account)",
    "value": "exact string value as found in the text",
    "status": "Required" or "Not Required",
    "reason": "explanation why this is Required or Not Required for '{purpose}'"
  }}
]
"""

        model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=system_instruction,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.1
            }
        )

        # Fast text-only payload with strict timeout to prevent multi-minute network hangs
        response = model.generate_content([prompt], request_options={"timeout": 6.0})
        raw_output = response.text.strip() if response and response.text else "[]"
        
        # Clean markdown code blocks if any
        if raw_output.startswith("```"):
            raw_output = re.sub(r"^```(?:json)?\s*", "", raw_output)
            raw_output = re.sub(r"\s*```$", "", raw_output)

        parsed = json.loads(raw_output)
        
        results: List[PIIAnalysisItem] = []
        if isinstance(parsed, list):
            for item in parsed:
                status = "Required" if str(item.get("status", "")).strip().lower() == "required" else "Not Required"
                results.append(
                    PIIAnalysisItem(
                        pii_type=str(item.get("pii_type", "Sensitive Data")),
                        value=str(item.get("value", "")),
                        status=status,
                        reason=str(item.get("reason", f"Evaluated for purpose: {purpose}"))
                    )
                )
        return results if results else None

    def _analyze_with_local_rules(self, text: str, purpose: str) -> List[PIIAnalysisItem]:
        """
        Deterministic, intelligent rule-based privacy minimization evaluator.
        Provides robust contextual analysis even when offline or without an API key.
        """
        entities = detector.detect_entities(text)
        purpose_norm = (purpose or "General Sharing").strip().lower()

        results: List[PIIAnalysisItem] = []
        for ent in entities:
            etype = ent.entity_type
            raw_val = ent.raw_value

            status = "Not Required"
            reason = f"Not necessary for {purpose} and creates data leak risk."

            if "bank" in purpose_norm or "kyc" in purpose_norm:
                if etype in ["PAN", "AADHAAR", "AADHAAR_VID", "PHONE_NUMBER", "EMAIL", "DATE_OF_BIRTH", "IFSC_CODE", "PASSPORT", "VOTER_ID"]:
                    status = "Required"
                    reason = f"{etype} is legally required for financial identity verification and KYC compliance."
                elif etype in ["CREDIT_CARD", "API_KEY"]:
                    status = "Not Required"
                    reason = f"Full {etype} / security secrets should not be shared in KYC forms."
                else:
                    status = "Not Required"
                    reason = f"{etype} is non-essential for standard Bank KYC."

            elif "job" in purpose_norm or "resume" in purpose_norm or "employment" in purpose_norm:
                if etype in ["EMAIL", "PHONE_NUMBER"]:
                    status = "Required"
                    reason = f"Candidate contact info ({etype}) is required by recruiters for interview coordination."
                elif etype in ["PAN", "AADHAAR", "AADHAAR_VID", "SSN", "PASSPORT", "VOTER_ID"]:
                    status = "Not Required"
                    reason = f"National identity card ({etype}) is NOT needed for initial job applications and presents identity theft risk."
                elif etype in ["CREDIT_CARD", "IFSC_CODE", "UPI_ID", "API_KEY"]:
                    status = "Not Required"
                    reason = f"Financial payment details ({etype}) must be redacted before sharing resumes."
                elif etype == "DATE_OF_BIRTH":
                    status = "Not Required"
                    reason = "Date of Birth is not required for merit-based hiring and avoids age discrimination."
                else:
                    status = "Not Required"
                    reason = f"{etype} is not required for preliminary candidate evaluation."

            elif "rent" in purpose_norm or "house" in purpose_norm or "lease" in purpose_norm or "tenant" in purpose_norm:
                if etype in ["PHONE_NUMBER", "EMAIL", "PAN", "AADHAAR", "AADHAAR_VID"]:
                    status = "Required"
                    reason = f"Basic tenant identity ({etype}) is standard for rental agreements and police verification."
                elif etype in ["CREDIT_CARD", "API_KEY"]:
                    status = "Not Required"
                    reason = f"{etype} is confidential financial data not needed by landlords."
                elif etype in ["IFSC_CODE", "UPI_ID"]:
                    status = "Required"
                    reason = "Account / UPI details needed for monthly rent payment transfers."
                else:
                    status = "Not Required"
                    reason = f"{etype} is excessive for rental agreements."

            else:  # General Sharing / Vendor / Default
                if etype in ["EMAIL", "PHONE_NUMBER"]:
                    status = "Not Required"
                    reason = f"Recommended to redact contact information ({etype}) for general public sharing."
                else:
                    status = "Not Required"
                    reason = f"Data minimization principle: {etype} is sensitive and should be redacted for general sharing."

            results.append(
                PIIAnalysisItem(
                    pii_type=etype,
                    value=raw_val,
                    status=status,
                    reason=reason
                )
            )

        # Detect salary / financial keywords if present in text but missed by entity detector
        salary_match = re.search(r"(?:Salary|CTC|Compensation|Annual Pay|Stipend)[\s:\-]*([₹$€£]?\s*[\d,]+(?:\.\d+)?(?:\s*(?:LPA|k|per month|p\.a\.))?)", text, re.IGNORECASE)
        if salary_match:
            val = salary_match.group(0).strip()
            is_job = "job" in purpose_norm or "resume" in purpose_norm
            results.append(
                PIIAnalysisItem(
                    pii_type="Salary / Compensation",
                    value=val,
                    status="Not Required" if is_job else "Not Required",
                    reason="Salary information is confidential and should be redacted during job applications." if is_job else f"Financial compensation detail is not required for {purpose}."
                )
            )

        return results

    def chat_with_document(
        self,
        document_text: str,
        message: str,
        pdf_bytes: Optional[bytes] = None,
        filename: str = "document.pdf"
    ) -> Dict[str, Any]:
        """
        Strict document-grounded chatbot.
        System instruction:
        "You are a privacy assistant. Answer ONLY based on the provided document. If the answer is not in the document, reply: 'I can only answer questions related to this document.'"
        """
        clean_msg = message.strip()

        # Try Gemini across key pool
        chat_res = self._execute_with_key_failover(
            lambda key: self._chat_with_gemini_key(key, document_text, clean_msg, pdf_bytes)
        )

        if chat_res is not None:
            return chat_res

        # Resilient local grounded chat engine
        return self._local_grounded_chat(document_text, clean_msg, filename)

    def _chat_with_gemini_key(
        self,
        api_key: str,
        document_text: str,
        message: str,
        pdf_bytes: Optional[bytes] = None
    ) -> Optional[Dict[str, Any]]:
        """Calls Gemini/Gemma grounded chat with multilingual instruction and model fallback."""
        system_instruction = (
            "You are a helpful, expert document assistant and data privacy copilot. "
            "Answer questions directly, politely, and accurately based ONLY on the provided document. "
            "If the user asks in Hindi or Hinglish (e.g. 'yha koi sensitive information hai', 'contact details kya hai'), "
            "respond naturally in their language. "
            "When asked about sensitive information or PII, clearly list the personal/sensitive identifiers present in the document "
            "(such as Phone Numbers, Email, Address, Names, PAN, Aadhaar, IDs, etc.) and give privacy advice. "
            "When asked for a summary, main points, or contact details, use clean, well-formatted bullet points. "
            "If the user asks something completely outside this document, reply: 'I can only answer questions related to this document.'"
        )

        prompt = f"""DOCUMENT CONTENT:
\"\"\"
{document_text[:12000]}
\"\"\"

USER QUESTION:
{message}
"""
        # Try working models in order of capability
        candidate_models = [settings.GEMINI_MODEL, "gemini-flash-latest", "gemini-3.6-flash", "gemini-3.7-flash", "gemma-4-26b-a4b-it"]
        seen_models = set()
        
        for m_name in candidate_models:
            if not m_name or m_name in seen_models:
                continue
            seen_models.add(m_name)
            try:
                model = genai.GenerativeModel(
                    model_name=m_name,
                    system_instruction=system_instruction,
                    generation_config={
                        "temperature": 0.1,
                        "max_output_tokens": 1000
                    }
                )
                response = model.generate_content([prompt], request_options={"timeout": 6.0})
                if response and response.text:
                    answer = response.text.strip()
                    # Clean any model thought / reasoning headers
                    if "</think>" in answer:
                        answer = answer.split("</think>")[-1].strip()
                    if "I can only answer questions related to this document" in answer:
                        answer = "I can only answer questions related to this document."
                    return {
                        "query": message,
                        "response": answer,
                        "answer": answer,
                        "is_live_gemini": True,
                        "grounded_in_document": answer != "I can only answer questions related to this document."
                    }
            except Exception as e:
                print(f"[GeminiChat] Model {m_name} notice: {e}")
                continue

        return None

    def _local_grounded_chat(self, document_text: str, query: str, filename: str) -> Dict[str, Any]:
        """
        Intelligent, semantic offline document assistant.
        Handles natural language questions in English and Hinglish:
        - Sensitive info / PII queries
        - Contact info queries
        - Summary / Overview queries
        - Experience & Work history
        - Technical Skills
        - Education & Qualifications
        - General semantic question answering
        """
        clean_q = query.strip()
        q_lower = clean_q.lower()
        doc_lower = document_text.lower()

        # 1. SENSITIVE INFO / PRIVACY / PII QUERIES
        # E.g.: "yha koi sensitive information hai", "kya sensitive data hai", "what PII is in this document?", "is there any private data?"
        if any(k in q_lower for k in [
            "sensitive", "pii", "leak", "private", "privacy", "secret", "aadhar", "aadhaar", "pan",
            "chupana", "chupaye", "hide", "mask", "suraksha", "kya chupayein", "koi sensitive", "kya data",
            "personal info", "personal data"
        ]):
            entities = detector.detect_entities(document_text)
            
            # Also extract phone numbers, emails, locations directly
            phone_matches = re.findall(r"(\+?\d[\d\s\-]{8,}\d)", document_text)
            email_matches = re.findall(r"([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)", document_text)
            loc_match = re.search(r"(?:Location|Address|City|State|Residing)[\s:\-]+([^\n\r]+)", document_text, re.I)
            
            found_items = []
            seen_vals = set()
            for ent in entities:
                if ent.raw_value and ent.raw_value.lower() not in seen_vals:
                    seen_vals.add(ent.raw_value.lower())
                    found_items.append((ent.entity_type.replace("_", " ").title(), ent.raw_value))
            
            for pm in phone_matches:
                clean_pm = pm.strip()
                if len(clean_pm) >= 10 and clean_pm.lower() not in seen_vals:
                    seen_vals.add(clean_pm.lower())
                    found_items.append(("Mobile / Phone", clean_pm))
                    
            for em in email_matches:
                clean_em = em.strip()
                if clean_em.lower() not in seen_vals:
                    seen_vals.add(clean_em.lower())
                    found_items.append(("Email Address", clean_em))

            if loc_match and loc_match.group(1).strip().lower() not in seen_vals:
                found_items.append(("Location / Address", loc_match.group(1).strip()))

            if found_items:
                ans_lines = [
                    f"Haan, **'{filename}'** me nimnlikhit sensitive / personal identifiers paye gaye hain:\n"
                ]
                for label, val in found_items[:8]:
                    ans_lines.append(f"• **{label}**: `{val}`")
                
                ans_lines.append("\n🔒 **Privacy Recommendation**: Data minimization ke tahat in details ko third-party ya public platform par share karne se pehle mask / redact karna safe hai.")
                answer = "\n".join(ans_lines)
            else:
                answer = f"**'{filename}'** me koi direct high-risk sensitive identifier (jaise PAN, Aadhaar, Card details) detect nahi hua hai."

            return {
                "query": query,
                "response": answer,
                "answer": answer,
                "is_live_gemini": False,
                "grounded_in_document": True
            }

        # 2. CONTACT DETAILS / PHONE / EMAIL / LOCATION QUERIES
        # E.g.: "Which contact details are listed?", "contact details kya hai", "phone number kya hai", "email kya hai", "kaha rehta hai"
        if any(k in q_lower for k in [
            "contact", "phone", "mobile", "email", "mail", "number", "address", "location", "sampark",
            "reach", "call", "kaha", "kahan", "rehti", "rehta", "address kya hai"
        ]):
            contacts = []
            phone_matches = re.findall(r"(\+?\d[\d\s\-]{8,}\d)", document_text)
            email_matches = re.findall(r"([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)", document_text)
            loc_match = re.search(r"(?:Location|Address|City|State|Residing)[\s:\-]+([^\n\r]+)", document_text, re.I)
            
            for p in phone_matches:
                if len(p.strip()) >= 10:
                    contacts.append(f"• **Phone Number**: `{p.strip()}`")
            for e in email_matches:
                contacts.append(f"• **Email Address**: `{e.strip()}`")
            if loc_match:
                contacts.append(f"• **Location / Address**: {loc_match.group(1).strip()}")

            if contacts:
                answer = f"**'{filename}'** me listed contact details:\n\n" + "\n".join(contacts)
            else:
                answer = f"**'{filename}'** me koi direct phone ya email contact details nahi mili."

            return {
                "query": query,
                "response": answer,
                "answer": answer,
                "is_live_gemini": False,
                "grounded_in_document": True
            }

        # 3. SKILLS / TECHNICAL EXPERTISE QUERIES
        # E.g.: "What are the technical skills?", "skills kya hai", "kya kaam aata hai"
        if any(k in q_lower for k in ["skill", "technical", "tools", "competenc", "kaam aata", "abilities"]):
            skills_sec = re.search(r"(?:TECHNICAL SKILLS|SKILLS|KEY COMPETENCIES|EXPERTISE)[\s:\-]+([^\n\r]+(?:\n[^\n\r]+){1,6})", document_text, re.I)
            if skills_sec:
                raw_skills = skills_sec.group(1).strip()
                skill_lines = [re.sub(r"^[•\-\*]\s*", "", l).strip() for l in raw_skills.splitlines() if l.strip()]
                formatted = [f"• {s}" for s in skill_lines if len(s) > 3]
                answer = f"**'{filename}'** me listed technical skills:\n\n" + "\n".join(formatted[:6])
                return {
                    "query": query,
                    "response": answer,
                    "answer": answer,
                    "is_live_gemini": False,
                    "grounded_in_document": True
                }

        # 4. EXPERIENCE / WORK HISTORY QUERIES
        # E.g.: "What is the experience?", "experience kya hai", "kaha kaam kiya", "work history"
        if any(k in q_lower for k in ["experience", "work", "job", "employment", "history", "hospital", "center", "centre", "kaam kiya"]):
            exp_sec = re.search(r"(?:PROFESSIONAL EXPERIENCE|EXPERIENCE|EMPLOYMENT HISTORY)[\s:\-]+([^\n\r]+(?:\n[^\n\r]+){1,6})", document_text, re.I)
            if exp_sec:
                raw_exp = exp_sec.group(1).strip()
                exp_lines = [re.sub(r"^[•\-\*]\s*", "", l).strip() for l in raw_exp.splitlines() if l.strip()]
                formatted = [f"• {e}" for e in exp_lines if len(e) > 3]
                answer = f"**'{filename}'** me listed work experience:\n\n" + "\n".join(formatted[:6])
                return {
                    "query": query,
                    "response": answer,
                    "answer": answer,
                    "is_live_gemini": False,
                    "grounded_in_document": True
                }

        # 5. SUMMARY / OVERVIEW / MAIN POINTS QUERIES
        # E.g.: "What are the main points?", "Summarize the key information", "summary kya hai", "kya document hai", "kiske bare me hai"
        if any(k in q_lower for k in [
            "summary", "summarize", "main point", "key information", "overview", "kya hai",
            "kiske baare", "kiske bare", "document kya", "details", "short summary"
        ]):
            non_empty_lines = [l.strip() for l in document_text.splitlines() if l.strip()]
            header_title = non_empty_lines[0] if non_empty_lines else "Uploaded Document"
            role_subtitle = non_empty_lines[1] if len(non_empty_lines) > 1 and len(non_empty_lines[1]) < 60 else ""
            
            bullet_matches = re.findall(r"(?:^[•\-\*]\s*)([^\n\r]+)", document_text, re.M)
            
            summary_points = []
            if header_title:
                summary_points.append(f"• **Candidate / Title**: {header_title} {f'({role_subtitle})' if role_subtitle else ''}")
            
            summary_sec = re.search(r"(?:PROFESSIONAL SUMMARY|SUMMARY|OBJECTIVE|PROFILE)[\s:\-]+([^\n\r]+(?:\n[^\n\r]+){1,3})", document_text, re.I)
            if summary_sec:
                clean_sec = summary_sec.group(1).strip().replace("\n", " ")
                summary_points.append(f"• **Professional Summary**: {clean_sec[:180]}...")

            if bullet_matches:
                for b in bullet_matches[:4]:
                    b_clean = b.strip()
                    if b_clean and b_clean not in summary_points and not b_clean.startswith("I hereby declare"):
                        summary_points.append(f"• {b_clean}")

            if summary_points:
                answer = f"**'{filename}'** ki key summary aur main points:\n\n" + "\n".join(summary_points)
            else:
                answer = f"Based on '{filename}':\n\n" + "\n".join([f"• {l}" for l in non_empty_lines[:4]])

            return {
                "query": query,
                "response": answer,
                "answer": answer,
                "is_live_gemini": False,
                "grounded_in_document": True
            }

        # 6. GENERAL SEARCH OVER PARAGRAPHS & SENTENCES
        query_words = [w for w in re.findall(r"\b[a-zA-Z0-9]{3,}\b", q_lower) if w not in {"what", "when", "where", "which", "who", "whom", "whose", "why", "how", "this", "that", "the", "and", "for", "with", "kya", "hai", "koi", "are", "from"}]
        
        matches = [w for w in query_words if w in doc_lower]
        if not matches and len(query_words) > 0 and not any(w in q_lower for w in ["document", "file", "text", "page", "pdf", "info"]):
            refusal = "I can only answer questions related to this document."
            return {
                "query": query,
                "response": refusal,
                "answer": refusal,
                "is_live_gemini": False,
                "grounded_in_document": False
            }

        # Extract full meaningful lines (excluding standalone declarations)
        lines = [l.strip() for l in document_text.splitlines() if len(l.strip()) > 10 and not l.strip().lower().startswith("i hereby declare")]
        scored_lines = []
        for l in lines:
            l_lower = l.lower()
            score = sum(2 for w in query_words if w in l_lower)
            if score > 0:
                scored_lines.append((score, l))

        scored_lines.sort(key=lambda x: x[0], reverse=True)
        if scored_lines:
            top_answers = []
            for item in scored_lines[:4]:
                cleaned = re.sub(r"^[\s\•\-\*\—\–\.\d\)]+", "", item[1]).strip()
                if cleaned and cleaned not in top_answers:
                    top_answers.append(cleaned)
            answer = f"Based on **{filename}**:\n\n" + "\n".join([f"• {a}" for a in top_answers])
        else:
            answer = "I can only answer questions related to this document."

        return {
            "query": query,
            "response": answer,
            "answer": answer,
            "is_live_gemini": False,
            "grounded_in_document": "I can only answer" not in answer
        }


gemini_copilot = GeminiCopilotEngine()
