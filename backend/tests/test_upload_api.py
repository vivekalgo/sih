"""
Integration tests for FastAPI endpoints in PrivacyGuard AI.
"""

import pytest
import httpx
from app.main import app


@pytest.mark.anyio
async def test_health_endpoint():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["zero_retention_mode"] is True


@pytest.mark.anyio
async def test_direct_redact_endpoint():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "text": "Employee Vikram PAN is ABCDE1234F, email: vikram@work.in",
            "masking_mode": "TOKEN"
        }
        response = await client.post("/api/redact", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["risk_assessment"]["total_entities_found"] >= 2
        assert "ABCDE1234F" not in data["masked_text"]
        assert data["zero_leak_verified"] is True


@pytest.mark.anyio
async def test_upload_text_file():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        content = b"KYC File: Aadhaar 4589 1234 5678, Phone: 9876543210"
        files = {"file": ("test_kyc.txt", content, "text/plain")}
        data = {"masking_mode": "TOKEN"}
        response = await client.post("/api/upload", files=files, data=data)
        assert response.status_code == 200
        res_json = response.json()
        assert res_json["status"] == "success"
        assert res_json["zero_retention_enforced"] is True
        assert res_json["risk_assessment"]["risk_level"] in ["HIGH", "CRITICAL", "MEDIUM"]
        assert res_json["rag_chunks_indexed"] > 0


@pytest.mark.anyio
async def test_rag_query_on_sanitized_data():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Upload
        content = b"Confidential Report: Employee ID PAN is ABCDE1234F and works on AI Privacy."
        files = {"file": ("report.txt", content, "text/plain")}
        await client.post("/api/upload", files=files)

        # 2. Query RAG
        query_payload = {"prompt": "What is the employee PAN number and what do they work on?"}
        response = await client.post("/api/rag/query", json=query_payload)
        assert response.status_code == 200
        rag_data = response.json()
        assert "ABCDE1234F" not in rag_data["answer"]
        assert rag_data["zero_leak_verified"] is True
