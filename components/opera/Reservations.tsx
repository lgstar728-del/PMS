"use client";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { RATE_DESC, RATE_TABLE, nightsBetween, won } from "@/lib/seed";
import { availability } from "@/lib/rules";
import type { Guest, Guarantee, Reservation, RoomType } from "@/lib/types";
import { Badge, Btn, Card, ErrorList, Field, Input, Modal, Select, Td, Th } from "../ui";

const PREFS = ["High floor", "Quiet room", "Non-smoking", "Extra pillow", "Late check-out", "Twin bed", "Near elevator"];

export function ProfileForm({ onDone, initial }: { onDone: (id: string) => void; initial?: Partial<Guest> }) {
  const createProfile = useStore((s) => s.createProfile);
  const [f, setF] = useState({ name: initial?.name ?? "", phone: initial?.phone ?? "", email: "", vip: 0, prefs: [] as string[] });
  const [err, setErr] = useState<string[]>([]);
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const r = createProfile({ ...f }); if (r.ok) onDone(r.id!); else setErr([r.msg ?? "저장 실패"]); }}>
      <ErrorList items={err} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name · 이름 *"><Input aria-label="profile name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Phone · 전화(가상) *"><Input aria-label="profile phone" placeholder="010-0000-0000" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Email"><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="VIP Level (0-5)"><Select aria-label="vip level" value={f.vip} onChange={(e) => setF({ ...f, vip: Number(e.target.value) })}>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
      </div>
      <div><div className="mb-1 text-xs font-semibold text-slate-600">Preferences · 선호사항</div>
        <div className="flex flex-wrap gap-1.5">{PREFS.map((p) => { const on = f.prefs.includes(p); return <button type="button" key={p} onClick={() => setF({ ...f, prefs: on ? f.prefs.filter((x) => x !== p) : [...f.prefs, p] })} className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-gold bg-gold text-navy" : "border-slate-300 bg-white"}`}>{p}</button>; })}</div></div>
      <p className="text-[11px] text-slate-500">개인정보는 가상 데이터만 입력하세요. 실제 주민번호·카드번호는 수집하지 않습니다.</p>
      <Btn type="submit" data-tour="pf-save" variant="gold">Save Profile</Btn>
    </form>
  );
}

export function NewReservation() {
  const s = useStore();
  const [guestId, setGuestId] = useState(""); const [q, setQ] = useState("");
  const [f, setF] = useState({ arrival: "", departure: "", roomType: "" as RoomType | "", adults: 1, rateCode: "", rate: 0, guarantee: "None" as Guarantee });
  const [errors, setErrors] = useState<string[]>([]);
  const [showPf, setShowPf] = useState(false);
  const [done, setDone] = useState<Reservation | null>(null);
  const guest = s.guests.find((g) => g.id === guestId);
  const matches = useMemo(() => (q.trim() ? s.guests.filter((g) => g.name.includes(q.trim()) || g.phone.includes(q.trim())).slice(0, 5) : []), [q, s.guests]);
  const nights = f.arrival && f.departure ? nightsBetween(f.arrival, f.departure) : 0;
  useEffect(() => { if (f.rateCode && f.roomType) setF((x) => ({ ...x, rate: RATE_TABLE[x.rateCode][x.roomType as RoomType] })); }, [f.rateCode, f.roomType]);
  const avail = f.roomType && f.arrival && f.departure > f.arrival ? availability(s, f.roomType, f.arrival, f.departure) : null;
  const save = () => {
    const r = s.createReservation({ guestId, guestName: guest?.name ?? "", ...f });
    if (r.ok) { setErrors([]); setDone(r.res!); } else setErrors(r.errors);
  };
  return (
    <Card title="New Reservation · 신규 예약">
      <ErrorList items={errors} />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-3 rounded-lg border border-dashed border-slate-300 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Guest · 고객 (검색: 이름/전화)"><Input aria-label="guest search" value={guest ? guest.name : q} onChange={(e) => { setGuestId(""); setQ(e.target.value); }} placeholder="이름 검색…" /></Field>
            <Btn data-tour="res-newprofile" variant="gold" onClick={() => setShowPf(true)}>+ New Profile</Btn>
          </div>
          {matches.length > 0 && !guest && <div className="mt-2 flex flex-wrap gap-1.5">{matches.map((g) => <button key={g.id} onClick={() => { setGuestId(g.id); setQ(""); }} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs hover:border-gold">{g.name} · {g.phone}</button>)}</div>}
          {guest && <p className="mt-1 text-xs text-emerald-700">✔ 프로필 연결됨: {guest.name} ({guest.phone}) {guest.vip > 0 && <Badge color="#C9A227">VIP {guest.vip}</Badge>}</p>}
        </div>
        <Field label="Arrival · 체크인"><Input type="date" aria-label="arrival" value={f.arrival} onChange={(e) => setF({ ...f, arrival: e.target.value })} /></Field>
        <Field label="Departure · 체크아웃"><Input type="date" aria-label="departure" value={f.departure} onChange={(e) => setF({ ...f, departure: e.target.value })} /></Field>
        <Field label="Nights · 박수"><Input readOnly value={nights > 0 ? nights : ""} /></Field>
        <Field label="Room Type · 객실 유형"><Select data-tour="res-roomtype" aria-label="room type" value={f.roomType} onChange={(e) => setF({ ...f, roomType: e.target.value as RoomType })}><option value="">-- Select --</option>{(["Standard", "Deluxe", "Suite"] as RoomType[]).map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Adults · 인원"><Input type="number" min={1} aria-label="adults" value={f.adults} onChange={(e) => setF({ ...f, adults: Number(e.target.value) })} /></Field>
        <Field label="Availability · 잔여"><Input readOnly value={avail === null ? "" : avail > 0 ? `${avail}실 가능` : "만실"} /></Field>
        <Field label="Rate Code · 요금 코드"><Select data-tour="res-ratecode" aria-label="rate code" value={f.rateCode} onChange={(e) => setF({ ...f, rateCode: e.target.value })}><option value="">-- Select --</option>{Object.keys(RATE_TABLE).map((c) => <option key={c} value={c}>{c} · {RATE_DESC[c]}</option>)}</Select></Field>
        <Field label="Rate / Night · 1박 요금(원)"><Input data-tour="res-rate" type="number" aria-label="rate" value={f.rate || ""} onChange={(e) => setF({ ...f, rate: Number(e.target.value) })} /></Field>
        <Field label="Guarantee · 보증/결제"><Select aria-label="guarantee" value={f.guarantee} onChange={(e) => setF({ ...f, guarantee: e.target.value as Guarantee })}><option value="None">-- Select --</option><option>Credit Card</option><option>Deposit</option><option>Company</option></Select></Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Btn data-tour="res-save" onClick={save}>Save Reservation</Btn>
        <span className="text-sm text-slate-600">예상 객실료: <b>{won((f.rate || 0) * Math.max(nights, 0))}</b></span>
      </div>
      {showPf && <Modal title="New Profile · 고객 프로필 생성" onClose={() => setShowPf(false)}><ProfileForm onDone={(id) => { setGuestId(id); setShowPf(false); }} /></Modal>}
      {done && (
        <Modal title="예약이 저장되었습니다" onClose={() => setDone(null)}>
          <div className="space-y-2 text-sm">
            <p>Confirmation No. <b className="text-lg text-navy">{done.confNo}</b></p>
            <p>{guest?.name} · {done.roomType} · {done.arrival} ~ {done.departure} ({done.nights}박) · {won(done.rate)}/박</p>
            <div className="flex gap-2 pt-2">
              <Btn data-tour="res-conf-open" variant="gold" onClick={() => { s.act({ t: "res.open", id: done.id }); sessionStorage.setItem("openRes", done.id); s.go("reservations"); setDone(null); }}>예약 열기</Btn>
              <Btn variant="ghost" onClick={() => { setDone(null); setF({ arrival: "", departure: "", roomType: "", adults: 1, rateCode: "", rate: 0, guarantee: "None" }); setGuestId(""); }}>새 예약</Btn>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

const statusColor: Record<string, string> = { Reserved: "#1f7fbf", "Checked In": "#b83a4b", "Checked Out": "#6b7280", Cancelled: "#9ca3af", "No Show": "#d98a1c" };

export function ReservationList() {
  const s = useStore();
  const [q, setQ] = useState(""); const [applied, setApplied] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { const id = sessionStorage.getItem("openRes"); if (id) { sessionStorage.removeItem("openRes"); setOpen(id); } }, []);
  const gname = (id: string) => s.guests.find((g) => g.id === id)?.name ?? "";
  const rows = s.reservations.filter((r) => !applied || gname(r.guestId).includes(applied) || r.confNo.includes(applied) || r.id.includes(applied) || (r.room ?? "").includes(applied));
  const search = () => { setApplied(q); s.act({ t: "search", kind: "res", q }); };
  const res = s.reservations.find((r) => r.id === open);
  return (
    <Card title="Reservations · 예약 조회" right={<span className="text-xs text-slate-500">{rows.length}건</span>}>
      <div className="mb-3 flex gap-2">
        <Input data-tour="rs-search" aria-label="reservation search" placeholder="고객명 / 확인번호 / 객실" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
        <Btn onClick={search}>Search</Btn>
      </div>
      <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[640px]"><thead><tr><Th>Conf</Th><Th>Guest</Th><Th>Arrival</Th><Th>Departure</Th><Th>Type</Th><Th>Rate</Th><Th>Room</Th><Th>Status</Th></tr></thead>
          <tbody>{rows.slice(0, 60).map((r) => (
            <tr key={r.id} onClick={() => { setOpen(r.id); s.act({ t: "res.open", id: r.id }); }} className="cursor-pointer hover:bg-gold/10">
              <Td>{r.confNo}</Td><Td><b>{gname(r.guestId)}</b></Td><Td>{r.arrival}</Td><Td>{r.departure}</Td><Td>{r.roomType}</Td><Td>{won(r.rate)}</Td><Td>{r.room ?? "-"}</Td><Td><Badge color={statusColor[r.status]}>{r.status}</Badge></Td>
            </tr>))}</tbody></table>
      </div>
      {res && <ResDetail res={res} onClose={() => setOpen(null)} />}
    </Card>
  );
}

function ResDetail({ res, onClose }: { res: Reservation; onClose: () => void }) {
  const s = useStore();
  const g = s.guests.find((x) => x.id === res.guestId);
  const [dep, setDep] = useState(res.departure); const [adults, setAdults] = useState(res.adults);
  const [reason, setReason] = useState(""); const [errs, setErrs] = useState<string[]>([]);
  return (
    <Modal title={`${res.confNo} · ${g?.name}`} onClose={onClose} width="max-w-xl">
      <ErrorList items={errs} />
      <dl className="mb-3 grid grid-cols-2 gap-1 text-sm"><dt className="text-slate-500">Status</dt><dd><Badge color={statusColor[res.status]}>{res.status}</Badge></dd><dt className="text-slate-500">Stay</dt><dd>{res.arrival} → {res.departure} ({res.nights}박)</dd><dt className="text-slate-500">Room</dt><dd>{res.roomType} {res.room ?? ""}</dd><dt className="text-slate-500">Rate</dt><dd>{res.rateCode} · {won(res.rate)}</dd><dt className="text-slate-500">Guarantee</dt><dd>{res.guarantee}</dd><dt className="text-slate-500">Request</dt><dd>{res.request || "-"}</dd></dl>
      {res.status === "Reserved" ? (
        <div className="space-y-3 border-t pt-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Departure"><Input type="date" aria-label="modify departure" value={dep} onChange={(e) => setDep(e.target.value)} /></Field>
            <Field label="Adults"><Input type="number" aria-label="modify adults" value={adults} onChange={(e) => setAdults(Number(e.target.value))} /></Field>
          </div>
          <Btn data-tour="rs-modify" onClick={() => { const r = s.modifyReservation(res.id, { departure: dep, adults }); if (r.ok) { s.say("예약이 수정되었습니다."); setErrs([]); onClose(); } else setErrs(r.errors); }}>Save Changes · 수정 저장</Btn>
          <div className="flex gap-2 border-t pt-3">
            <Input aria-label="cancel reason" placeholder="취소 사유 (필수)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Btn data-tour="rs-cancel" variant="danger" onClick={() => { const r = s.cancelReservation(res.id, reason); if (r.ok) { s.say("예약이 취소되었습니다.", "warn"); onClose(); } else if (r.msg) setErrs([r.msg]); }}>Cancel Reservation</Btn>
          </div>
        </div>
      ) : <p className="text-xs text-slate-500">이 상태의 예약은 수정/취소할 수 없습니다.</p>}
    </Modal>
  );
}

export function Profiles() {
  const s = useStore();
  const [q, setQ] = useState(""); const [applied, setApplied] = useState("");
  const [show, setShow] = useState(false); const [open, setOpen] = useState<string | null>(null);
  const rows = s.guests.filter((g) => !applied || g.name.includes(applied) || g.phone.includes(applied));
  const search = () => { setApplied(q); s.act({ t: "search", kind: "guest", q }); };
  const g = s.guests.find((x) => x.id === open);
  return (
    <Card title="Profiles · 고객 프로필" right={<Btn data-tour="pf-new" variant="gold" onClick={() => setShow(true)}>+ New Profile</Btn>}>
      <div className="mb-3 flex gap-2">
        <Input data-tour="pf-search" aria-label="profile search" placeholder="이름 / 전화번호" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
        <Btn onClick={search}>Search</Btn>
      </div>
      <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[520px]"><thead><tr><Th>Name</Th><Th>Phone</Th><Th>VIP</Th><Th>Membership</Th><Th>Preferences</Th></tr></thead>
          <tbody>{rows.slice(0, 50).map((x) => <tr key={x.id} className="cursor-pointer hover:bg-gold/10" onClick={() => setOpen(x.id)}><Td><b>{x.name}</b></Td><Td>{x.phone}</Td><Td>{x.vip > 0 ? <Badge color="#C9A227">VIP {x.vip}</Badge> : "-"}</Td><Td>{x.membership}</Td><Td className="text-xs">{x.prefs.join(", ") || "-"}</Td></tr>)}</tbody></table>
      </div>
      {show && <Modal title="New Profile · 신규 프로필" onClose={() => setShow(false)}><ProfileForm onDone={() => { setShow(false); s.say("프로필이 저장되었습니다."); }} /></Modal>}
      {g && <ProfileDetail g={g} onClose={() => setOpen(null)} />}
    </Card>
  );
}

function ProfileDetail({ g, onClose }: { g: Guest; onClose: () => void }) {
  const s = useStore();
  const [req, setReq] = useState(g.requests); const [vip, setVip] = useState(g.vip); const [mem, setMem] = useState(g.membership);
  const stays = s.reservations.filter((r) => r.guestId === g.id);
  return (
    <Modal title={`${g.name} · Profile`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone"><Input readOnly value={g.phone} /></Field>
        <Field label="VIP Level"><Select value={vip} onChange={(e) => setVip(Number(e.target.value))}>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</Select></Field>
        <Field label="Membership"><Select value={mem} onChange={(e) => setMem(e.target.value as Guest["membership"])}>{["None", "Silver", "Gold", "Platinum"].map((n) => <option key={n}>{n}</option>)}</Select></Field>
        <Field label="Preferences"><Input readOnly value={g.prefs.join(", ")} /></Field>
        <Field label="Requests · 요청사항" className="col-span-2"><textarea data-tour="pf-requests" aria-label="profile requests" className="o-input w-full rounded-md border border-slate-300 p-2 text-sm" rows={3} value={req} onChange={(e) => setReq(e.target.value)} /></Field>
      </div>
      <div className="mt-2 text-xs text-slate-600">예약 이력: {stays.map((r) => `${r.confNo}(${r.status})`).join(", ") || "없음"}</div>
      <Btn className="mt-3" variant="gold" onClick={() => { s.updateProfile(g.id, { vip, membership: mem, requests: req }); s.say("프로필이 수정되었습니다."); onClose(); }}>Save</Btn>
    </Modal>
  );
}
