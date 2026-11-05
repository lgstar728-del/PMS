"use client";
import { useState } from "react";
import { useStore, CHARGE_CODES } from "@/lib/store";
import { balanceOf, dayStats } from "@/lib/rules";
import { won } from "@/lib/seed";
import { Badge, Btn, Card, ErrorList, Field, Input, Modal, Select, Td, Th } from "../ui";

export function Folio() {
  const s = useStore();
  const id = s.ctx.folioRes;
  const [q, setQ] = useState("");
  if (!id) {
    const list = s.reservations.filter((r) => r.status === "Checked In" && (!q || s.guests.find((g) => g.id === r.guestId)?.name.includes(q) || (r.room ?? "").includes(q)));
    return (
      <Card title="Billing · 재실 고객 선택">
        <Input className="mb-3" aria-label="billing search" placeholder="고객명 / 객실번호" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-[440px] overflow-auto rounded-lg border">
          <table className="w-full min-w-[480px]"><thead><tr><Th>Room</Th><Th>Guest</Th><Th>Departure</Th><Th>Balance</Th><Th /></tr></thead>
            <tbody>{list.slice(0, 50).map((r) => (
              <tr key={r.id}><Td><b>{r.room}</b></Td><Td>{s.guests.find((g) => g.id === r.guestId)?.name}</Td><Td>{r.departure}</Td><Td>{won(balanceOf(s.folios[r.id]))}</Td>
                <Td><Btn data-tour={`fo-open-${r.id}`} variant="ghost" onClick={() => { s.act({ t: "folio.open", resId: r.id }); useStore.setState((st) => ({ ctx: { ...st.ctx, folioRes: r.id } })); }}>Folio</Btn></Td></tr>))}</tbody></table>
        </div>
      </Card>
    );
  }
  return <FolioDetail resId={id} />;
}

