import { CAPACITY, TOTAL_ROOMS, addDays, nightsBetween } from "./seed";
import type { FolioLine, Guest, HotelData, Reservation, Room, RoomType } from "./types";

export const balanceOf = (lines: FolioLine[] = []) => lines.reduce((s, l) => s + (l.kind === "charge" ? l.amount : -l.amount), 0);
export const guestOf = (d: HotelData, id: string) => d.guests.find((g) => g.id === id);
export const resOf = (d: HotelData, id: string) => d.reservations.find((r) => r.id === id);

export type RoomState = "Vacant Clean" | "Vacant Dirty" | "Vacant Inspected" | "Occupied" | "Out of Order";
export const roomState = (r: Room): RoomState => (r.ooo ? "Out of Order" : r.fo === "Occupied" ? "Occupied" : (`Vacant ${r.hk}` as RoomState));
export const STATE_COLOR: Record<RoomState, string> = {
  "Vacant Clean": "#2e9e6b", "Vacant Inspected": "#1f7fbf", "Vacant Dirty": "#d98a1c", Occupied: "#b83a4b", "Out of Order": "#6b7280",
};
export const STATE_KO: Record<RoomState, string> = {
  "Vacant Clean": "공실·청소완료", "Vacant Inspected": "공실·검수완료", "Vacant Dirty": "공실·청소필요", Occupied: "투숙중", "Out of Order": "사용불가(OOO)",
};

/** 날짜 구간 내 유형별 잔여 객실 수 (가장 부족한 날 기준) */
export function availability(d: HotelData, type: RoomType, arrival: string, departure: string, excludeResId?: string) {
  const total = d.rooms.filter((r) => r.type === type && !r.ooo).length;
  let min = total;
  for (let n = 0; n < Math.max(1, nightsBetween(arrival, departure)); n++) {
    const day = addDays(arrival, n);
    const used = d.reservations.filter((r) => r.id !== excludeResId && r.roomType === type && (r.status === "Reserved" || r.status === "Checked In") && r.arrival <= day && r.departure > day).length;
    min = Math.min(min, total - used);
  }
  return min;
}

export interface ResDraft { guestId: string; arrival: string; departure: string; roomType: RoomType | ""; adults: number; rateCode: string; rate: number; guarantee: string }
/** 예약 입력 검증 — 오류 목록 반환 */
export function validateReservation(d: HotelData, x: ResDraft, bd: string, excludeResId?: string): string[] {
  const e: string[] = [];
  if (!x.guestId) e.push("Guest(고객 프로필)를 먼저 선택하거나 생성하세요.");
  if (!x.arrival || !x.departure) e.push("Arrival / Departure 날짜를 입력하세요.");
  else {
    if (x.arrival < bd) e.push("Arrival 날짜가 영업일(Business Date)보다 과거입니다.");
    if (x.departure <= x.arrival) e.push("Departure는 Arrival 이후여야 합니다 (최소 1박).");
  }
  if (!x.roomType) e.push("Room Type을 선택하세요.");
  else {
    if (x.adults < 1) e.push("Adults는 1명 이상이어야 합니다.");
    if (x.adults > CAPACITY[x.roomType]) e.push(`${x.roomType} 객실 최대 인원(${CAPACITY[x.roomType]}명)을 초과했습니다.`);
    if (x.arrival && x.departure > x.arrival && availability(d, x.roomType, x.arrival, x.departure, excludeResId) <= 0) e.push(`${x.roomType} 객실이 해당 기간에 만실(Sold Out)입니다.`);
  }
  if (!x.rateCode) e.push("Rate Code를 선택하세요.");
  if (!(x.rate > 0)) e.push("객실 요금(Rate)이 0원 이하입니다.");
  if (x.guarantee === "None" || !x.guarantee) e.push("보증(Guarantee/Payment) 정보를 선택하세요.");
  return e;
}

export function duplicateProfile(d: HotelData, name: string, phone: string): Guest | undefined {
  return d.guests.find((g) => g.name === name.trim() && g.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""));
}

export type AssignReason = "dirty" | "ooo" | "occupied" | "type" | "none";
/** 객실 배정 가능 여부 */
export function canAssign(room: Room | undefined, res: Reservation): { ok: boolean; reason: AssignReason; msg: string } {
  if (!room) return { ok: false, reason: "none", msg: "존재하지 않는 객실입니다." };
  if (room.ooo) return { ok: false, reason: "ooo", msg: `객실 ${room.no}은(는) Out of Order 상태라 배정할 수 없습니다.` };
  if (room.fo === "Occupied") return { ok: false, reason: "occupied", msg: `객실 ${room.no}은(는) 이미 투숙 중(Occupied)입니다.` };
  if (room.type !== res.roomType) return { ok: false, reason: "type", msg: `예약 객실 유형(${res.roomType})과 다릅니다. 업/다운그레이드는 슈퍼바이저 승인이 필요합니다.` };
  if (room.hk === "Dirty") return { ok: false, reason: "dirty", msg: `객실 ${room.no}은(는) Dirty 상태입니다. 하우스키핑이 청소하기 전에는 체크인할 수 없습니다 (호텔 정책 설정).` };
  return { ok: true, reason: "none", msg: "배정 가능" };
}

export function dayStats(d: HotelData) {
  const ooo = d.rooms.filter((r) => r.ooo).length;
  const available = TOTAL_ROOMS - ooo;
  const inhouse = d.reservations.filter((r) => r.status === "Checked In");
  const sold = inhouse.length;
  const revenue = inhouse.reduce((s, r) => s + r.rate, 0);
  const byType = (["Standard", "Deluxe", "Suite"] as RoomType[]).map((t) => {
    const rs = inhouse.filter((r) => r.roomType === t);
    return { type: t, sold: rs.length, avail: d.rooms.filter((r) => r.type === t && !r.ooo).length, revenue: rs.reduce((s, r) => s + r.rate, 0) };
  });
  return { ooo, available, sold, revenue, occ: available ? (sold / available) * 100 : 0, adr: sold ? revenue / sold : 0, revpar: available ? revenue / available : 0, byType };
}
