"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { BUSINESS_DATE, addDays, makeSeed, nightsBetween } from "./seed";
import { MISSIONS, missionById } from "./missions";
import { balanceOf, canAssign, duplicateProfile, validateReservation, type ResDraft } from "./rules";
import type { Attempt, Ev, FolioLine, Guest, HK, HotelData, OperaMode, Reservation, ScreenId, StepResult } from "./types";

export interface Run { missionId: string; stepIdx: number; startedAt: number; errors: { code: string; cat: string; msg: string }[]; errCounts: Record<string, number>; hintsUsed: number; hintLevel: number; done: boolean; lastErr?: string; lastHint?: string; result?: Attempt; stepErrFlash?: number }
export interface Anim { kind: "checkin" | "checkout"; room: string; key: number }
export const CHARGE_CODES: Record<string, string> = { RST: "Restaurant", MSC: "Miscellaneous", LND: "Laundry", MBR: "Minibar", SPA: "Spa" };

interface State extends HotelData {
  businessDate: string; user: { name: string; role: "trainee" | "admin" } | null; mode: OperaMode; operaIn: boolean;
  screen: ScreenId; ctx: { folioRes?: string; ciRes?: string; focusRoom?: string };
  run: Run | null; attempts: Attempt[]; trapDecline: boolean; audit: string[]; anim: Anim | null; toast: { msg: string; kind: "ok" | "warn" | "err"; key: number } | null; counter: number; hydrated: boolean;
  // basic
  login: (name: string, role: "trainee" | "admin") => void; logout: () => void; setMode: (m: OperaMode) => void;
  operaLogin: () => void; operaLogout: () => void; go: (s: ScreenId, ctx?: Partial<State["ctx"]>) => void;
  say: (msg: string, kind?: "ok" | "warn" | "err") => void;
  resetHotel: () => void; resetAll: () => void;
  // engine
  act: (ev: Ev, commit?: () => void) => boolean; startMission: (id: string) => void; quitMission: () => void; requestHint: () => void;
  // domain
  createProfile: (g: Omit<Guest, "id" | "membership" | "requests"> & { requests?: string }) => { ok: boolean; id?: string; msg?: string };
  updateProfile: (id: string, patch: Partial<Guest>) => void;
  createReservation: (d: ResDraft & { guestName: string }) => { ok: boolean; res?: Reservation; errors: string[] };
  modifyReservation: (id: string, patch: Partial<Reservation>) => { ok: boolean; errors: string[] };
  cancelReservation: (id: string, reason: string) => { ok: boolean; msg?: string };
  completeCheckIn: (resId: string, f: { room?: string; idVerified: boolean; guarantee: string; request: string }) => { ok: boolean; missing: string[] };
  setHK: (no: string, to: HK) => { ok: boolean; msg?: string };
  setOOO: (no: string, on: boolean, reason: string) => { ok: boolean; msg?: string };
  moveGuest: (resId: string, toNo: string) => { ok: boolean; msg?: string };
  postCharge: (resId: string, code: string, amount: number) => { ok: boolean; msg?: string };
  adjust: (resId: string) => { ok: boolean };
  pay: (resId: string, method: string, amount: number) => { ok: boolean; msg: string };
  checkOut: (resId: string) => { ok: boolean; msg?: string };
  auditStep: (step: "noshow" | "departures" | "post" | "report" | "rollover") => { ok: boolean; msg?: string };
}

const ORDER = ["noshow", "departures", "post", "report", "rollover"];
const fresh = () => ({ ...makeSeed(), audit: [] as string[], counter: 3000, trapDecline: false, anim: null as Anim | null });

