def confidence_from_scores(best: float, second: float, threshold: float) -> float:
    margin = max(0.0, best - second)
    threshold_distance = max(0.0, best - threshold)
    return round(max(0.0, min(1.0, margin * 2.5 + threshold_distance * 1.2)), 3)
