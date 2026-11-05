"use client";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { balanceOf, canAssign, roomState, STATE_COLOR, STATE_KO } from "@/lib/rules";
import { won } from "@/lib/seed";
import type { Guarantee, HK } from "@/lib/types";
import { useUI } from "../ui-store";
import { Badge, Btn, Card, ErrorList, Field, Input, Select, Td, Th } from "../ui";

/* ───────── Arrivals + Check-in wizard ───────── */
export function Arrivals() {
  const s = useStore();
  const list = s.reservations.filter((r) => r.status === "Reserved" && r.arrival === s.businessDate);
  const sel = s.reservations.find((r) => r.id === s.ctx.ciRes);
  const gname = (id: string) => s.guests.find((g) => g.id === id);
  return (
    <div className="space-y-4">
      <Card title="Arrivals · 오늘 도착 예정" right={<span className="text-xs text-slate-500">{list.length}건 · {s.businessDate}</span>}>
        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[600px]"><thead><tr><Th>Guest</Th><Th>Conf</Th><Th>Type</Th><Th>Nights</Th><Th>Rate</Th><Th>Guarantee</Th><Th>VIP</Th><Th /></tr></thead>
            <tbody>{list.map((r) => { const g = gname(r.guestId); return (
              <tr key={r.id} className={clsx(sel?.id === r.id && "bg-gold/15")}>
                <Td><b>{g?.name}</b></Td><Td>{r.confNo}</Td><Td>{r.roomType}</Td><Td>{r.nights}</Td><Td>{won(r.rate)}</Td>
                <Td>{r.guarantee === "None" ? <Badge color="#d98a1c">없음</Badge> : r.guarantee}</Td><Td>{g && g.vip > 0 ? <Badge color="#C9A227">VIP {g.vip}</Badge> : "-"}</Td>
                <Td><Btn data-tour={`ar-checkin-${r.id} ${g?.name === "홍길동" ? "ar-checkin-hong" : ""}`} onClick={() => { s.act({ t: "ci.select", resId: r.id }); useStore.setState((st) => ({ ctx: { ...st.ctx, ciRes: r.id } })); }}>Check In</Btn></Td>
              </tr>); })}
              {!list.length && <tr><Td className="text-slate-500">오늘 도착 예정 예약이 없습니다.</Td></tr>}</tbody></table>
        </div>
      </Card>
      {sel && <CheckInWizard key={sel.id} resId={sel.id} />}
    </div>
  );
}

