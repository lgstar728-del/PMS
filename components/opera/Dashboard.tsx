"use client";
import { useStore } from "@/lib/store";
import { dayStats } from "@/lib/rules";
import { won } from "@/lib/seed";
import { Card } from "../ui";

export function Dashboard() {
  const s = useStore();
  const st = dayStats(s);
  const arrivals = s.reservations.filter((r) => r.status === "Reserved" && r.arrival === s.businessDate).length;
  const deps = s.reservations.filter((r) => r.status === "Checked In" && r.departure === s.businessDate).length;
  const vip = s.reservations.filter((r) => r.status === "Reserved" && r.arrival === s.businessDate && (s.guests.find((g) => g.id === r.guestId)?.vip ?? 0) >= 2);
  const tiles = [
    { k: "Arrivals", ko: "오늘 도착", v: arrivals, go: "arrivals" as const },
    { k: "Departures", ko: "오늘 출발", v: deps, go: "departures" as const },
    { k: "In House", ko: "재실", v: st.sold, go: "inhouse" as const },
    { k: "Occupancy", ko: "점유율", v: st.occ.toFixed(1) + "%", go: "reports" as const },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <button key={t.k} data-tour={`tile-${t.go}`} onClick={() => s.go(t.go)} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-gold hover:shadow-md">
            <div className="text-xs font-semibold text-slate-500">{t.k} · {t.ko}</div>
            <div className="mt-1 text-3xl font-bold text-navy">{t.v}</div>
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Messages · 업무 알림">
          <ul className="space-y-2 text-sm">
            {vip.map((r) => <li key={r.id} className="rounded-lg bg-gold/15 px-3 py-2">⭐ VIP 도착: {s.guests.find((g) => g.id === r.guestId)?.name} ({r.roomType}) — 사전 객실 점검 필요</li>)}
            {s.rooms.filter((r) => r.ooo).map((r) => <li key={r.no} className="rounded-lg bg-slate-100 px-3 py-2">🔧 {r.no} OOO — {r.oooReason}</li>)}
            <li className="rounded-lg bg-slate-100 px-3 py-2">📝 하우스키핑: Dirty 객실 {s.rooms.filter((r) => r.hk === "Dirty" && r.fo === "Vacant" && !r.ooo).length}실 청소 대기</li>
            <li className="rounded-lg bg-slate-100 px-3 py-2">💬 교육용 호텔입니다. 모든 고객·결제 데이터는 가상입니다.</li>
          </ul>
        </Card>
        <Card title="오늘의 현황 · Today at a glance">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">총 객실 / 판매 가능</dt><dd className="font-semibold">200 / {st.available}</dd>
            <dt className="text-slate-500">Room Revenue</dt><dd className="font-semibold">{won(st.revenue)}</dd>
            <dt className="text-slate-500">ADR</dt><dd className="font-semibold">{won(Math.round(st.adr))}</dd>
            <dt className="text-slate-500">RevPAR</dt><dd className="font-semibold">{won(Math.round(st.revpar))}</dd>
          </dl>
        </Card>
      </div>
    </div>
  );
}