function FolioDetail({ resId }: { resId: string }) {
  const s = useStore();
  const res = s.reservations.find((r) => r.id === resId)!;
  const g = s.guests.find((x) => x.id === res.guestId);
  const lines = s.folios[resId] ?? [];
  const charges = lines.filter((l) => l.kind === "charge").reduce((a, l) => a + l.amount, 0);
  const paid = lines.filter((l) => l.kind === "payment").reduce((a, l) => a + l.amount, 0);
  const bal = charges - paid;
  const [code, setCode] = useState("RST"); const [amt, setAmt] = useState(""); const [method, setMethod] = useState("Credit Card"); const [pay, setPay] = useState("");
  const [msgs, setMsgs] = useState<string[]>([]); const [receipt, setReceipt] = useState(false); const [fin, setFin] = useState(false);
  const closed = res.status !== "Checked In";
  return (
    <div className="space-y-4">
      <Card title={`Folio · ${g?.name} · 객실 ${res.room ?? "-"}`} right={<div className="flex items-center gap-2"><Badge color={closed ? "#6b7280" : "#b83a4b"}>{res.status}</Badge><Btn variant="ghost" onClick={() => useStore.setState((st) => ({ ctx: { ...st.ctx, folioRes: undefined } }))}>목록</Btn></div>}>
        <ErrorList items={msgs} />
        <div className="overflow-auto rounded-lg border">
          <table className="w-full min-w-[480px]"><thead><tr><Th>Date</Th><Th>Code</Th><Th>Description</Th><Th>Charge</Th><Th>Payment</Th></tr></thead>
            <tbody>{lines.map((l) => <tr key={l.id}><Td>{l.date}</Td><Td>{l.code}</Td><Td>{l.desc}</Td><Td>{l.kind === "charge" ? won(l.amount) : ""}</Td><Td className="text-emerald-700">{l.kind === "payment" ? won(l.amount) : ""}</Td></tr>)}</tbody>
            <tfoot><tr className="bg-mist font-bold"><Td /><Td /><Td>Total / Balance</Td><Td>{won(charges)}</Td><Td className={bal > 0 ? "text-rose-700" : "text-emerald-700"}>Balance {won(bal)}</Td></tr></tfoot></table>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">※ 교육 단순화: 실제 OPERA는 Night Audit에서 일자별로 객실료를 Post합니다. 이 시뮬레이터는 체크인 시 전 숙박일의 객실료를 미리 올립니다.</p>
      </Card>
      {!closed && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Post Charge · 부대요금 등록">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Transaction Code"><Select aria-label="charge code" value={code} onChange={(e) => setCode(e.target.value)}>{Object.entries(CHARGE_CODES).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}</Select></Field>
              <Field label="Amount (원)"><Input type="number" aria-label="charge amount" value={amt} onChange={(e) => setAmt(e.target.value)} /></Field>
            </div>
            <div className="mt-3 flex gap-2"><Btn data-tour="fo-post" onClick={() => { const r = s.postCharge(resId, code, Number(amt)); if (r.ok) { setMsgs([]); setAmt(""); s.say("요금이 등록되었습니다."); } else setMsgs([r.msg!]); }}>Post</Btn>
              <Btn data-tour="fo-adjust" variant="ghost" onClick={() => { const r = s.adjust(resId); if (!r.ok) setMsgs(["권한 부족: 요금 조정(Adjustment)·환불은 Supervisor 권한이 필요합니다. 슈퍼바이저에게 요청하세요."]); else s.say("슈퍼바이저 권한으로 조정 화면이 열렸습니다 (교육용: 변경 없음)", "warn"); }}>Adjust…</Btn></div>
          </Card>
          <Card title="Payment · 가상 결제">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Method"><Select aria-label="payment method" value={method} onChange={(e) => setMethod(e.target.value)}><option>Credit Card</option><option>Cash</option><option>Bank Transfer</option></Select></Field>
              <Field label="Amount (원)"><Input type="number" aria-label="payment amount" value={pay} placeholder={String(bal)} onChange={(e) => setPay(e.target.value)} /></Field>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{method === "Credit Card" ? "교육용 카드 ****4242 (실제 결제망 연결 없음)" : "가상 처리"}</p>
            <div className="mt-3 flex gap-2"><Btn data-tour="fo-pay" variant="gold" onClick={() => { const r = s.pay(resId, method, Number(pay || bal)); setMsgs(r.ok ? [] : [r.msg]); if (r.ok) { setPay(""); s.say(r.msg); } }}>Pay</Btn>
              <Btn variant="ghost" onClick={() => setPay(String(bal))}>잔액 입력</Btn></div>
          </Card>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Btn data-tour="fo-receipt" variant="ghost" onClick={() => { setReceipt(true); s.act({ t: "receipt.view", resId }); }}>Receipt · 영수증</Btn>
        {!closed && <Btn data-tour="fo-checkout" variant="danger" onClick={() => { const r = s.checkOut(resId); if (!r.ok) setMsgs([r.msg!]); else { setFin(true); } }}>Check Out</Btn>}
      </div>
      {fin && <Modal title="체크아웃 완료" onClose={() => setFin(false)}><p className="text-sm">{g?.name} 고객이 체크아웃했습니다. 객실 <b>{res.room}</b>은(는) Dirty 상태로 전환되어 하우스키핑 청소 대기 중입니다.</p><Btn className="mt-3" variant="gold" onClick={() => { setFin(false); s.go("rooms", { focusRoom: res.room }); }}>Room Rack에서 확인</Btn></Modal>}
      {receipt && (
        <Modal title="Receipt (교육용)" onClose={() => setReceipt(false)}>
          <div className="space-y-1 text-sm"><div className="text-center font-bold tracking-widest text-navy">GRAND ACADEMY HOTEL</div><div className="text-center text-xs text-slate-500">TRAINING RECEIPT · 실제 영수증 아님</div><hr />
            <div>Guest: {g?.name} · Room {res.room}</div><div>{res.arrival} ~ {res.departure}</div><hr />
            {lines.map((l) => <div key={l.id} className="flex justify-between"><span>{l.desc}</span><span>{l.kind === "payment" ? "-" : ""}{won(l.amount)}</span></div>)}<hr />
            <div className="flex justify-between font-bold"><span>Total</span><span>{won(charges)}</span></div><div className="flex justify-between"><span>Paid</span><span>{won(paid)}</span></div><div className="flex justify-between font-bold"><span>Balance</span><span>{won(bal)}</span></div></div>
        </Modal>
      )}
    </div>
  );
}

/* ───────── Reports ───────── */
export function DailyReport() {
  const s = useStore();
  const st = dayStats(s);
  const max = Math.max(1, ...st.byType.map((b) => b.avail));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Occupancy · 점유율", st.occ.toFixed(1) + "%"], ["ADR · 평균객실단가", won(Math.round(st.adr))], ["RevPAR", won(Math.round(st.revpar))], ["Room Revenue", won(st.revenue)]].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-semibold text-slate-500">{k}</div><div className="mt-1 text-xl font-bold text-navy">{v}</div></div>))}
      </div>
      <Card title="유형별 판매 현황 · Room Type Breakdown">
        <div className="space-y-2">{st.byType.map((b) => (
          <div key={b.type} className="grid grid-cols-[80px_1fr_120px] items-center gap-2 text-sm"><span>{b.type}</span>
            <div className="h-5 overflow-hidden rounded bg-slate-100"><div className="h-full bg-gold" style={{ width: `${(b.avail / max) * 100}%`, opacity: 0.35 }}><div className="h-full bg-navy" style={{ width: `${b.avail ? (b.sold / b.avail) * 100 : 0}%` }} /></div></div>
            <span className="text-right text-xs">{b.sold}/{b.avail} · {won(b.revenue)}</span></div>))}</div>
      </Card>
      <p className="rounded-lg bg-white p-3 text-xs text-slate-600">Occupancy = 판매 객실 ÷ 판매 가능 객실(OOO 제외) · ADR = 객실 매출 ÷ 판매 객실 · RevPAR = 객실 매출 ÷ 판매 가능 객실 (= ADR × Occupancy). 이 값은 현재 시뮬레이션 데이터(재실 기준)로 계산한 교육용 수치입니다.</p>
    </div>
  );
}
export const Reports = () => <DailyReport />;

