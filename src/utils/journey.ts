import type { Van } from "../types/domain";

/** Stops share pickup/drop-off roles; the final destination is always last. */
export const tripStops = (van: Van): string[] => [
  ...new Set((van.dropOffPoints || []).map((stop) => stop.trim()).filter((stop) => stop && stop !== van.destination)),
  van.destination,
];

export const boardingOptionsFor = (van: Van, originPoints: string[]): string[] => {
  const stops = tripStops(van);
  if (van.status === "Waiting") {
    return [...new Set([...originPoints, ...stops.slice(0, -1)])].filter((stop) => stop !== van.destination);
  }
  if (van.status !== "Departed" && van.status !== "Travelling") return [];
  const currentIndex = van.currentStop ? stops.indexOf(van.currentStop) : -1;
  // The current stop stays open for pickup until the next arrival is recorded.
  return stops.slice(Math.max(currentIndex, 0), -1);
};

export const dropOffOptionsFor = (van: Van, boardingPoint: string): string[] => {
  const stops = tripStops(van);
  return stops.slice(stops.indexOf(boardingPoint) + 1);
};

export const canTravelBetween = (van: Van, originPoints: string[], boardingPoint: string, dropOffPoint: string): boolean =>
  boardingOptionsFor(van, originPoints).some((stop) =>
    (!boardingPoint || stop === boardingPoint) &&
    (!dropOffPoint || dropOffOptionsFor(van, stop).includes(dropOffPoint)),
  );
