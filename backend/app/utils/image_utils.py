import cv2
import numpy as np


def encode_jpeg(image: np.ndarray) -> bytes:
    ok, buffer = cv2.imencode(".jpg", image)
    if not ok:
        return b""
    return buffer.tobytes()
