"""
Application configuration settings
"""

import os
from typing import List, Optional

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings from environment variables."""
    
    # Application settings
    environment: str = Field(default="development", env="ENVIRONMENT")
    debug: bool = Field(default=True, env="DEBUG")
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    
    # OpenAI configuration
    openai_api_key: str = Field(..., env="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4.1", env="OPENAI_MODEL")  # Using gpt-4.1 with Responses API
    # Let OpenAI API handle default max_tokens and temperature for optimal performance
    # openai_max_tokens: int = Field(default=2048, env="OPENAI_MAX_TOKENS") 
    # openai_temperature: float = Field(default=0.7, env="OPENAI_TEMPERATURE")
    
    # CORS settings
    frontend_url: str = Field(default="http://localhost:5173", env="FRONTEND_URL")
    
    @property
    def allowed_hosts(self) -> List[str]:
        """Get allowed hosts for CORS."""
        hosts = [self.frontend_url]
        if self.debug:
            hosts.extend([
                "http://localhost:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:3000",
            ])
        return hosts
    
    # Database settings (for future use)
    database_url: str = Field(default="sqlite:///./enculture.db", env="DATABASE_URL")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings instance."""
    return settings
