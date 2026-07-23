from __future__ import annotations


def iter_bubble_coordinates(template: dict) -> list[dict]:
    bubbles: list[dict] = []
    choices = template["choices"]
    for group in template["groups"]:
        for row_index, question in enumerate(range(group["start"], group["end"] + 1)):
            y = group["y"] + row_index * group["rowGap"]
            for choice_index, choice in enumerate(choices):
                x = group["x"] + choice_index * group["choiceGap"]
                bubbles.append({"question": question, "choice": choice, "x": x, "y": y, "radius": group["radius"]})
    return bubbles
