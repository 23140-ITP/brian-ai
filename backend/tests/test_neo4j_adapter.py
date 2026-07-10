from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

import database  # noqa: E402


class FakeResult:
    def __init__(self, rows: list[dict] | None = None):
        self.rows = rows or []

    async def consume(self) -> None:
        return None

    async def data(self) -> list[dict]:
        return self.rows


class FakeSession:
    def __init__(self):
        self.calls: list[tuple[str, dict]] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return None

    async def run(self, query: str, parameters: dict | None = None):
        self.calls.append((query, parameters or {}))
        if "RETURN n.id AS id" in query:
            return FakeResult([{"id": "P-204B", "label": "Pump", "type": "Equipment", "score": 8, "details": '{"health":"Watchlist"}'}])
        if "RETURN source.id AS source" in query:
            return FakeResult([{"source": "P-204B", "target": "OISD-116-4.2", "relationship": "GOVERNED_BY"}])
        return FakeResult()

    async def execute_write(self, work):
        return await work(self)

    async def execute_read(self, work):
        return await work(self)


class FakeDriver:
    def __init__(self):
        self.session_instance = FakeSession()

    def session(self) -> FakeSession:
        return self.session_instance


class Neo4jAdapterTests(unittest.IsolatedAsyncioTestCase):
    async def test_graph_is_synced_and_loaded_through_driver(self) -> None:
        driver = FakeDriver()
        nodes = [{"id": "P-204B", "label": "Pump", "type": "Equipment", "score": 8, "details": {"health": "Watchlist"}}]
        edges = [{"source": "P-204B", "target": "OISD-116-4.2", "relationship": "GOVERNED_BY"}]

        with patch.object(database, "get_driver", return_value=driver):
            self.assertTrue(await database.sync_graph_store(nodes, edges))
            loaded = await database.load_graph_store()

        self.assertEqual(loaded, (nodes, edges))
        self.assertTrue(any("UNWIND $nodes" in query for query, _ in driver.session_instance.calls))


if __name__ == "__main__":
    unittest.main()
