export interface DriverReview {
  rating: number;
  comment: string;
  date: string;
  passengerName: string;
}

export interface Driver {
  id: string;
  name: string;
  avatar: string;
  licenseNo: string;
  phone: string;
  rating: number;
  reviews: DriverReview[];
}

export interface Van {
  id: string;
  plateNo: string;
  vanType: string;
  capacity: number;
  status: "Waiting" | "Travelling" | "Departed" | "Accident" | "Completed";
  destination: string;
  departureTime: string;
  arrivalTime?: string;
  price: number;
  driverId: string;
  occupiedSeats: number[];
  pendingSeats?: number[];
  accidentReport?: string;
  date?: string;
  currentStop?: string;
  currentStopUpdatedAt?: string;
}

export interface TravelFollower {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  status: "pending" | "accepted" | "denied";
  trip?: { destination: string; currentStop?: string; status: string; departureTime: string };
}

export interface Booking {
  id: string;
  vanId: string;
  passengerName: string;
  passengerPhone: string;
  seatNo: number;
  dropOffPoint: string;
  date: string;
  timeSlot: string;
  status: "Pending Payment" | "Paid" | "Boarded" | "Alighted" | "Completed" | "Cancelled";
  createdAt: number;
  unpaidExpiresAt: number;
  paymentSlipUrl?: string;
  checkedInAt?: number;
  ticketId?: number;
  qrCode?: string;
  receiptNo?: string;
  amount?: number;
  destination?: string;
  plateNo?: string;
  driverId?: string;
  driverName?: string;
  driverPhoto?: string;
}

export interface Transaction {
  id: string;
  bookingId: string;
  passengerName: string;
  amount: number;
  status: "Success" | "Pending" | "Cancelled";
  date: string;
  time: string;
  receiptNo?: string;
}

export interface UserProfile {
  name: string;
  dob: string;
  phone: string;
  email: string;
  thaiId: string;
  passportNo?: string;
}

export interface SystemNotification {
  id: string;
  message: string;
  type: "departure" | "schedule_change" | "accident" | "payment_status";
  timestamp: string;
  isRead: boolean;
}

export type UserRole =
  | "passenger"
  | "driver"
  | "staff"
  | "accountant"
  | "dispatcher"
  | "admin";

export type EmployeeRole = "driver" | "staff" | "accountant" | "dispatcher";

export interface ManagedUser {
  id: number;
  username: string;
  name: string;
  dob: string;
  phone: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  department: string;
  employeeId: string;
  licenseId: string;
  thaiId: string;
}

export interface EmployeeAccountInput {
  username: string;
  password?: string;
  name: string;
  dob: string;
  phone: string;
  email: string;
  role: EmployeeRole;
  department: string;
  employeeId: string;
  licenseId: string;
  isActive?: boolean;
}

export interface ManagedAccountUpdateInput {
  username?: string;
  password?: string;
  name?: string;
  dob?: string;
  phone?: string;
  email?: string;
  role?: EmployeeRole | "passenger";
  department?: string;
  employeeId?: string;
  licenseId?: string;
  thaiId?: string;
  isActive?: boolean;
}

export interface SessionUser {
  username: string;
  role: UserRole;
  profile: UserProfile;
}
