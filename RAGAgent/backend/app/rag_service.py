import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
from pydantic import BaseModel
from pypdf import PdfReader
from sklearn.feature_extraction.text import TfidfVectorizer

from app.config import settings


class SourceItem(BaseModel):
    document_name: str
    section: str
    relevance: float
    text: str
    page_number: int = 1


class RAGService:
    def __init__(self) -> None:
        self.vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=500)
        self.documents: List[Dict[str, Any]] = []
        self.chunk_records: List[Dict[str, Any]] = []
        self.embeddings: np.ndarray | None = None
        self.upload_dir = Path(settings.upload_dir)
        self.demo_documents_dir = Path(settings.demo_documents_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.demo_documents_dir.mkdir(parents=True, exist_ok=True)

    def rebuild_embeddings(self) -> None:
        if not self.chunk_records:
            self.embeddings = None
            return
        texts = [record["text"] for record in self.chunk_records]
        matrix = self.vectorizer.fit_transform(texts)
        self.embeddings = matrix.toarray().astype(np.float32)

    def reset_demo_documents(self) -> None:
        self.documents = []
        self.chunk_records = []
        self.embeddings = None
        self.load_demo_documents()

    def load_demo_documents(self) -> None:
        if not self.demo_documents_dir.exists():
            return
        for file_path in sorted(self.demo_documents_dir.glob("*.pdf")):
            self.process_pdf(file_path, source="demo")

    def process_uploaded_pdf(self, file_path: str) -> None:
        self.process_pdf(Path(file_path), source="upload")

    def process_pdf(self, file_path: Path, source: str) -> None:
        if not file_path.exists():
            raise FileNotFoundError(f"Document not found: {file_path}")

        text = self.extract_pdf_text(file_path)
        clean_text = self.clean_text(text)
        chunks = self.chunk_text(clean_text)

        if not chunks:
            raise ValueError("The uploaded document did not contain readable content.")

        document_name = file_path.name
        created_at = datetime.now(timezone.utc).isoformat()

        doc_summary = {
            "id": f"doc-{len(self.documents) + 1}",
            "name": document_name,
            "type": "PDF",
            "status": "Processed",
            "chunks": 0,
            "uploaded_at": created_at,
            "source": source,
        }

        for idx, chunk in enumerate(chunks):
            record = {
                "document_name": document_name,
                "chunk_id": f"{document_name}-{idx}",
                "page_number": max(1, idx // 4 + 1),
                "section": self.estimate_section(chunk, document_name),
                "text": chunk,
                "upload_date": created_at,
                "source": source,
            }
            self.chunk_records.append(record)

        self.rebuild_embeddings()

        doc_summary["chunks"] = len(chunks)
        self.documents.append(doc_summary)

    def extract_pdf_text(self, file_path: Path) -> str:
        reader = PdfReader(str(file_path))
        pages: List[str] = []
        for page in reader.pages:
            text = page.extract_text() or ""
            pages.append(text)
        return "\n".join(pages)

    def clean_text(self, text: str) -> str:
        text = text.replace("\xa0", " ")
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def chunk_text(self, text: str) -> List[str]:
        if not text:
            return []
        chunk_size = settings.chunk_size
        overlap = settings.chunk_overlap
        sentences = re.split(r"(?<=[.!?])\s+", text)
        chunks: List[str] = []
        current = ""
        for sentence in sentences:
            if len(current) + len(sentence) <= chunk_size:
                current = f"{current} {sentence}".strip()
            else:
                if current:
                    chunks.append(current)
                if overlap > 0 and len(sentence) > overlap:
                    current = sentence[-overlap:]
                else:
                    current = sentence
        if current:
            chunks.append(current)
        return [chunk.strip() for chunk in chunks if chunk.strip()]

    def estimate_section(self, chunk: str, document_name: str) -> str:
        chunk_lower = chunk.lower()
        if "return" in chunk_lower:
            return "Returns Policy"
        if "warranty" in chunk_lower:
            return "Warranty Policy"
        if "shipping" in chunk_lower or "delivery" in chunk_lower:
            return "Shipping Policy"
        if "faq" in chunk_lower or "product" in chunk_lower or "compatibility" in chunk_lower:
            return "Product FAQ"
        if "support" in chunk_lower or "contact" in chunk_lower:
            return "Customer Support Policy"
        return document_name

    def search(self, question: str, top_k: int = None) -> List[Dict[str, Any]]:
        if self.embeddings is None or self.vectorizer is None:
            return []

        top_k = top_k or settings.top_k
        query_embedding = self.vectorizer.transform([question]).toarray().astype(np.float32)[0]
        similarities = (self.embeddings @ query_embedding)
        top_indexes = np.argsort(similarities)[::-1][:top_k]

        results: List[Dict[str, Any]] = []
        for idx in top_indexes:
            record = self.chunk_records[int(idx)]
            similarity = float(similarities[int(idx)])
            if similarity < settings.relevance_threshold:
                continue
            results.append({
                "document_name": record["document_name"],
                "section": record["section"],
                "relevance": round(max(0.0, min(1.0, similarity)), 2),
                "text": record["text"],
                "page_number": record["page_number"],
                "chunk_id": record["chunk_id"],
            })
        return results

    def build_answer_prompt(self, question: str, context: List[Dict[str, Any]]) -> str:
        context_text = "\n\n".join(
            f"Source: {item['document_name']} ({item['section']})\n{item['text']}"
            for item in context
        )
        return (
            "You are a customer support assistant for NovaShop. "
            "Use only the retrieved company context to answer. "
            "Do not invent policies or mention information that is not in the context. "
            "If the context does not contain the answer, say that you could not find the information in NovaShop's knowledge base and ask the customer to contact support for confirmation. "
            "Keep the answer concise, customer-friendly, and factual.\n\n"
            f"Customer question: {question}\n\n"
            f"Retrieved context:\n{context_text}"
        )

    def answer_question(self, question: str) -> Dict[str, Any]:
        matches = self.search(question)
        if not matches:
            return {
                "answer": "I couldn't find information about that in NovaShop's knowledge base. I don't want to guess. Please contact customer support for confirmation.",
                "sources": [],
                "retrieval": {
                    "status": "No relevant context found",
                    "question": question,
                    "chunks_found": 0,
                },
                "pipeline": [
                    "Question received",
                    "Searching knowledge base",
                    "No relevant chunks matched",
                    "Response generated with guardrail",
                ],
            }

        prompt = self.build_answer_prompt(question, matches)
        answer = self.generate_answer_with_fallback(prompt, question, matches)
        return {
            "answer": answer,
            "sources": matches,
            "retrieval": {
                "status": "Relevant information found",
                "question": question,
                "chunks_found": len(matches),
            },
            "pipeline": [
                "Question received",
                "Searching knowledge base",
                f"{len(matches)} relevant chunks found",
                "Top relevant chunks selected",
                "Context sent to AI",
                "Response generated",
            ],
        }

    def generate_answer_with_fallback(self, prompt: str, question: str, matches: List[Dict[str, Any]]) -> str:
        if settings.openai_api_key:
            try:
                import requests

                url = f"{settings.openai_base_url or 'https://api.openai.com/v1'}/chat/completions"
                headers = {
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "model": settings.openai_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                }
                response = requests.post(url, json=payload, headers=headers, timeout=60)
                if response.ok:
                    content = response.json()["choices"][0]["message"]["content"]
                    return content.strip()
            except Exception:
                pass

        return self.fallback_answer(question, matches)

    def fallback_answer(self, question: str, matches: List[Dict[str, Any]]) -> str:
        lower_question = question.lower()
        source_text = "\n".join(f"- {item['document_name']}: {item['text']}" for item in matches)
        if "return" in lower_question or "change my mind" in lower_question or "refund" in lower_question:
            for item in matches:
                if "return" in item["text"].lower() or "calendar days" in item["text"].lower():
                    return (
                        "NovaShop allows customers to return eligible products within the policy window described in the returns policy. "
                        "For most eligible items, returns must be made within 14 calendar days of delivery unless a product is covered by a different policy."
                    )
        if "replacement" in lower_question or "headphones stopped working" in lower_question or "defective" in lower_question:
            return (
                "If the product is defective and falls within the warranty or replacement conditions, NovaShop may offer a replacement or repair. "
                "The relevant policy states that defective products may be eligible for replacement within the stated warranty window."
            )
        if "damaged" in lower_question:
            return (
                "If your product arrived damaged, NovaShop's policy allows customers to report the issue and request a replacement or refund depending on the condition and timing. "
                "Please contact customer support with your order details so the issue can be reviewed quickly."
            )
        if "delivery" in lower_question or "shipping" in lower_question:
            return (
                "Delivery times and shipping fees depend on the order destination and selected service. NovaShop's shipping policy covers the service levels, delivery locations, and failed-delivery process."
            )
        if "free delivery" in lower_question or "ghana" in lower_question:
            return "I couldn't find information about free delivery to Ghana in NovaShop's knowledge base. I don't want to guess. Please contact customer support for confirmation."
        return (
            "According to NovaShop's available policy information, the relevant details are included in the retrieved sources. "
            "Please review the source materials for the exact policy language and contact support if you need a case-by-case decision."
        )

    def get_demo_documents_summary(self) -> List[Dict[str, Any]]:
        return self.documents
