"""
Backend de VigoBus: API mínima con los mismos endpoints y el mismo JSON que
VigoBusAPI (https://github.com/David-Lor/VigoBusAPI), para que el frontend no
cambie, pero sin base de datos ni scraping: lee directamente la API de datos
abiertos del Concello de Vigo (la misma que usa VigoBusAPI para los tiempos).

- GET /status                              → "OK" (health check de Render)
- GET /stop/{stop_id}                      → { stop_id, name, lat, lon }
- GET /buses/{stop_id}?get_all_buses=bool  → { buses: [{ line, route, time, bus_id }],
                                               more_buses_available }

Errores con el formato `{ "detail": ... }` de FastAPI: 404 si la parada no
existe y 500 "Error Vitrasa: …" si la fuente falla (el frontend los distingue).

Arranque: `python main.py` (lee el puerto de la variable PORT, que asigna
Render; 8000 por defecto).
"""

import hashlib
import json
import logging
import os
import re
import time
from contextlib import asynccontextmanager

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException, Path, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

logger = logging.getLogger("vigobus")

SOURCE_URL = "https://datos.vigo.org/vci_api_app/api2.jsp"
SOURCE_TIMEOUT_S = 10
SOURCE_RETRIES = 1

# Como VigoBusAPI (`buses_normal_limit`): sin `get_all_buses`, los 5 primeros.
BUSES_NORMAL_LIMIT = 5
# Los tiempos cambian cada poco; el nombre de una parada, casi nunca.
BUSES_TTL_S = 15
# Como infobus de Vitrasa: se resta 1 minuto a la estimación de la fuente para
# no perder el autobús por apurar.
SAFETY_MARGIN_MIN = 1
STOPS_TTL_S = 60 * 60
CACHE_MAX_ENTRIES = 1000

# Orígenes que pueden llamar a la API desde el navegador. `CORS_ORIGINS`
# (separados por comas) sustituye a la lista por defecto.
DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://localhost:4173,https://vbus-flame.vercel.app"
CORS_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.environ.get("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
    if origin.strip()
]
# Además, cualquier despliegue del proyecto `vbus` en Vercel: producción
# (`vbus-flame`) y las previews de cada rama (`vbus-git-<rama>-…`).
# `CORS_ORIGIN_REGEX` la sustituye (vacía = desactivada).
DEFAULT_CORS_ORIGIN_REGEX = r"https://vbus(-[a-z0-9-]+)?\.vercel\.app"
CORS_ORIGIN_REGEX = os.environ.get("CORS_ORIGIN_REGEX", DEFAULT_CORS_ORIGIN_REGEX) or None


class TTLCache:
    """Caché en memoria con caducidad. Basta para una sola instancia."""

    def __init__(self, ttl_s: float, max_entries: int = CACHE_MAX_ENTRIES):
        self.ttl_s = ttl_s
        self.max_entries = max_entries
        self._data: dict = {}

    def get(self, key):
        entry = self._data.get(key)
        if entry is None or entry[0] < time.monotonic():
            self._data.pop(key, None)
            return None
        return entry[1]

    def set(self, key, value):
        if len(self._data) >= self.max_entries:
            # Se descarta la entrada más antigua (los dict mantienen el orden).
            self._data.pop(next(iter(self._data)))
        self._data[key] = (time.monotonic() + self.ttl_s, value)


class SourceError(Exception):
    """La fuente de Vitrasa falló o respondió algo que no se entiende."""


def decode_json(content: bytes):
    """La fuente no siempre manda UTF-8: con tildes ("Rúa", "AMÉRICA") llega
    en Latin-1/Windows-1252, y leerlo como UTF-8 fallaba."""
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("cp1252", errors="replace")
    return json.loads(text)


def clean_stop_name(name: str) -> str:
    """La fuente separa el número con dos espacios ("Avda. de Galicia  103");
    infobus lo muestra con coma ("Avda. de Galicia, 103")."""
    name = re.sub(r"\s{2,}(?=\d)", ", ", name.strip())
    return re.sub(r"\s+", " ", name)


def first(mapping: dict, *keys):
    for key in keys:
        if mapping.get(key) not in (None, ""):
            return mapping[key]
    return None


def to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def to_minutes(value) -> int:
    try:
        return max(0, int(float(value)))
    except (TypeError, ValueError):
        return 0


