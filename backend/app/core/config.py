from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    API_TITLE: str = "AI Kubernetes Agent"
    API_VERSION: str = "0.1.0"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = ""
    KUBECONFIG_PATH: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
