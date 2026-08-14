import os
from typing import Any, Dict, List

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.rag_service import RAGService

app = FastAPI(title=settings.app_name, version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_service = RAGService()


@app.on_event("startup")
async def startup_event() -> None:
    os.makedirs(settings.upload_dir, exist_ok=True)
    if settings.demo_mode:
        rag_service.load_demo_documents()


@app.get("/api/health")
async def health() -> Dict[str, Any]:
    return {"status": "ok", "app": settings.app_name}


@app.get("/api/demo-questions")
async def demo_questions() -> Dict[str, Any]:
    return {
        "questions": [
            "How long do I have to return a product?",
            "My headphones stopped working after 20 days. Can I get a replacement?",
            "How much time do I have if I change my mind about something I bought?",
            "Do you offer free delivery to Ghana?",
            "What if the product arrived damaged?",
        ]
    }


@app.get("/api/documents")
async def list_documents() -> Dict[str, Any]:
    return {"documents": rag_service.documents}


@app.post("/api/demo/reset")
async def reset_demo() -> Dict[str, Any]:
    rag_service.reset_demo_documents()
    return {"status": "success", "documents": rag_service.documents}


@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)) -> Dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for this demo.")

    save_path = os.path.join(settings.upload_dir, file.filename)
    with open(save_path, "wb") as f:
        content = await file.read()
        f.write(content)

    try:
        rag_service.process_uploaded_pdf(save_path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Document processing failed: {str(exc)}") from exc

    return {"status": "success", "documents": rag_service.documents}


@app.post("/api/chat")
async def chat(payload: Dict[str, str]) -> Dict[str, Any]:
    question = (payload.get("question") or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="A question is required.")

    result = rag_service.answer_question(question)
    return result


@app.get("/api/how-it-works")
async def how_it_works() -> Dict[str, Any]:
    return {
        "steps": [
            {
                "title": "Business Documents",
                "description": "NovaShop stores its policies and product information in documents that the AI can reference.",
            },
            {
                "title": "Chunking",
                "description": "Large documents are split into meaningful chunks so the system can search for the most relevant information.",
            },
            {
                "title": "Embeddings",
                "description": "The system converts text into numerical representations so it can find information with similar meaning.",
            },
            {
                "title": "Vector Database",
                "description": "The embeddings are stored in a searchable index that supports similarity-based retrieval.",
            },
            {
                "title": "Customer Question",
                "description": "A customer question is turned into an embedding and matched against the stored knowledge base.",
            },
            {
                "title": "Retrieval",
                "description": "The system finds the most relevant chunks and passes only the supporting evidence to the LLM.",
            },
            {
                "title": "Relevant Context",
                "description": "The retrieved chunks are used as context so the answer stays grounded in company policy and facts.",
            },
            {
                "title": "LLM",
                "description": "The model generates a customer-friendly answer based only on the retrieved context.",
            },
            {
                "title": "Answer",
                "description": "The final response is shown together with the actual source material used to answer the question.",
            },
        ]
    }
