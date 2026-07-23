from io import BytesIO


def make_memory_file(data: bytes) -> BytesIO:
    return BytesIO(data)
