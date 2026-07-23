from __future__ import annotations

import json

from ...config import TEMPLATE_PATH
from .template_validator import validate_template


def load_template() -> dict:
    with TEMPLATE_PATH.open("r", encoding="utf-8") as file:
        template = json.load(file)
    validate_template(template)
    return template
