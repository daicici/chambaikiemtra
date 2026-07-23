from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
CONFIG_DIR = BASE_DIR / "config"
STORAGE_DIR = BASE_DIR / "storage"
DB_PATH = STORAGE_DIR / "omr.sqlite3"


@dataclass(frozen=True)
class Bubble:
    question: int
    choice: str
    x: int
    y: int
    radius: int


@lru_cache(maxsize=1)
def load_sheet_config() -> dict:
    config_path = CONFIG_DIR / "answer_sheet_40.json"
    with config_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def target_size() -> tuple[int, int]:
    config = load_sheet_config()
    size = config["target_size"]
    return int(size["width"]), int(size["height"])


def expand_bubbles() -> list[Bubble]:
    config = load_sheet_config()
    bubbles: list[Bubble] = []
    choices = config["choices"]
    for group in config["bubble_grid"]["groups"]:
        first_question = int(group["first_question"])
        for row_index in range(10):
            y = int(group["origin_y"] + row_index * group["row_gap"])
            question = first_question + row_index
            for choice_index, choice in enumerate(choices):
                x = int(group["origin_x"] + choice_index * group["choice_gap"])
                bubbles.append(Bubble(question=question, choice=choice, x=x, y=y, radius=int(group["radius"])))
    return bubbles


def field_regions() -> dict[str, tuple[int, int, int, int]]:
    fields = load_sheet_config()["fields"]
    return {name: (int(value["x"]), int(value["y"]), int(value["w"]), int(value["h"])) for name, value in fields.items()}
