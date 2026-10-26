import { describe, expect, it } from "vitest";
import { tripStops, boardingOptionsFor, dropOffOptionsFor, canTravelBetween } from "./journey";
import type { Van } from "../types/domain";

const origin = ["หมอชิต", "เอกมัย"];
const van: Van = {
  id: "1", plateNo: "TEST", vanType: "Toyota Commuter", capacity: 14,
  status: "Waiting", origin: "กรุงเทพฯ", destination: "พัทยา", dropOffPoints: ["บางนา", "ชลบุรี"],
  departureTime: "10:00", price: 250, driverId: "1", occupiedSeats: [],
};

describe("Shared route pickup and drop-off points", () => {
  it("lets a stop be a pickup for one passenger and a drop-off for another", () => {
    expect(boardingOptionsFor(van, origin)).toEqual(["กรุงเทพฯ", "หมอชิต", "เอกมัย", "บางนา", "ชลบุรี"]);
    expect(dropOffOptionsFor(van, "หมอชิต")).toContain("บางนา");
    expect(dropOffOptionsFor(van, "บางนา")).toEqual(["ชลบุรี", "พัทยา"]);
    expect(canTravelBetween(van, origin, "หมอชิต", "บางนา")).toBe(true);
    expect(canTravelBetween(van, origin, "บางนา", "พัทยา")).toBe(true);
  });

  it("keeps the current and future pickup stops open while travelling", () => {
    const moving: Van = { ...van, status: "Travelling", currentStop: "บางนา" };
    expect(boardingOptionsFor(moving, origin)).toEqual(["บางนา", "ชลบุรี"]);
    expect(canTravelBetween(moving, origin, "ชลบุรี", "พัทยา")).toBe(true);
    expect(canTravelBetween(moving, origin, "หมอชิต", "พัทยา")).toBe(false);
    expect(boardingOptionsFor({ ...moving, currentStop: "ชลบุรี" }, origin)).toEqual(["ชลบุรี"]);
    expect(boardingOptionsFor({ ...moving, currentStop: "พัทยา" }, origin)).toEqual([]);
  });

  it("rejects equal, reverse or unknown stops and closed trips", () => {
    for (const [pickup, dropOff] of [["บางนา", "บางนา"], ["ชลบุรี", "บางนา"], ["อื่นๆ", "พัทยา"], ["พัทยา", "บางนา"]]) {
      expect(canTravelBetween(van, origin, pickup, dropOff)).toBe(false);
    }
    for (const status of ["Completed", "Accident"] as const) {
      expect(canTravelBetween({ ...van, status }, origin, "บางนา", "พัทยา")).toBe(false);
    }
  });

  it("uses route order for paired search filters instead of matching stops independently", () => {
    expect(canTravelBetween(van, origin, "ชลบุรี", "บางนา")).toBe(false);
    expect(canTravelBetween(van, origin, "", "บางนา")).toBe(true);
    expect(canTravelBetween({ ...van, status: "Departed", currentStop: "บางนา" }, origin, "", "บางนา")).toBe(false);
  });

  it("adds the destination once at the end and supports trips without intermediate stops", () => {
    expect(tripStops({ ...van, dropOffPoints: ["พัทยา", "บางนา", "บางนา", "ชลบุรี"] })).toEqual(["บางนา", "ชลบุรี", "พัทยา"]);
    expect(boardingOptionsFor({ ...van, dropOffPoints: [] }, origin)).toEqual(["กรุงเทพฯ", ...origin]);
    expect(dropOffOptionsFor({ ...van, dropOffPoints: [] }, "หมอชิต")).toEqual(["พัทยา"]);
  });

  it("uses the return trip origin without adding Bangkok terminals as pickup options", () => {
    const returning = { ...van, origin: "พัทยา", destination: "กรุงเทพฯ", dropOffPoints: ["พัทยา", "ชลบุรี", "บางนา", "กรุงเทพฯ"] };
    expect(tripStops(returning)).toEqual(["ชลบุรี", "บางนา", "กรุงเทพฯ"]);
    expect(boardingOptionsFor(returning, origin)).toEqual(["พัทยา", "ชลบุรี", "บางนา"]);
    expect(dropOffOptionsFor(returning, "พัทยา")).toEqual(["ชลบุรี", "บางนา", "กรุงเทพฯ"]);
    expect(canTravelBetween(returning, origin, "พัทยา", "กรุงเทพฯ")).toBe(true);
    expect(canTravelBetween(returning, origin, "หมอชิต", "กรุงเทพฯ")).toBe(false);
    expect(canTravelBetween(returning, origin, "บางนา", "ชลบุรี")).toBe(false);
    expect(boardingOptionsFor({ ...returning, status: "Travelling", currentStop: "ชลบุรี" }, origin)).toEqual(["ชลบุรี", "บางนา"]);
  });
});
