"use client";
import clsx from "clsx";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { OperaMode, ScreenId } from "@/lib/types";
import { Btn, Field, Input, Official } from "../ui";
import { Dashboard } from "./Dashboard";
import { NewReservation, ReservationList, Profiles } from "./Reservations";
import { Arrivals, InHouseDepartures, RoomRack } from "./FrontDesk";
import { Folio, NightAudit, Reports } from "./Cashier";

interface Group { id: string; label: string; ko: string; items: { screen: ScreenId; label: string; ko: string }[] }
const CLOUD: Group[] = [
  { id: "bookings", label: "Bookings", ko: "예약", items: [{ screen: "newres", label: "New Reservation", ko: "신규 예약" }, { screen: "reservations", label: "Reservations", ko: "예약 조회" }, { screen: "profiles", label: "Profiles", ko: "고객 프로필" }] },
  { id: "frontdesk", label: "Front Desk", ko: "프런트", items: [{ screen: "arrivals", label: "Arrivals", ko: "도착" }, { screen: "inhouse", label: "In House", ko: "재실" }, { screen: "departures", label: "Departures", ko: "출발" }] },
  { id: "rooms", label: "Rooms Management", ko: "객실관리", items: [{ screen: "rooms", label: "Room Rack", ko: "객실 현황" }] },
  { id: "cashiering", label: "Cashiering", ko: "캐셔", items: [{ screen: "folio", label: "Billing", ko: "청구/Folio" }] },
  { id: "eod", label: "End of Day", ko: "마감·보고", items: [{ screen: "audit", label: "Night Audit", ko: "나이트 오딧" }, { screen: "reports", label: "Reports", ko: "보고서" }] },
];
const O5: Group[] = [
  { id: "reservations", label: "Reservations", ko: "예약", items: [{ screen: "newres", label: "New Reservation", ko: "신규 예약" }, { screen: "reservations", label: "Reservation Look Up", ko: "예약 조회" }] },
  { id: "profiles", label: "Profiles", ko: "프로필", items: [{ screen: "profiles", label: "Profile Search", ko: "고객 검색" }] },
  { id: "frontdesk", label: "Front Desk", ko: "프런트", items: [{ screen: "arrivals", label: "Arrivals", ko: "도착" }, { screen: "inhouse", label: "In House Guests", ko: "재실" }, { screen: "departures", label: "Departures", ko: "출발" }] },
  { id: "rooms", label: "Rooms Mgmt", ko: "객실관리", items: [{ screen: "rooms", label: "Room Plan", ko: "객실 현황" }] },
  { id: "cashier", label: "Cashiering", ko: "캐셔", items: [{ screen: "folio", label: "Billing", ko: "청구/Folio" }] },
  { id: "reports", label: "Reports", ko: "보고서", items: [{ screen: "reports", label: "Reports", ko: "보고서" }] },
  { id: "na", label: "Night Audit", ko: "나이트 오딧", items: [{ screen: "audit", label: "Night Audit", ko: "일일 마감" }] },
];

export const SCREEN_TITLE: Record<ScreenId, string> = { dashboard: "Dashboard", newres: "New Reservation", reservations: "Reservations", profiles: "Profiles", arrivals: "Arrivals", inhouse: "In House", departures: "Departures", rooms: "Room Rack", folio: "Billing / Folio", audit: "Night Audit", reports: "Reports" };