function CheckInWizard({ resId }: { resId: string }) {
  const s = useStore();
  const show = useUI((u) => u.show);
  const res = s.reservations.find((r) => r.id === resId)!;
  const g = s.guests.find((x) => x.id === res.guestId)!;
  const [idOk, setIdOk] = useState(false); const [room, setRoom] = useState<string>("");
  const [guar, setGuar] = useState<Guarantee>(res.guarantee); const [req, setReq] = useState(res.request); const [reqSaved, setReqSaved] = useState(false);
  const [floor, setFloor] = useState(res.roomType === "Standard" ? 6 : 12); const [direct, setDirect] = useState("");
  const [warn, setWarn] = useState<string[]>([]); const [done, setDone] = useState<string | null>(null);
  const rooms = s.rooms.filter((r) => r.type === res.roomType && r.floor === floor);
  const floors = [...new Set(s.rooms.filter((r) => r.type === res.roomType).map((r) => r.floor))].sort((a, b) => b - a);
  const assign = (no: string) => {
    const r = s.rooms.find((x) => x.no === no);
    const v = canAssign(r, res);
    s.act({ t: "ci.assign", resId, room: no, ok: v.ok, reason: v.reason });
    if (v.ok) { setRoom(no); setWarn([]); useStore.setState((st) => ({ ctx: { ...st.ctx, focusRoom: no } })); } else { setWarn([v.msg]); setRoom(""); }
  };
  const complete = () => {
    const r = s.completeCheckIn(resId, { room: room || undefined, idVerified: idOk, guarantee: guar, request: req });
    if (!r.ok) setWarn(r.missing.map((m) => `필수 항목 누락: ${m}`)); else { setWarn([]); setDone(room); }
  };
  if (done) return (
    <Card title="✅ 체크인 완료"><p className="text-sm">{g.name} 고객이 객실 <b>{done}</b>에 체크인했습니다. 객실 키 발급(가상) 및 Folio가 생성되었습니다.</p>
      <div className="mt-3 flex gap-2"><Btn variant="gold" onClick={() => show("3d")}>3D 호텔에서 확인</Btn><Btn variant="ghost" onClick={() => useStore.setState((st) => ({ ctx: { ...st.ctx, ciRes: undefined } }))}>목록으로</Btn></div></Card>
  );
  return (
    <Card title={`Check-in · ${g.name} (${res.confNo})`} right={<span className="text-xs text-slate-500">{res.roomType} · {res.nights}박 · {won(res.rate)}/박</span>}>
      <ErrorList items={warn} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-lg bg-mist p-3 text-xs text-slate-600">선호: {g.prefs.join(", ") || "없음"} · 요청: {res.request || g.requests || "없음"}</div>
          <label data-tour="ci-id" className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm"><input type="checkbox" checked={idOk} onChange={(e) => { setIdOk(e.target.checked); if (e.target.checked) s.act({ t: "ci.id", resId }); }} /> 1. 신분증/여권 확인 완료 (ID Verified)</label>
          <div className="rounded-lg border border-slate-200 p-3" data-tour="ci-guarantee-box">
            <div className="mb-1 text-sm font-semibold">3. 결제 보증 (Guarantee)</div>
            <div className="flex gap-2">
              <Select aria-label="guarantee method" value={guar} onChange={(e) => setGuar(e.target.value as Guarantee)}><option value="None">-- Select --</option><option value="Credit Card">Credit Card · 교육용 카드 ****4242</option><option value="Deposit">Deposit</option><option value="Company">Company</option></Select>
              <Btn data-tour="ci-guarantee" variant="ghost" onClick={() => { if (guar === "None") setWarn(["보증 방법을 선택하세요."]); else { setWarn([]); s.act({ t: "ci.guarantee", resId }); s.say("보증이 등록되었습니다."); } }}>등록</Btn>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">실제 카드번호는 입력받지 않습니다. 교육용 토큰만 사용합니다.</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-1 text-sm font-semibold">4. Special Request · 고객 요청사항</div>
            <div className="flex gap-2"><Input data-tour="ci-request" aria-label="special request" value={req} onChange={(e) => { setReq(e.target.value); setReqSaved(false); }} placeholder="예: 조용한 객실" />
              <Btn variant="ghost" onClick={() => { s.act({ t: "ci.request", resId, text: req }); setReqSaved(true); }}>{reqSaved ? "저장됨 ✔" : "저장"}</Btn></div>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 p-3" data-tour="ci-room">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold">2. 객실 배정 (Room Assignment) <Select className="!w-auto" aria-label="floor" value={floor} onChange={(e) => setFloor(Number(e.target.value))}>{floors.map((f) => <option key={f} value={f}>{f}층</option>)}</Select>
            <Input className="!w-24" aria-label="direct room number" placeholder="객실번호" value={direct} onChange={(e) => setDirect(e.target.value)} onKeyDown={(e) => e.key === "Enter" && assign(direct)} /><Btn variant="ghost" onClick={() => assign(direct)}>배정</Btn></div>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
            {rooms.map((r) => { const st = roomState(r); return (
              <button key={r.no} onClick={() => assign(r.no)} title={STATE_KO[st]} className={clsx("rounded-md px-1 py-2 text-xs font-bold text-white ring-offset-1 transition", room === r.no && "ring-4 ring-gold")} style={{ background: STATE_COLOR[st] }}>{r.no}<div className="text-[9px] font-normal opacity-90">{r.ooo ? "OOO" : r.fo === "Occupied" ? "Occ" : r.hk}</div></button>); })}
          </div>
          <Legend />
          {room && <p className="mt-2 text-sm text-emerald-700">✔ 선택된 객실: <b>{room}</b></p>}
        </div>
      </div>
      <Btn data-tour="ci-complete" variant="gold" className="mt-4" onClick={complete}>Complete Check-in</Btn>
    </Card>
  );
}