/* ───────── Night Audit ───────── */
export function NightAudit() {
  const s = useStore();
  const [msg, setMsg] = useState<string[]>([]);
  const noshow = s.reservations.filter((r) => r.status === "Reserved" && r.arrival === s.businessDate);
  const pending = s.reservations.filter((r) => r.status === "Checked In" && r.departure === s.businessDate);
  const run = (k: "noshow" | "departures" | "post" | "report" | "rollover") => { const r = s.auditStep(k); setMsg(r.ok ? [] : [r.msg!]); };
  const done = (k: string) => s.audit.includes(k);
  const steps = [
    { k: "noshow" as const, tour: "au-noshow", title: "1. 미도착(No-Show) 예약 처리", desc: `오늘 도착 예정이지만 체크인하지 않은 예약 ${noshow.length}건`, btn: "No-Show 처리" },
    { k: "departures" as const, tour: "au-departures", title: "2. 출발 미처리 확인", desc: `오늘 출발 예정이나 아직 체크아웃하지 않은 고객 ${pending.length}명 (연장 또는 체크아웃 안내)`, btn: "확인" },
    { k: "post" as const, tour: "au-post", title: "3. 객실료·세금 Post (시뮬레이션)", desc: "재실 고객 전원에게 당일 객실료를 Post합니다. 실제 데이터는 변경되지 않습니다.", btn: "Post 실행" },
    { k: "report" as const, tour: "au-report", title: "4. 일일 운영보고서 생성", desc: "점유율·ADR·RevPAR 보고서를 생성합니다.", btn: "보고서 생성" },
    { k: "rollover" as const, tour: "au-rollover", title: "5. 영업일 전환 (Rollover)", desc: "다음 영업일로 전환합니다 — 교육용 시뮬레이션이며 실제 날짜는 바뀌지 않습니다.", btn: "전환 시뮬레이션" },
  ];
  return (
    <div className="space-y-4">
      <ErrorList items={msg} />
      <Card title="Night Audit · 일일 마감 (교육용 시뮬레이션)">
        <ol className="space-y-2">{steps.map((st) => (
          <li key={st.k} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
            <div className="min-w-0 flex-1"><div className="text-sm font-bold">{st.title} {done(st.k) && <Badge color="#2e9e6b">완료</Badge>}</div><div className="text-xs text-slate-500">{st.desc}</div></div>
            <Btn data-tour={st.tour} variant={done(st.k) ? "ghost" : "navy"} onClick={() => run(st.k)}>{st.btn}</Btn>
          </li>))}</ol>
      </Card>
      {done("report") && <DailyReport />}
    </div>
  );
}