export function Opera() {
  const { mode, setMode, screen, go, operaIn, operaLogout, businessDate, user } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const groups = mode === "cloud" ? CLOUD : O5;
  return (
    <div className={clsx("overflow-hidden rounded-xl border-2 shadow-lg", mode === "opera5" ? "opera5 border-slate-500 bg-[#d4d0c8]" : "border-navy/20 bg-white")}>
      {/* title / mode bar */}
      <div className={clsx("flex flex-wrap items-center gap-2 px-3 py-2 text-white", mode === "opera5" ? "bg-gradient-to-r from-[#0a246a] to-[#a6caf0]" : "bg-navy")}>
        <b className="text-sm tracking-wide">{mode === "cloud" ? "ORACLE OPERA Cloud" : "ORACLE OPERA 5"} <span className="font-normal opacity-70">· Training Edition</span></b>
        <div className="ml-auto flex items-center gap-1 text-xs">
          <span className="hidden sm:inline opacity-80">Business Date {businessDate}</span>
          {(["cloud", "opera5"] as OperaMode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); setOpen(null); }} className={clsx("rounded px-2 py-0.5 font-semibold", mode === m ? "bg-gold text-navy" : "bg-white/10 hover:bg-white/20")}>{m === "cloud" ? "Cloud" : "OPERA 5"}</button>
          ))}
          {operaIn && <button onClick={operaLogout} className="ml-1 rounded bg-white/10 px-2 py-0.5 hover:bg-white/20">Sign Out</button>}
        </div>
      </div>
      {operaIn ? (
        <>
          <nav className={clsx("relative flex flex-wrap items-center gap-0.5 border-b px-2 py-1", mode === "opera5" ? "border-slate-500 bg-[#d4d0c8]" : "border-slate-200 bg-mist")} onMouseLeave={() => setOpen(null)}>
            <button data-tour="grp-dashboard item-dashboard" onClick={() => { go("dashboard"); setOpen(null); }} className={clsx("rounded px-2.5 py-1.5 text-sm font-semibold hover:bg-gold/30", screen === "dashboard" && "bg-gold/40")}>⌂ Home</button>
            {groups.map((g) => (
              <div key={g.id} className="relative">
                <button data-tour={g.items.map((i) => `grp-${i.screen}`).join(" ")} onClick={() => setOpen(open === g.id ? null : g.id)} aria-expanded={open === g.id}
                  className={clsx("rounded px-2.5 py-1.5 text-sm font-semibold hover:bg-gold/30", open === g.id && "bg-gold/40", g.items.some((i) => i.screen === screen) && "underline decoration-gold decoration-2 underline-offset-4")}>
                  {g.label} <span className="hidden text-[10px] font-normal text-slate-500 lg:inline">{g.ko}</span> ▾
                </button>
                {open === g.id && (
                  <div className="absolute left-0 top-full z-30 min-w-48 rounded-md border border-slate-300 bg-white py-1 shadow-xl">
                    {g.items.map((i) => (
                      <button key={i.screen} data-tour={`item-${i.screen}`} onClick={() => { go(i.screen); setOpen(null); }} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gold/20">
                        {i.label} <span className="text-xs text-slate-500">· {i.ko}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <span className="ml-auto flex items-center gap-2 pr-1 text-[11px] text-slate-500"><Official />{user?.name}</span>
          </nav>
          <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-1.5 text-xs text-slate-500">
            <b className="text-navy">{SCREEN_TITLE[screen]}</b>
            <span>· {mode === "cloud" ? "OPERA Cloud 교육 모드" : "OPERA 5 교육 모드"} — 메뉴 구성은 제품 버전·호텔 설정에 따라 다를 수 있으며, 이 화면은 학습용으로 재구성한 모의 화면입니다.</span>
          </div>
          <div className="min-h-[520px] bg-mist p-3 sm:p-4">
            {screen === "dashboard" && <Dashboard />}
            {screen === "newres" && <NewReservation />}
            {screen === "reservations" && <ReservationList />}
            {screen === "profiles" && <Profiles />}
            {screen === "arrivals" && <Arrivals />}
            {(screen === "inhouse" || screen === "departures") && <InHouseDepartures only={screen === "departures"} />}
            {screen === "rooms" && <RoomRack />}
            {screen === "folio" && <Folio />}
            {screen === "audit" && <NightAudit />}
            {screen === "reports" && <Reports />}
          </div>
        </>
      ) : <OperaLogin />}
    </div>
  );
}

function OperaLogin() {
  const login = useStore((s) => s.operaLogin);
  const mode = useStore((s) => s.mode);
  return (
    <div className="grid min-h-[520px] place-items-center bg-gradient-to-br from-navy to-navy-700 p-6">
      <form onSubmit={(e) => { e.preventDefault(); login(); }} className="w-full max-w-sm space-y-3 rounded-xl bg-white p-6 shadow-2xl">
        <div className="text-center"><div className="text-xs font-bold tracking-[0.3em] text-gold">GRAND ACADEMY HOTEL</div><h3 className="text-lg font-bold text-navy">{mode === "cloud" ? "OPERA Cloud" : "OPERA 5"} Sign In</h3></div>
        <Field label="User Name"><Input defaultValue="TRAINEE01" readOnly aria-label="user name" /></Field>
        <Field label="Password"><Input type="password" defaultValue="training" readOnly aria-label="password" /></Field>
        <Field label="Property"><Input defaultValue="GRANDACAD · Grand Academy Hotel" readOnly /></Field>
        <Btn data-tour="btn-login" type="submit" variant="gold" className="w-full">Sign In</Btn>
        <p className="text-center text-[11px] text-slate-500">교육용 계정입니다. 실제 호텔 PMS와 연결되지 않으며 가상 데이터만 사용합니다.</p>
      </form>
    </div>
  );
}
