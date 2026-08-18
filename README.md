# 🛡️ PrivacyGuard AI - Offline Multimodal Document Privacy Firewall

[![Zero-Retention Architecture](https://img.shields.io/badge/Security-Zero--Retention%20Memory--Only-00f2fe.svg)](#zero-retention-architecture)
[![Local Inference](https://img.shields.io/badge/Inference-100%25%20Offline%20%26%20Air--Gapped-00e676.svg)](#local-inference)
[![Compliance](https://img.shields.io/badge/Compliance-DPDP%202023%20%7C%20GDPR%20Art.%2025-4facfe.svg)](#regulatory-compliance)

**PrivacyGuard AI** is a production-grade, offline, multimodal RAG-powered privacy firewall for enterprise and personal documents. It inspects documents (PDFs, images, scans, and text) strictly in volatile RAM, identifies sensitive identifiers (Indian PAN, Aadhaar, Global SSN, Credit Cards, Phone Numbers, Emails, API Keys), computes granular risk confidence scores, performs surgical redaction, and enables privacy-safe vector retrieval without risking PII leakage to downstream LLMs.

---

## 🌟 Key Capabilities

1. **Air-Gapped Zero-Retention Processing**:
   - Documents are ingested into streaming in-memory RAM buffers.
   - Raw bytes are completely purged after redaction. No unmasked data is ever written to disk or swap storage.
2. **Deterministic & Heuristic PII Detection Engine**:
   - **Indian PAN Card** (`[A-Z]{5}[0-9]{4}[A-Z]`) with entity type validation.
   - **Indian Aadhaar UID** (12-digit continuous and formatted patterns).
   - **Payment Cards** (Visa, Mastercard, Amex, Rupay) with Luhn checksum validation.
   - **US Social Security Numbers (SSN)**.
   - **Passports & Driving Licenses**.
   - **Phone Numbers** (International E.164 and Indian mobile formats).
   - **Emails, IP Addresses, and High-Entropy API Secrets / JWTs**.
3. **Dynamic Privacy Risk Scoring**:
   - Asymptotic composite risk formula producing scores from **0% to 100%**.
   - Color-coded risk classification: **LOW**, **MEDIUM**, **HIGH**, and **CRITICAL**.
4. **Multimodal RAG Privacy Shield**:
   - Indexes *only sanitized* document chunks into a local vector store (compatible with PostgreSQL `pgvector`).
   - Downstream queries receive answers derived solely from redacted embeddings with cryptographic zero-leak verification.
5. **Modern Web Portal & Mobile Scaffolding**:
   - **React.js Web Admin Portal**: Drag-and-drop upload, side-by-side comparative inspection, entity matrix, and live RAG sandbox.
   - **Flutter Mobile Client**: Document scanning and mobile privacy firewall.

---

## 🏗️ System Architecture

```
                                  +---------------------------------------+
                                  |     Clients (React / Flutter App)     |
                                  +-------------------+-------------------+
                                                      |
                                                      v
                                        +-------------+-------------+
                                        | Node.js Express Gateway  |
                                        | (Stream proxy & filter)   |
                                        +-------------+-------------+
                                                      |
                                                      v
+---------------------------------------------------------------------------------------------------+
| Python FastAPI Zero-Retention Privacy Engine                                                      |
|                                                                                                   |
|  +--------------------+    +--------------------+    +--------------------+    +---------------+  |
|  | In-Memory Stream   | -> | OCR & PDF Parser   | -> | PII & Pattern      | -> | Risk Scoring  |  |
|  | (RAM Buffer)       |    | (PyPDF / Pillow)   |    | Detector Engine    |    | & Classifier  |  |
|  +--------------------+    +--------------------+    +---------+----------+    +-------+-------+  |
|                                                                |                       |          |
|                                                                v                       v          |
|  +--------------------+    +--------------------+    +--------------------+                       |
|  | Volatile Memory    | <- | Sanitized Vector   | <- | Zero-Leak Surgical | <---------------------+  |
|  | Purge Controller   |    | RAG Store          |    | Redaction Engine   |                       |
|  +--------------------+    +--------------------+    +--------------------+                       |
+---------------------------------------------------------------------------------------------------+
```

---

## 🚀 Quickstart Guide

### Prerequisites
- Python 3.10+ (tested with Python 3.14)
- Node.js 18+ and npm

### 1. Launch FastAPI Backend
```bash
cd backend
python -m pip install -r requirements.txt
python app/main.py
```
*Backend runs on `http://localhost:8000` (Swagger docs available at `http://localhost:8000/docs`).*

### 2. Run Backend Tests
```bash
pytest backend -v
```

### 3. Launch React Web Portal
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

### 4. Docker Compose (Full Stack with PostgreSQL pgvector)
```bash
docker-compose up --build
```

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/upload` | Ingests multipart document in RAM, detects PII, redacts, and indexes into sanitized RAG store. |
| `POST` | `/api/redact` | Directly redacts raw text payload with specified masking mode. |
| `POST` | `/api/rag/query` | Queries vectorized knowledge base strictly over sanitized document chunks. |
| `POST` | `/api/purge` | Instantly purges all volatile memory buffers and vector indices. |
| `GET` | `/api/health` | Health status and zero-retention compliance verification. |
| `GET` | `/api/benchmark-samples`| Returns pre-configured realistic document templates for instant testing. |

---

## ⚖️ Regulatory Compliance
- **India Digital Personal Data Protection (DPDP) Act 2023**: Ensures consent-bound, localized handling of individual identity credentials.
- **GDPR Article 25 (Data Protection by Design and by Default)**: Ensures default pseudonymization and minimization of personal data.
- **PCI-DSS Requirement 3.4**: Enforces masking and truncation of Primary Account Numbers (PANs).
