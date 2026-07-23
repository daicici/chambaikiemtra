from __future__ import annotations

import json

from ...config import TEMPLATE_PATH


def load_template() -> dict:
    with TEMPLATE_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)
