from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from .config import BASE_DIR, load_sheet_config, target_size
from .image_quality import normalize_brightness


def load_reference_image() -> np.ndarray | None:
    config = load_sheet_config()
    reference_path = BASE_DIR / config["reference_image"]
    if not Path(reference_path).exists():
        return None
    image = cv2.imread(str(reference_path))
    if image is None:
        return None
    width, height = target_size()
    return cv2.resize(image, (width, height))


def auto_rotate(image: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    if width >= height:
        return image
    return cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)


def align_to_reference(image: np.ndarray, reference: np.ndarray | None) -> tuple[np.ndarray, float]:
    if reference is None:
        return image, 0.65

    image_gray = normalize_brightness(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY))
    reference_gray = normalize_brightness(cv2.cvtColor(reference, cv2.COLOR_BGR2GRAY))
    orb = cv2.ORB_create(2500)
    keypoints_a, descriptors_a = orb.detectAndCompute(image_gray, None)
    keypoints_b, descriptors_b = orb.detectAndCompute(reference_gray, None)
    if descriptors_a is None or descriptors_b is None or len(keypoints_a) < 12 or len(keypoints_b) < 12:
        return image, 0.55

    matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = sorted(matcher.match(descriptors_a, descriptors_b), key=lambda match: match.distance)
    good_matches = matches[: min(90, len(matches))]
    if len(good_matches) < 12:
        return image, 0.55

    source_points = np.float32([keypoints_a[match.queryIdx].pt for match in good_matches]).reshape(-1, 1, 2)
    target_points = np.float32([keypoints_b[match.trainIdx].pt for match in good_matches]).reshape(-1, 1, 2)
    homography, mask = cv2.findHomography(source_points, target_points, cv2.RANSAC, 5.0)
    if homography is None or mask is None:
        return image, 0.55

    height, width = reference.shape[:2]
    aligned = cv2.warpPerspective(image, homography, (width, height))
    inlier_ratio = float(mask.sum() / len(mask))

    try:
        warp_matrix = np.eye(2, 3, dtype=np.float32)
        criteria = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 80, 1e-5)
        aligned_gray = normalize_brightness(cv2.cvtColor(aligned, cv2.COLOR_BGR2GRAY))
        _, warp_matrix = cv2.findTransformECC(reference_gray, aligned_gray, warp_matrix, cv2.MOTION_AFFINE, criteria)
        aligned = cv2.warpAffine(aligned, warp_matrix, (width, height), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP)
        inlier_ratio = min(1.0, inlier_ratio + 0.15)
    except cv2.error:
        pass

    return aligned, max(0.0, min(1.0, inlier_ratio))
