def safe_filename(name: str) -> str:
    return "".join(character for character in name if character.isalnum() or character in {"-", "_", "."})
