"""Tests del backend con la fuente de Vitrasa simulada (`pytest`)."""

import httpx
import pytest
from fastapi.testclient import TestClient

from main import create_app

VERCEL = "https://vbus-flame.vercel.app"

SOURCE = {
    3014: {
        "parada": [{"nombre": "Policarpo Sanz, 40", "latitud": "42.2386", "longitud": "-8.7203"}],
        "estimaciones": [
            {"linea": "11", "ruta": "Hospital Álvaro Cunqueiro", "minutos": 6},
            {"linea": "C1", "ruta": "Centro por Praza de América", "minutos": 0},
            {"linea": "C3d", "ruta": "Encarnación", "minutos": "2"},
            {"linea": "15A", "ruta": "Samil", "minutos": 9},
            {"linea": "C3i", "ruta": "Encarnación por Gran Vía", "minutos": 14},
            {"linea": "4C", "ruta": "Coia", "minutos": 18},
        ],
    },
    # Parada sin nombre en la fuente.
    5000: {"parada": {"id": 5000}, "estimaciones": []},
    # Parada inexistente.
    9999: {"parada": [], "estimaciones": []},
}


def source_handler(request: httpx.Request) -> httpx.Response:
    stop_id = int(request.url.params["id"])
    if stop_id == 666:
        return httpx.Response(503, text="Servicio no disponible")
    return httpx.Response(200, json=SOURCE[stop_id])


@pytest.fixture
def client():
    with TestClient(create_app(httpx.MockTransport(source_handler))) as test_client:
        yield test_client


def test_status(client):
    response = client.get("/status")
    assert response.status_code == 200
    assert response.text == "OK"


def test_stop(client):
    assert client.get("/stop/3014").json() == {
        "stop_id": 3014,
        "name": "Policarpo Sanz, 40",
        "lat": 42.2386,
        "lon": -8.7203,
    }


def test_stop_without_name(client):
    assert client.get("/stop/5000").json()["name"] == "Parada 5000"


def test_unknown_stop_is_404(client):
    for path in ("/stop/9999", "/buses/9999"):
        response = client.get(path)
        assert response.status_code == 404
        assert "9999" in response.json()["detail"]


def test_buses_sorted_and_limited(client):
    body = client.get("/buses/3014").json()
    assert [bus["time"] for bus in body["buses"]] == [0, 2, 6, 9, 14]
    assert body["more_buses_available"] is True
    first_bus = body["buses"][0]
    assert first_bus["line"] == "C1"
    assert first_bus["route"] == "Centro por Praza de América"
    assert len(first_bus["bus_id"]) == 32


def test_all_buses(client):
    body = client.get("/buses/3014?get_all_buses=true").json()
    assert len(body["buses"]) == 6
    assert body["more_buses_available"] is False


def test_source_failure_is_500_with_detail(client):
    response = client.get("/buses/666")
    assert response.status_code == 500
    assert response.json()["detail"].startswith("Error Vitrasa")


def test_invalid_stop_id(client):
    assert client.get("/stop/abc").status_code == 422
    assert client.get("/stop/0").status_code == 422


def test_cors_allows_vercel_and_localhost(client):
    for origin in (VERCEL, "http://localhost:5173"):
        response = client.get("/status", headers={"Origin": origin})
        assert response.headers["access-control-allow-origin"] == origin


def test_cors_preflight(client):
    response = client.options(
        "/buses/3014",
        headers={"Origin": VERCEL, "Access-Control-Request-Method": "GET"},
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == VERCEL


def test_cors_rejects_other_origins(client):
    response = client.get("/status", headers={"Origin": "https://example.com"})
    assert "access-control-allow-origin" not in response.headers