export function Legend() {
  return <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-600">{(Object.keys(STATE_COLOR) as (keyof typeof STATE_COLOR)[]).map((k) => <span key={k} className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: STATE_COLOR[k] }} />{STATE_KO[k]}</span>)}</div>;
}

/* ───────── In House / Departures ───────── */
export function InHouseDepartures({ only }: { only: boolean }) {
  const s = useStore();
  const list = s.reservations.filter((r) => r.status === "Checked In" && (!only || r.departure === s.businessDate));
  const open = (id: string) => { s.act({ t: "folio.open", resId: id }); s.go("folio", { folioRes: id }); };
  return (
    <Card title={only ? "Departures · 오늘 출발 예정" : "In House · 재실 고객"} right={<span className="text-xs text-slate-500">{list.length}건</span>}>
      <div className="max-h-[480px] overflow-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[560px]"><thead><tr><Th>Room</Th><Th>Guest</Th><Th>Departure</Th><Th>Balance</Th><Th /></tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r.id}><Td><b>{r.room}</b></Td><Td>{s.guests.find((g) => g.id === r.guestId)?.name}</Td><Td>{r.departure}</Td><Td className={balanceOf(s.folios[r.id]) > 0 ? "font-semibold text-rose-700" : ""}>{won(balanceOf(s.folios[r.id]))}</Td>
              <Td><Btn data-tour={`fo-open-${r.id}`} variant="ghost" onClick={() => open(r.id)}>Folio</Btn></Td></tr>))}</tbody></table>
      </div>
    </Card>
  );
}

/* ───────── Room Rack ───────── */
export function RoomRack() {
  const s = useStore();
  const [floor, setFloor] = useState(12); const [type, setType] = useState("All");
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => { if (s.ctx.focusRoom) { const r = s.rooms.find((x) => x.no === s.ctx.focusRoom); if (r) { setFloor(r.floor); setSel(r.no); } } }, [s.ctx.focusRoom]); // eslint-disable-line react-hooks/exhaustive-deps
  const rooms = s.rooms.filter((r) => (floor === 0 || r.floor === floor) && (type === "All" || r.type === type));
  const counts = useMemo(() => { const c: Record<string, number> = {}; s.rooms.forEach((r) => { const k = roomState(r); c[k] = (c[k] ?? 0) + 1; }); return c; }, [s.rooms]);
  const room = s.rooms.find((r) => r.no === sel);
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <Card title="Room Rack · 객실 현황" right={<div className="flex gap-2">
        <Select className="!w-auto" aria-label="floor filter" value={floor} onChange={(e) => setFloor(Number(e.target.value))}><option value={0}>전체 층</option>{[12, 11, 10, 9, 8, 7, 6, 5, 4, 3].map((f) => <option key={f} value={f}>{f}층</option>)}</Select>
        <Select className="!w-auto" aria-label="type filter" value={type} onChange={(e) => setType(e.target.value)}><option>All</option><option>Standard</option><option>Deluxe</option><option>Suite</option></Select></div>}>
        <div className="mb-3 flex flex-wrap gap-2 text-xs">{Object.entries(counts).map(([k, v]) => <span key={k} className="rounded-full border px-2 py-0.5" style={{ borderColor: STATE_COLOR[k as keyof typeof STATE_COLOR] }}>{STATE_KO[k as keyof typeof STATE_KO]} <b>{v}</b></span>)}</div>
        <div data-tour="room-grid" className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-8 xl:grid-cols-5 2xl:grid-cols-8">
          {rooms.map((r) => { const st = roomState(r); return (
            <button key={r.no} data-tour={`room-${r.no}`} onClick={() => { setSel(r.no); s.act({ t: "room.select", no: r.no }); }} className={clsx("rounded-md px-1 py-2 text-xs font-bold text-white transition hover:brightness-110", sel === r.no && "ring-4 ring-gold")} style={{ background: STATE_COLOR[st] }}>
              {r.no}<div className="text-[9px] font-normal opacity-90">{r.type[0]} · {r.ooo ? "OOO" : r.fo === "Occupied" ? "Occ" : r.hk}</div></button>); })}
        </div>
        <Legend />
      </Card>
      {room ? <RoomPanel key={room.no} no={room.no} /> : <Card title="객실 정보 패널"><p className="text-sm text-slate-500">객실을 클릭하면 OPERA 객실 정보 패널이 열립니다.</p></Card>}
    </div>
  );
}

