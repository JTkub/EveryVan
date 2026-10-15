"""Ordered shared pickup/drop-off stops, including the final destination."""
ORIGIN_BOARDING_POINTS = (
    "สถานีขนส่งผู้โดยสารกรุงเทพฯ (หมอชิต 2)",
    "สถานีขนส่งเอกมัย (Ekkamai)",
    "สถานีขนส่งผู้โดยสารสายใต้ใหม่ (Southern Bus Terminal)",
    "จุดจอดรถตู้รังสิต (Rangsit)",
)


def route_stops(points, destination):
    stops = list(dict.fromkeys(point.strip() for point in (points or []) if point.strip()))
    return [point for point in stops if point != destination] + [destination]
