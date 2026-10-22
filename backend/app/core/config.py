import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "chatapp"

    # Optional: explicit path to SSL CA cert (e.g. for Aiven, PlanetScale, etc.)
    # If not set, auto-detected as "ca.pem" next to this config when DB_HOST != localhost
    DB_SSL_CA: Optional[str] = None

    FRONTEND_URL: str = "http://localhost:5173"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def USE_SSL(self) -> bool:
        """True when connecting to a remote (non-localhost) MySQL host."""
        return self.DB_HOST not in ("localhost", "127.0.0.1", "::1")

    @property
    def SSL_CA_PATH(self) -> Optional[str]:
        """
        Returns absolute path to the CA cert, or None if SSL is not needed.
        Priority:
          1. DB_SSL_CA env variable (can be absolute or relative to cwd)
          2. ca.pem sitting next to the backend root (auto-discovery)
          3. None (no SSL)
        """
        if not self.USE_SSL:
            return None

        if self.DB_SSL_CA:
            # Could be absolute or relative
            p = os.path.abspath(self.DB_SSL_CA)
            return p if os.path.isfile(p) else None

        # Auto-discover: look for ca.pem two levels up from this file
        # __file__ = .../backend/app/core/config.py  →  backend/ = ../../
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        ca_path = os.path.join(backend_dir, "ca.pem")
        return ca_path if os.path.isfile(ca_path) else None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