function RoomPanel({ no }: { no: string }) {
  const s = useStore();
  const room = s.rooms.find((r) => r.no === no)!;
  const res = s.reservations.find((r) => r.id === room.resId);
  const guest = s.guests.find((g) => g.id === res?.guestId);
  const [reason, setReason] = useState(""); const [target, setTarget] = useState(""); const [msgs, setMsgs] = useState<string[]>([]);
  const st = roomState(room);
  const candidates = res ? s.rooms.filter((r) => r.type === res.roomType && r.fo === "Vacant" && !r.ooo && r.hk !== "Dirty").slice(-12) : [];
  const hk = (to: HK) => { const r = s.setHK(no, to); setMsgs(r.ok ? [] : [r.msg!]); };
  return (
    <Card title={`Room ${no} · ${room.type}`} right={<Badge color={STATE_COLOR[st]}>{STATE_KO[st]}</Badge>}>
      <ErrorList items={msgs} />
      <dl className="mb-3 grid grid-cols-2 gap-1 text-sm"><dt className="text-slate-500">Floor</dt><dd>{room.floor}</dd><dt className="text-slate-500">FO Status</dt><dd>{room.fo}</dd><dt className="text-slate-500">Housekeeping</dt><dd>{room.hk}</dd>
        {room.ooo && <><dt className="text-slate-500">OOO 사유</dt><dd>{room.oooReason}</dd></>}
        {guest && <><dt className="text-slate-500">Guest</dt><dd>{guest.name}</dd><dt className="text-slate-500">Stay</dt><dd>{res!.arrival}~{res!.departure}</dd></>}</dl>
      <div className="space-y-3 border-t pt-3">
        <div><div className="mb-1 text-xs font-semibold text-slate-600">Housekeeping Status 변경</div>
          <div className="flex gap-1.5"><Btn data-tour="rm-hk-clean" variant="ghost" onClick={() => hk("Clean")}>Clean</Btn><Btn variant="ghost" onClick={() => hk("Inspected")}>Inspected</Btn><Btn variant="ghost" onClick={() => hk("Dirty")}>Dirty</Btn></div></div>
        <div><div className="mb-1 text-xs font-semibold text-slate-600">Out of Order</div>
          {room.ooo ? <Btn data-tour="rm-ooo" variant="ghost" onClick={() => { const r = s.setOOO(no, false, ""); setMsgs(r.ok ? [] : [r.msg!]); }}>OOO 해제 (Return to Service)</Btn> : (
            <div className="flex gap-1.5"><Input aria-label="ooo reason" placeholder="사유 (필수)" value={reason} onChange={(e) => setReason(e.target.value)} /><Btn data-tour="rm-ooo" variant="danger" onClick={() => { const r = s.setOOO(no, true, reason); setMsgs(r.ok ? [] : [r.msg!]); }}>OOO 등록</Btn></div>)}</div>
        {res && room.fo === "Occupied" && (
          <div><div className="mb-1 text-xs font-semibold text-slate-600">Room Move · 객실 이동</div>
            <div className="flex gap-1.5"><Select aria-label="move target" value={target} onChange={(e) => setTarget(e.target.value)}><option value="">-- 이동할 객실 --</option>{candidates.map((r) => <option key={r.no} value={r.no}>{r.no} ({r.hk})</option>)}</Select>
              <Btn data-tour="rm-move" onClick={() => { if (!target) return setMsgs(["이동할 객실을 선택하세요."]); const r = s.moveGuest(res.id, target); setMsgs(r.ok ? [] : [r.msg!]); if (r.ok) s.say(`${no} → ${target} 이동 완료. ${no}은(는) Dirty로 전환됩니다.`); }}>Move</Btn></div></div>)}
      </div>
    </Card>
  );
}
