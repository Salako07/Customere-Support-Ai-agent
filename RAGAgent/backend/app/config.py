import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(WORKSPACE_ROOT / ".env")


def resolve_path(value: str | None, default_subpath: str) -> str:
    if value is None or value == "":
        return str(WORKSPACE_ROOT / default_subpath)
    path = Path(value)
    if path.is_absolute():
        return str(path)
    return str(WORKSPACE_ROOT / path)


@dataclass
class Settings:
    app_name: str = "NovaShop AI Customer Support"
    backend_port: int = int(os.getenv("BACKEND_PORT", "8000"))
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    demo_mode: bool = os.getenv("DEMO_MODE", "true").lower() == "true"
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "600"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "120"))
    top_k: int = int(os.getenv("TOP_K", "5"))
    relevance_threshold: float = float(os.getenv("RELEVANCE_THRESHOLD", "0.10"))
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "")
    upload_dir: str = resolve_path(os.getenv("UPLOAD_DIR"), "backend/data/uploads")
    demo_documents_dir: str = resolve_path(os.getenv("DEMO_DOCUMENTS_DIR"), "backend/data/demo_documents")


settings = Settings()