function score(m: ReturnType<typeof missionById>, run: Run, user: string): Attempt {
  const seconds = Math.max(1, Math.round((Date.now() - run.startedAt) / 1000));
  const proc = run.errors.filter((e) => e.cat === "proc").length;
  const op = run.errors.filter((e) => e.cat === "op").length;
  const repeats = Object.values(run.errCounts).reduce((a, c) => a + Math.max(0, c - 1), 0);
  const over = seconds <= m.targetSec ? 1 : Math.max(0, 1 - (seconds - m.targetSec) / (m.targetSec * 2));
  const procedure = Math.max(0, 40 - 8 * proc);
  const operation = Math.max(0, 30 - 5 * op);
  const time = Math.round(15 * over);
  const recovery = Math.max(0, 15 - 2 * run.hintsUsed - 3 * repeats);
  return { id: `${m.id}-${Date.now()}`, user, missionId: m.id, at: Date.now(), seconds, errors: run.errors, hintsUsed: run.hintsUsed, stepCount: m.steps.length, score: { procedure, operation, time, recovery, total: procedure + operation + time + recovery } };
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...fresh(), businessDate: BUSINESS_DATE, user: null, mode: "cloud", operaIn: true, screen: "dashboard", ctx: {}, run: null, attempts: [], toast: null, hydrated: false,

      login: (name, role) => set({ user: { name, role } }),
      logout: () => set({ user: null, run: null }),
      setMode: (mode) => set({ mode }),
      operaLogin: () => get().act({ t: "login" }, () => set({ operaIn: true })),
      operaLogout: () => set({ operaIn: false }),
      go: (screen, ctx) => get().act({ t: "nav", screen }, () => set((s) => ({ screen, ctx: { ...s.ctx, ...ctx } }))),
      say: (msg, kind = "ok") => set({ toast: { msg, kind, key: Date.now() } }),
      resetHotel: () => set({ ...fresh(), screen: "dashboard", ctx: {}, operaIn: true }),
      resetAll: () => set({ ...fresh(), attempts: [], run: null, screen: "dashboard", ctx: {}, operaIn: true }),

      /* ---------- mission engine ---------- */
      act: (ev, commit) => {
        const s = get();
        let res: StepResult = "ignore";
        const run = s.run;
        if (run && !run.done) {
          const step = missionById(run.missionId).steps[run.stepIdx];
          res = step.check(ev, { rooms: s.rooms, guests: s.guests, reservations: s.reservations, folios: s.folios, businessDate: s.businessDate });
          if (res !== "ok" && res !== "ignore") {
            const n = (run.errCounts[res.code] ?? 0) + 1;
            const hint = res.hints[Math.min(n - 1, res.hints.length - 1)];
            set({
              run: {
                ...run, errCounts: { ...run.errCounts, [res.code]: n }, lastErr: res.err, lastHint: hint, stepErrFlash: Date.now(),
                errors: res.soft ? run.errors : [...run.errors, { code: res.code, cat: res.cat, msg: res.err }],
              },
            });
            if (step.gate) return false;
          }
        }
        commit?.();
        if (res === "ok") {
          const r = get().run!;
          const m = missionById(r.missionId);
          if (r.stepIdx + 1 >= m.steps.length) {
            const attempt = score(m, r, get().user?.name ?? "학습자");
            set({ run: { ...r, done: true, result: attempt, lastErr: undefined, lastHint: undefined }, attempts: [...get().attempts, attempt] });
          } else set({ run: { ...r, stepIdx: r.stepIdx + 1, lastErr: undefined, lastHint: undefined, hintLevel: 0 } });
        }
        return true;
      },
      startMission: (id) => {
        const m = missionById(id);
        set({ ...fresh(), screen: "dashboard", ctx: {}, operaIn: m.setup !== "logout", run: { missionId: id, stepIdx: 0, startedAt: Date.now(), errors: [], errCounts: {}, hintsUsed: 0, hintLevel: 0, done: false } });
        if (m.setup === "inhouse-partial") set((s) => ({ folios: { ...s.folios, "R-0950": s.folios["R-0950"].filter((l) => l.code === "RM") } }));
        if (id === "m9") set({ trapDecline: true });
      },
      quitMission: () => set({ run: null }),
      requestHint: () => {
        const r = get().run; if (!r || r.done) return;
        const step = missionById(r.missionId).steps[r.stepIdx];
        const lv = r.hintLevel;
        const texts = ["금색으로 깜빡이는 메뉴/버튼을 찾아보세요. 메뉴는 그룹을 먼저 열어야 보일 수 있습니다.", `이 단계의 목표: ${step.title}. 지시문을 다시 한 번 천천히 읽어보세요.`, "아직 막혔다면 이전 오류 힌트를 확인하고, 화면의 경고(빨간색/주황색) 문구가 알려주는 업무 규칙을 따라가 보세요."];
        set({ run: { ...r, hintsUsed: r.hintsUsed + 1, hintLevel: Math.min(lv + 1, 2), lastHint: texts[Math.min(lv, 2)], lastErr: undefined } });
      },

      /* ---------- domain ---------- */
      createProfile: (g) => {
        const name = g.name.trim();
        if (!name || !g.phone.trim()) { get().act({ t: "profile.save", guest: { name, phone: g.phone, vip: g.vip, prefs: g.prefs }, ok: false }); return { ok: false, msg: "이름과 전화번호는 필수입니다." }; }
        if (duplicateProfile(get(), name, g.phone)) { get().act({ t: "profile.save", guest: { name, phone: g.phone, vip: g.vip, prefs: g.prefs }, ok: false }); return { ok: false, msg: "동일한 이름·전화번호의 프로필이 이미 있습니다 (중복 프로필)." }; }
        const id = `g-${Date.now()}`;
        const guest: Guest = { id, name, phone: g.phone, email: g.email, vip: g.vip, membership: "None", prefs: g.prefs, requests: g.requests ?? "" };
        const ok = get().act({ t: "profile.save", guest: { name, phone: g.phone, vip: g.vip, prefs: g.prefs }, ok: true }, () => set((s) => ({ guests: [...s.guests, guest] })));
        return ok ? { ok: true, id } : { ok: false, msg: "교육 시나리오 검증 실패 — 힌트를 확인하세요." };
      },
      updateProfile: (id, patch) => {
        set((s) => ({ guests: s.guests.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
        if (patch.requests !== undefined) get().act({ t: "profile.update", id, requests: patch.requests });
      },
      createReservation: (d) => {
        const s = get();
        const errors = validateReservation(s, d, s.businessDate);
        const draft = { guestName: d.guestName, arrival: d.arrival, departure: d.departure, roomType: (d.roomType || "Standard") as "Standard", adults: d.adults, rateCode: d.rateCode, rate: d.rate, guarantee: d.guarantee as "None" };
        if (errors.length) { get().act({ t: "res.save", draft, ok: false }); return { ok: false, errors }; }
        const n = s.counter + 1;
        const res: Reservation = { id: `R-${n}`, confNo: `C${String(n).padStart(6, "0")}`, guestId: d.guestId, arrival: d.arrival, departure: d.departure, nights: nightsBetween(d.arrival, d.departure), roomType: d.roomType as "Standard", adults: d.adults, rateCode: d.rateCode, rate: d.rate, guarantee: d.guarantee as "Credit Card", status: "Reserved", request: "" };
        const ok = get().act({ t: "res.save", draft, ok: true }, () => set((st) => ({ reservations: [...st.reservations, res], counter: n })));
        return ok ? { ok: true, res, errors: [] } : { ok: false, errors: ["교육 시나리오 입력값과 달라 저장되지 않았습니다. 오른쪽 힌트를 확인하세요."] };
      },
      modifyReservation: (id, patch) => {
        const s = get(); const cur = s.reservations.find((r) => r.id === id)!;
        const next = { ...cur, ...patch };
        next.nights = nightsBetween(next.arrival, next.departure);
        const errors = validateReservation(s, { guestId: next.guestId, arrival: next.arrival, departure: next.departure, roomType: next.roomType, adults: next.adults, rateCode: next.rateCode, rate: next.rate, guarantee: next.guarantee }, s.businessDate, id);
        if (cur.status !== "Reserved") errors.push("이미 체크인/종료된 예약은 이 화면에서 수정할 수 없습니다.");
        if (errors.length) return { ok: false, errors };
        get().act({ t: "res.modify", id, nightsBefore: cur.nights, nightsAfter: next.nights }, () => set((st) => ({ reservations: st.reservations.map((r) => (r.id === id ? next : r)) })));
        return { ok: true, errors: [] };
      },
      cancelReservation: (id, reason) => {
        const cur = get().reservations.find((r) => r.id === id)!;
        if (cur.status !== "Reserved") return { ok: false, msg: "Reserved 상태의 예약만 취소할 수 있습니다." };
        if (!reason.trim()) return { ok: false, msg: "취소 사유(Cancel Reason)를 입력하세요." };
        const ok = get().act({ t: "res.cancel", id, reason }, () => set((st) => ({ reservations: st.reservations.map((r) => (r.id === id ? { ...r, status: "Cancelled", cancelReason: reason } : r)) })));
        return ok ? { ok: true } : { ok: false };
      },
      completeCheckIn: (resId, f) => {
        const s = get(); const res = s.reservations.find((r) => r.id === resId)!;
        const missing: string[] = [];
        if (res.arrival > s.businessDate) missing.push("도착일 아님(조기 체크인 불가)");
        if (!f.idVerified) missing.push("신원 확인");
        if (!f.room) missing.push("객실 배정");
        if (f.guarantee === "None") missing.push("결제 보증");
        if (missing.length) { get().act({ t: "ci.blocked", resId, missing }); return { ok: false, missing }; }
        const room = f.room!;
        get().act({ t: "ci.complete", resId }, () => set((st) => {
          const nights = Array.from({ length: res.nights }, (_, i): FolioLine => ({ id: `${resId}-rm${i}`, code: "RM", desc: "Room Charge", amount: res.rate, kind: "charge", date: addDays(res.arrival, i), by: "FO" }));
          return {
            reservations: st.reservations.map((r) => (r.id === resId ? { ...r, status: "Checked In", room, idVerified: true, guarantee: f.guarantee as "Credit Card", request: f.request || r.request } : r)),
            rooms: st.rooms.map((r) => (r.no === room ? { ...r, fo: "Occupied", resId } : r)),
            folios: { ...st.folios, [resId]: nights }, anim: { kind: "checkin", room, key: Date.now() }, ctx: { ...st.ctx, focusRoom: room },
          };
        }));
        return { ok: true, missing: [] };
      },
      setHK: (no, to) => {
        const r = get().rooms.find((x) => x.no === no)!;
        if (r.ooo) return { ok: false, msg: "OOO 객실은 먼저 OOO를 해제해야 합니다." };
        if (to === "Inspected" && r.hk === "Dirty") return { ok: false, msg: "Dirty 객실은 Clean 처리 후에 Inspected로 변경할 수 있습니다." };
        if (to === "Dirty" && r.hk !== "Dirty" && r.fo === "Vacant") { /* 허용: 재청소 요청 */ }
        get().act({ t: "room.hk", no, to }, () => set((s) => ({ rooms: s.rooms.map((x) => (x.no === no ? { ...x, hk: to } : x)) })));
        return { ok: true };
      },
      setOOO: (no, on, reason) => {
        const r = get().rooms.find((x) => x.no === no)!;
        if (on && r.fo === "Occupied") { get().act({ t: "room.ooo", no, ok: false, on }); return { ok: false, msg: "투숙 중인 객실은 OOO로 등록할 수 없습니다. 먼저 고객을 다른 객실로 이동(Room Move)하세요." }; }
        if (on && !reason.trim()) return { ok: false, msg: "OOO 사유(Reason)를 입력하세요." };
        get().act({ t: "room.ooo", no, ok: true, on }, () => set((s) => ({ rooms: s.rooms.map((x) => (x.no === no ? (on ? { ...x, ooo: true, oooReason: reason } : { ...x, ooo: false, oooReason: undefined, hk: "Dirty" }) : x)) })));
        return { ok: true };
      },
      moveGuest: (resId, toNo) => {
        const s = get(); const res = s.reservations.find((r) => r.id === resId)!; const to = s.rooms.find((r) => r.no === toNo);
        const v = canAssign(to, res);
        if (!v.ok) { get().act({ t: "room.move", resId, from: res.room!, to: toNo, ok: false }); return { ok: false, msg: v.msg }; }
        const from = res.room!;
        get().act({ t: "room.move", resId, from, to: toNo, ok: true }, () => set((st) => ({
          rooms: st.rooms.map((r) => (r.no === from ? { ...r, fo: "Vacant", hk: "Dirty", resId: undefined } : r.no === toNo ? { ...r, fo: "Occupied", resId } : r)),
          reservations: st.reservations.map((r) => (r.id === resId ? { ...r, room: toNo } : r)),
          ctx: { ...st.ctx, focusRoom: toNo },
        })));
        return { ok: true };
      },
      postCharge: (resId, code, amount) => {
        if (!CHARGE_CODES[code]) return { ok: false, msg: "유효하지 않은 Transaction Code입니다." };
        if (!(amount > 0)) return { ok: false, msg: "금액은 0보다 커야 합니다." };
        const ok = get().act({ t: "folio.post", resId, code, amount }, () => set((s) => ({ folios: { ...s.folios, [resId]: [...(s.folios[resId] ?? []), { id: `${resId}-${Date.now()}`, code, desc: CHARGE_CODES[code], amount, kind: "charge", date: s.businessDate, by: s.user?.name ?? "FO" }] } })));
        return ok ? { ok: true } : { ok: false, msg: "교육 시나리오의 코드/금액과 달라 등록되지 않았습니다. 힌트를 확인하세요." };
      },
      adjust: (resId) => {
        const allowed = get().user?.role === "admin";
        get().act({ t: "folio.adjust", resId, ok: allowed });
        return { ok: allowed };
      },
      pay: (resId, method, amount) => {
        const s = get(); const bal = balanceOf(s.folios[resId]);
        if (!(amount > 0)) return { ok: false, msg: "결제 금액을 입력하세요." };
        if (amount > bal) return { ok: false, msg: `잔액(${bal.toLocaleString()}원)보다 큰 금액입니다. 초과 결제/환불은 슈퍼바이저 권한이 필요합니다.` };
        if (method === "Credit Card" && s.trapDecline) {
          set({ trapDecline: false });
          get().act({ t: "pay", resId, method, amount, ok: false, declined: true, balanceAfter: bal });
          return { ok: false, msg: "카드 승인 거절 (Authorization Declined · 교육용 시뮬레이션). 카드를 재시도하거나 다른 결제수단을 이용하세요." };
        }
        const ok = get().act({ t: "pay", resId, method, amount, ok: true, balanceAfter: bal - amount }, () => set((st) => ({ folios: { ...st.folios, [resId]: [...(st.folios[resId] ?? []), { id: `${resId}-p${Date.now()}`, code: method === "Cash" ? "CSH" : method === "Credit Card" ? "VSA" : "BNK", desc: `Payment · ${method}`, amount, kind: "payment", date: st.businessDate, by: st.user?.name ?? "FO" }] } })));
        return ok ? { ok: true, msg: "결제가 정상 처리되었습니다 (가상)." } : { ok: false, msg: "교육 시나리오와 달라 결제가 보류되었습니다. 힌트를 확인하세요." };
      },
      checkOut: (resId) => {
        const s = get(); const res = s.reservations.find((r) => r.id === resId)!;
        const bal = balanceOf(s.folios[resId]);
        if (bal !== 0) { get().act({ t: "co.blocked", resId, balance: bal }); return { ok: false, msg: `미결제 잔액 ${bal.toLocaleString()}원이 있어 체크아웃할 수 없습니다.` }; }
        const no = res.room!;
        get().act({ t: "co.complete", resId }, () => set((st) => ({
          reservations: st.reservations.map((r) => (r.id === resId ? { ...r, status: "Checked Out" } : r)),
          rooms: st.rooms.map((r) => (r.no === no ? { ...r, fo: "Vacant", hk: "Dirty", resId: undefined } : r)),
          anim: { kind: "checkout", room: no, key: Date.now() },
        })));
        return { ok: true };
      },
      auditStep: (step) => {
        const done = get().audit;
        const idx = ORDER.indexOf(step);
        const ok = idx === 0 || done.includes(ORDER[idx - 1]);
        if (!ok) { get().act({ t: "audit.step", step, ok: false }); return { ok: false, msg: `이전 단계(${ORDER[idx - 1]})를 먼저 완료해야 합니다.` }; }
        get().act({ t: "audit.step", step, ok: true }, () => set((s) => ({ audit: s.audit.includes(step) ? s.audit : [...s.audit, step] })));
        return { ok: true };
      },
    }),
    {
      name: "opera-academy-v1", storage: createJSONStorage(() => localStorage), skipHydration: true, version: 1,
      partialize: (s) => ({ rooms: s.rooms, guests: s.guests, reservations: s.reservations, folios: s.folios, user: s.user, mode: s.mode, attempts: s.attempts, counter: s.counter }),
    },
  ),
);
export { MISSIONS };
