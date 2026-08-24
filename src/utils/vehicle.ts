export const VEHICLE_CAPACITIES = {
  "Toyota Commuter": 14,
  "Toyota Commuter Premium": 10,
  "Toyota Commuter VIP": 8,
} as const;

export type VehicleType = keyof typeof VEHICLE_CAPACITIES;

export const vehicleCapacity = (vehicleType: string) =>
  VEHICLE_CAPACITIES[vehicleType as VehicleType] ?? 14;
