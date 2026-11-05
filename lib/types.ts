export type RoomType = "Standard" | "Deluxe" | "Suite";
export type HK = "Clean" | "Dirty" | "Inspected";
export interface Room { no: string; floor: number; type: RoomType; fo: "Vacant" | "Occupied"; hk: HK; ooo: boolean; oooReason?: string; resId?: string }
export interface Guest { id: string; name: string; phone: string; email: string; vip: number; membership: "None" | "Silver" | "Gold" | "Platinum"; prefs: string[]; requests: string }
export type Guarantee = "None" | "Credit Card" | "Deposit" | "Company";
export type ResStatus = "Reserved" | "Checked In" | "Checked Out" | "Cancelled" | "No Show";
export interface Reservation {
  id: string; confNo: string; guestId: string; arrival: string; departure: string; nights: number;
  roomType: RoomType; adults: number; rateCode: string; rate: number; guarantee: Guarantee;
  status: ResStatus; room?: string; idVerified?: boolean; request: string; cancelReason?: string;
}
export interface FolioLine { id: string; code: string; desc: string; amount: number; kind: "charge" | "payment"; date: string; by: string }
export type ScreenId = "dashboard" | "newres" | "reservations" | "profiles" | "arrivals" | "inhouse" | "departures" | "rooms" | "folio" | "audit" | "reports";
export type OperaMode = "cloud" | "opera5";
export interface HotelData { rooms: Room[]; guests: Guest[]; reservations: Reservation[]; folios: Record<string, FolioLine[]> }

/** 시뮬레이터에서 발생하는 모든 학습자 행동 */
export type Ev =
  | { t: "login" } | { t: "nav"; screen: ScreenId }
  | { t: "search"; kind: "guest" | "res"; q: string }
  | { t: "profile.save"; guest: Pick<Guest, "name" | "phone" | "vip" | "prefs">; ok: boolean }
  | { t: "profile.update"; id: string; requests: string }
  | { t: "res.save"; draft: { guestName: string; arrival: string; departure: string; roomType: RoomType; adults: number; rateCode: string; rate: number; guarantee: Guarantee }; ok: boolean }
  | { t: "res.open"; id: string } | { t: "res.modify"; id: string; nightsBefore: number; nightsAfter: number }
  | { t: "res.cancel"; id: string; reason: string }
  | { t: "ci.select"; resId: string } | { t: "ci.id"; resId: string }
  | { t: "ci.assign"; resId: string; room: string; ok: boolean; reason?: "dirty" | "ooo" | "occupied" | "type" | "none" }
  | { t: "ci.guarantee"; resId: string } | { t: "ci.request"; resId: string; text: string } | { t: "ci.complete"; resId: string }
  | { t: "ci.blocked"; resId: string; missing: string[] }
  | { t: "room.select"; no: string }
  | { t: "room.hk"; no: string; to: HK }
  | { t: "room.ooo"; no: string; ok: boolean; on: boolean }
  | { t: "room.move"; resId: string; from: string; to: string; ok: boolean }
  | { t: "folio.open"; resId: string }
  | { t: "folio.post"; resId: string; code: string; amount: number }
  | { t: "folio.adjust"; resId: string; ok: boolean }
  | { t: "pay"; resId: string; method: string; amount: number; ok: boolean; declined?: boolean; balanceAfter: number }
  | { t: "receipt.view"; resId: string }
  | { t: "co.complete"; resId: string } | { t: "co.blocked"; resId: string; balance: number }
  | { t: "audit.step"; step: "noshow" | "departures" | "post" | "report" | "rollover"; ok: boolean }
  | { t: "3d.room"; no: string };

export type StepResult = "ok" | "ignore" | { err: string; code: string; cat: "proc" | "op" | "recover"; hints: string[]; soft?: boolean };
export interface Step { id: string; title: string; instruction: string; target?: string | string[]; check: (e: Ev, s: HotelData & { businessDate: string }) => StepResult; gate?: boolean }
export interface Mission { id: string; level: number; module: string; title: string; desc: string; targetSec: number; trap?: string; setup?: "reset" | "inhouse-partial" | "inhouse-full" | "logout"; steps: Step[] }

export interface Attempt { id: string; user: string; missionId: string; at: number; seconds: number; errors: { code: string; cat: string; msg: string }[]; hintsUsed: number; stepCount: number; score: { procedure: number; operation: number; time: number; recovery: number; total: number }; demo?: boolean }
