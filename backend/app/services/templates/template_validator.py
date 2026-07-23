def validate_template(template: dict) -> None:
    required = ["id", "normalizedWidth", "normalizedHeight", "questions", "choices", "groups", "markers", "examCodeGrid"]
    missing = [key for key in required if key not in template]
    if missing:
        raise ValueError(f"Template thieu truong: {', '.join(missing)}")