def parse_stop(stop_id: int, parada) -> dict:
    """`parada` de la fuente → Stop de VigoBusAPI. Acepta objeto o lista."""
    info = parada[0] if isinstance(parada, list) and parada else parada
    info = info if isinstance(info, dict) else {}
    name = first(info, "nombre", "name", "descripcion", "stop_name")
    return {
        "stop_id": stop_id,
        "name": clean_stop_name(str(name)) if name else f"Parada {stop_id}",
        "lat": to_float(first(info, "lat", "latitud", "latitude")),
        "lon": to_float(first(info, "lon", "lng", "longitud", "longitude")),
    }


def parse_buses(estimaciones) -> list[dict]:
    """`estimaciones` de la fuente → buses de VigoBusAPI, por orden de llegada."""
    buses = []
    for item in estimaciones or []:
        if not isinstance(item, dict):
            continue
        line = str(item.get("linea", "")).strip()
        route = str(item.get("ruta", "")).strip()
        # Sin línea real ("-"): refuerzos y servicios especiales, que infobus
        # tampoco enseña como línea.
        if not any(char.isalnum() for char in line):
            continue
        buses.append(
            {
                "line": line,
                "route": route,
                "time": max(0, to_minutes(item.get("minutos")) - SAFETY_MARGIN_MIN),
                # Como VigoBusAPI: MD5 de línea + ruta.
                "bus_id": hashlib.md5(f"{line}{route}".encode()).hexdigest(),
            }
        )
    return sorted(buses, key=lambda bus: bus["time"])


def create_app(transport: httpx.AsyncBaseTransport | None = None) -> FastAPI:
    """`transport` permite simular la fuente en los tests."""
    buses_cache = TTLCache(BUSES_TTL_S)
    stops_cache = TTLCache(STOPS_TTL_S)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        async with httpx.AsyncClient(timeout=SOURCE_TIMEOUT_S, transport=transport) as client:
            app.state.client = client
            yield

    app = FastAPI(title="VigoBus API", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_origin_regex=CORS_ORIGIN_REGEX,
        allow_methods=["GET"],
        allow_headers=["Accept"],
        max_age=600,
    )

    async def fetch_source(stop_id: int) -> dict:
        """Respuesta de la fuente para una parada (con caché de 15 s)."""
        cached = buses_cache.get(stop_id)
        if cached is not None:
            return cached
        params = {"id": stop_id, "ttl": 5, "tipo": "TRANSPORTE-ESTIMACION-PARADA"}
        last_error = None
        for _ in range(SOURCE_RETRIES + 1):
            try:
                response = await app.state.client.get(SOURCE_URL, params=params)
                response.raise_for_status()
                data = decode_json(response.content)
                break
            except (httpx.HTTPError, ValueError) as error:
                last_error = error
        else:
            logger.warning("Fallo al pedir la parada %s a Vitrasa: %r", stop_id, last_error)
            raise SourceError(f"{type(last_error).__name__}: {last_error}")
        if not isinstance(data, dict):
            raise SourceError("respuesta con un formato inesperado")
        if not data.get("parada"):
            raise HTTPException(status_code=404, detail=f"No existe la parada {stop_id}")
        buses_cache.set(stop_id, data)
        stops_cache.set(stop_id, parse_stop(stop_id, data["parada"]))
        return data

    async def fetch_or_fail(stop_id: int) -> dict:
        try:
            return await fetch_source(stop_id)
        except SourceError as error:
            raise HTTPException(status_code=500, detail=f"Error Vitrasa: {error}") from error

    @app.get("/", response_class=PlainTextResponse)
    async def root():
        # Para quien abra la URL del servicio en el navegador.
        return "VigoBus API funcionando. Prueba /status o /buses/8480."

    @app.get("/status", response_class=PlainTextResponse)
    async def status():
        return "OK"

    @app.get("/stop/{stop_id}")
    async def get_stop(stop_id: int = Path(gt=0)):
        cached = stops_cache.get(stop_id)
        if cached is not None:
            return cached
        data = await fetch_or_fail(stop_id)
        return parse_stop(stop_id, data["parada"])

    @app.get("/buses/{stop_id}")
    async def get_buses(stop_id: int = Path(gt=0), get_all_buses: bool = Query(False)):
        data = await fetch_or_fail(stop_id)
        buses = parse_buses(data.get("estimaciones"))
        if get_all_buses:
            return {"buses": buses, "more_buses_available": False}
        return {
            "buses": buses[:BUSES_NORMAL_LIMIT],
            "more_buses_available": len(buses) > BUSES_NORMAL_LIMIT,
        }

    return app


app = create_app()

if __name__ == "__main__":
    # Render asigna el puerto en la variable PORT.
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
