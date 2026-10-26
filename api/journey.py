"""Ordered shared pickup/drop-off stops, including the final destination."""
ORIGIN_BOARDING_POINTS = (
    "สถานีขนส่งผู้โดยสารกรุงเทพฯ (หมอชิต 2)",
    "สถานีขนส่งเอกมัย (Ekkamai)",
    "สถานีขนส่งผู้โดยสารสายใต้ใหม่ (Southern Bus Terminal)",
    "จุดจอดรถตู้รังสิต (Rangsit)",
)


def route_endpoints(data):
    # Older clients omitted origin because all routes started in Bangkok.
    origin = data.get("origin", "กรุงเทพฯ")
    destination = data.get("destination", "")
    if not all(isinstance(value, str) and value.strip() and len(value.strip()) <= 150
               for value in (origin, destination)):
        raise ValueError("กรุณาระบุต้นทางและปลายทางไม่เกิน 150 ตัวอักษร")
    origin, destination = origin.strip(), destination.strip()
    if origin == destination:
        raise ValueError("ต้นทางและปลายทางต้องเป็นคนละจุด")
    return origin, destination


def origin_boarding_points(origin):
    # Retain the existing terminal choices only for the legacy Bangkok origin.
    return (origin, *ORIGIN_BOARDING_POINTS) if origin == "กรุงเทพฯ" else (origin,)


def route_stops(points, destination, origin=None):
    stops = list(dict.fromkeys(point.strip() for point in (points or []) if point.strip()))
    return [point for point in stops if point not in (origin, destination)] + [destination]
