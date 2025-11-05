"""
Logging configuration for the application
"""

import logging
import sys
from typing import Any, Dict

from app.core.config import settings


def setup_logging() -> None:
    """Set up application logging configuration."""
    
    # Configure root logger
    log_level = logging.DEBUG if settings.debug else logging.INFO
    
    # Create formatter
    formatter = logging.Formatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Configure console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.addHandler(console_handler)
    
    # Configure specific loggers
    loggers_config = {
        "uvicorn": logging.INFO,
        "uvicorn.access": logging.INFO,
        "openai": logging.WARNING,  # Reduce OpenAI library verbosity
        "httpx": logging.WARNING,   # Reduce HTTP client verbosity
    }
    
    for logger_name, level in loggers_config.items():
        logger = logging.getLogger(logger_name)
        logger.setLevel(level)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance for the given name."""
    return logging.getLogger(name)
