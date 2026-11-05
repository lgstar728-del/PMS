import type { FolioLine, Guest, HotelData, Reservation, Room, RoomType } from "./types";

export const BUSINESS_DATE = "2026-12-10";
export const TOTAL_ROOMS = 200;
export const RATE_TABLE: Record<string, Record<RoomType, number>> = {
  RACK: { Standard: 150000, Deluxe: 200000, Suite: 400000 },
  BAR: { Standard: 130000, Deluxe: 180000, Suite: 350000 },
  CORP: { Standard: 110000, Deluxe: 160000, Suite: 300000 },
};
export const RATE_DESC: Record<string, string> = { RACK: "Rack Rate (정가)", BAR: "Best Available Rate", CORP: "Corporate Rate" };
export const CAPACITY: Record<RoomType, number> = { Standard: 2, Deluxe: 3, Suite: 4 };

export const addDays = (d: string, n: number) => { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
export const nightsBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export const won = (n: number) => n.toLocaleString("ko-KR") + "원";

const SUR = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권"];
const GIV = ["민준", "서연", "지호", "하윤", "도윤", "서준", "예은", "지우", "수빈", "현우", "채원", "지안", "유진", "태양", "나연"];

// 3~6층 Standard(80) / 7~12층 01~16호 Deluxe(96), 17~20호 Suite(24) = 200실
const typeOf = (floor: number, i: number): RoomType => (floor <= 6 ? "Standard" : i <= 16 ? "Deluxe" : "Suite");

export function makeSeed(): HotelData {
  const rooms: Room[] = [];
  for (let f = 3; f <= 12; f++) for (let i = 1; i <= 20; i++) {
    rooms.push({ no: `${String(f).padStart(2, "0")}${String(i).padStart(2, "0")}`, floor: f, type: typeOf(f, i), fo: "Vacant", hk: "Clean", ooo: false });
  }
  const room = (no: string) => rooms.find((r) => r.no === no)!;
  const guests: Guest[] = [
    { id: "g-yoon", name: "윤서준", phone: "010-0000-0011", email: "yoon@example.test", vip: 0, membership: "Silver", prefs: ["Non-smoking"], requests: "" },
    { id: "g-choi", name: "최도현", phone: "010-0000-0012", email: "choi@example.test", vip: 2, membership: "Gold", prefs: ["High floor", "Extra pillow"], requests: "" },
    { id: "g-lee", name: "이지우", phone: "010-0000-0013", email: "lee@example.test", vip: 0, membership: "None", prefs: [], requests: "" },
    { id: "g-kang", name: "강민호", phone: "010-0000-0014", email: "kang@example.test", vip: 1, membership: "Platinum", prefs: ["Quiet room"], requests: "" },
    { id: "g-jung", name: "정하윤", phone: "010-0000-0015", email: "jung@example.test", vip: 3, membership: "Platinum", prefs: ["Suite", "Late check-out"], requests: "" },
    { id: "g-han", name: "한도윤", phone: "010-0000-0016", email: "han@example.test", vip: 0, membership: "None", prefs: [], requests: "" },
    { id: "g-seo", name: "서하은", phone: "010-0000-0017", email: "seo@example.test", vip: 0, membership: "None", prefs: [], requests: "" },
  ];
  const reservations: Reservation[] = [];
  const folios: Record<string, FolioLine[]> = {};
  const mk = (r: Partial<Reservation> & Pick<Reservation, "id" | "guestId" | "arrival" | "departure" | "roomType">): Reservation => {
    const rate = r.rate ?? RATE_TABLE.BAR[r.roomType];
    const full: Reservation = { confNo: "C" + r.id.replace(/\D/g, "").padStart(6, "0"), nights: nightsBetween(r.arrival, r.departure), adults: 2, rateCode: "BAR", rate, guarantee: "Credit Card", status: "Reserved", request: "", ...r };
    reservations.push(full);
    return full;
  };
  const roomLines = (res: Reservation): FolioLine[] =>
    Array.from({ length: res.nights }, (_, i) => ({ id: `${res.id}-rm${i}`, code: "RM", desc: "Room Charge", amount: res.rate, kind: "charge" as const, date: addDays(res.arrival, i), by: "NA" }));

  // 시나리오 고정 객실 (1201 Vacant/Clean, 1203 Dirty, 1204 OOO, 1205 Inspected)
  const special: Record<string, Partial<Room>> = {
    "1203": { hk: "Dirty" }, "1204": { ooo: true, oooReason: "에어컨 수리" }, "1205": { hk: "Inspected" }, "0801": { hk: "Dirty" },
  };
  Object.entries(special).forEach(([no, p]) => Object.assign(room(no), p));

  // 재실: 1202 윤서준 (오늘 출발, 2박 360,000 + 레스토랑 50,000 + 기타 20,000)
  const yoon = mk({ id: "R-0950", guestId: "g-yoon", arrival: addDays(BUSINESS_DATE, -2), departure: BUSINESS_DATE, roomType: "Deluxe", status: "Checked In", room: "1202", idVerified: true });
  Object.assign(room("1202"), { fo: "Occupied", resId: yoon.id });
  folios[yoon.id] = [
    ...roomLines(yoon),
    { id: "R-0950-rst", code: "RST", desc: "Restaurant", amount: 50000, kind: "charge", date: addDays(BUSINESS_DATE, -1), by: "FO1" },
    { id: "R-0950-msc", code: "MSC", desc: "Miscellaneous", amount: 20000, kind: "charge", date: addDays(BUSINESS_DATE, -1), by: "FO1" },
  ];
  // 재실: 1208 최도현 (VIP)
  const choi = mk({ id: "R-0951", guestId: "g-choi", arrival: addDays(BUSINESS_DATE, -1), departure: addDays(BUSINESS_DATE, 2), roomType: "Deluxe", status: "Checked In", room: "1208", rate: 200000, rateCode: "RACK", idVerified: true });
  Object.assign(room("1208"), { fo: "Occupied", resId: choi.id });
  folios[choi.id] = roomLines(choi);

  // 오늘 도착 / 미래 도착
  mk({ id: "R-1001", guestId: "g-lee", arrival: BUSINESS_DATE, departure: addDays(BUSINESS_DATE, 2), roomType: "Deluxe", guarantee: "None" });
  mk({ id: "R-1002", guestId: "g-kang", arrival: BUSINESS_DATE, departure: addDays(BUSINESS_DATE, 1), roomType: "Standard", rate: 130000, request: "Quiet room" });
  mk({ id: "R-1003", guestId: "g-jung", arrival: BUSINESS_DATE, departure: addDays(BUSINESS_DATE, 3), roomType: "Suite", rate: 350000 });
  mk({ id: "R-1004", guestId: "g-han", arrival: addDays(BUSINESS_DATE, 1), departure: addDays(BUSINESS_DATE, 2), roomType: "Standard", rate: 130000 });
  mk({ id: "R-1005", guestId: "g-seo", arrival: addDays(BUSINESS_DATE, 2), departure: addDays(BUSINESS_DATE, 3), roomType: "Standard", rate: 130000 });

  // 배경 재실 (점유율 현실감) — 12층 1201~1210은 시나리오용으로 비워 둠
  let n = 0;
  rooms.forEach((r, idx) => {
    if (r.fo === "Occupied" || r.ooo || r.hk !== "Clean" || (r.floor === 12 && Number(r.no) <= 1210)) return;
    const m = (idx * 7 + 3) % 10;
    if (m < 5) {
      n++;
      const g = `g-bg${n}`;
      guests.push({ id: g, name: SUR[(idx * 3) % SUR.length] + GIV[(idx * 5) % GIV.length], phone: `010-${String(1000 + idx)}-${String(2000 + n)}`, email: `guest${n}@example.test`, vip: 0, membership: "None", prefs: [], requests: "" });
      const dep = m <= 1 ? BUSINESS_DATE : addDays(BUSINESS_DATE, 1 + (idx % 3));
      const rate = r.type === "Standard" ? 130000 : r.type === "Deluxe" ? 180000 : 350000;
      const res = mk({ id: `R-2${String(n).padStart(3, "0")}`, guestId: g, arrival: addDays(dep, -(1 + (idx % 3))), departure: dep, roomType: r.type, status: "Checked In", room: r.no, rate, idVerified: true });
      Object.assign(r, { fo: "Occupied", resId: res.id, hk: idx % 4 === 0 ? "Inspected" : "Clean" });
      folios[res.id] = roomLines(res);
    } else if (m === 5 && idx % 3 === 0) r.hk = "Dirty";
  });
  return { rooms, guests, reservations, folios };
}
