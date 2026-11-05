"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { MISSIONS, missionById } from "@/lib/missions";
import { Badge, Btn, Card, Td, Th } from "./ui";
import { useUI } from "./ui-store";
import { bestScores } from "./Learn";

export function Score() {
  const { attempts, user, startMission, run } = useStore();
  const show = useUI((u) => u.show);
  const mine = attempts.filter((a) => a.user === user?.name).sort((a, b) => b.at - a.at);
  const best = bestScores(attempts, user?.name);
  const done = MISSIONS.filter((m) => best[m.id] !== undefined).length;
  const avg = done ? Math.round(Object.values(best).reduce((a, b) => a + b, 0) / done) : 0;
  const [cert, setCert] = useState(false);
  const last = run?.done ? run.result : undefined;
  return (
    <div className="space-y-4">
      {last && (
        <Card title={`🎉 방금 결과 · ${missionById(last.missionId).title}`}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {([["절차 정확도", last.score.procedure, 40], ["조작 정확도", last.score.operation, 30], ["처리 시간", last.score.time, 15], ["오류 대응", last.score.recovery, 15], ["총점", last.score.total, 100]] as [string, number, number][]).map(([k, v, max]) => (
              <div key={k} className="rounded-lg bg-mist p-3 text-center"><div className="text-[11px] text-slate-500">{k}</div><div className="text-xl font-bold text-navy">{v}<span className="text-xs text-slate-400">/{max}</span></div></div>))}
          </div>
          <p className="mt-2 text-xs text-slate-500">소요 {last.seconds}초 (목표 {missionById(last.missionId).targetSec}초) · 힌트 사용 {last.hintsUsed}회</p>
          {last.errors.length > 0 && <div className="mt-3"><div className="text-xs font-bold">오답 원인 분석</div><ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-700">{last.errors.map((e, i) => <li key={i}>{e.msg}</li>)}</ul></div>}
          <Btn className="mt-3" variant="gold" onClick={() => startMission(last.missionId)}>재실습</Btn>
        </Card>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">완료 미션</div><div className="text-2xl font-bold text-navy">{done}/{MISSIONS.length}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">평균 최고점</div><div className="text-2xl font-bold text-navy">{avg}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">수료증</div>{done === MISSIONS.length ? <Btn variant="gold" onClick={() => setCert(true)}>수료증 발급</Btn> : <div className="text-sm text-slate-500">모든 미션 완료 시 발급</div>}</div>
      </div>
      <Card title="모듈별 성취도">
        <div className="space-y-2">{MISSIONS.map((m) => (
          <div key={m.id} className="grid grid-cols-[1fr_auto] items-center gap-2 text-xs"><div><div className="font-semibold">{m.title}</div><div className="mt-1 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-gold" style={{ width: `${best[m.id] ?? 0}%` }} /></div></div><span className="w-12 text-right">{best[m.id] ?? "-"}</span></div>))}</div>
      </Card>
      <Card title="학습 이력">
        <div className="max-h-72 overflow-auto"><table className="w-full min-w-[520px]"><thead><tr><Th>일시</Th><Th>미션</Th><Th>점수</Th><Th>시간</Th><Th>오류</Th></tr></thead>
          <tbody>{mine.map((a) => <tr key={a.id}><Td>{new Date(a.at).toLocaleString("ko-KR")}</Td><Td>{missionById(a.missionId).title}</Td><Td><Badge color={a.score.total >= 80 ? "#2e9e6b" : a.score.total >= 60 ? "#d98a1c" : "#b83a4b"}>{a.score.total}</Badge></Td><Td>{a.seconds}s</Td><Td>{a.errors.length}</Td></tr>)}
            {!mine.length && <tr><Td className="text-slate-500">아직 기록이 없습니다. 미션을 시작해 보세요.</Td></tr>}</tbody></table></div>
        <Btn variant="ghost" className="mt-2" onClick={() => show("sim")}>실습하러 가기</Btn>
      </Card>
      {cert && <Certificate name={user?.name ?? ""} avg={avg} onClose={() => setCert(false)} />}
    </div>
  );
}

function Certificate({ name, avg, onClose }: { name: string; avg: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/70 p-4 print:bg-white">
      <div className="w-full max-w-2xl rounded-2xl border-8 border-double border-gold bg-white p-10 text-center shadow-2xl">
        <div className="text-xs tracking-[0.4em] text-gold">GRAND ACADEMY HOTEL</div>
        <h2 className="mt-2 text-3xl font-bold text-navy">수료증 · Certificate</h2>
        <p className="mt-6 text-sm text-slate-600">아래 사람은 HOTEL OPERA PMS TRAINING ACADEMY의<br />전체 실습 과정을 수료하였음을 증명합니다.</p>
        <div className="my-6 text-3xl font-bold text-navy">{name}</div>
        <p className="text-sm">평균 성취도 <b>{avg}점</b> · 발급일 {new Date().toLocaleDateString("ko-KR")}</p>
        <p className="mt-6 text-[11px] text-slate-400">본 수료증은 교육용 시뮬레이터 이수 확인서이며 Oracle의 공식 인증이 아닙니다.</p>
        <div className="no-print mt-6 flex justify-center gap-2"><Btn variant="gold" onClick={() => window.print()}>인쇄 / PDF 저장</Btn><Btn variant="ghost" onClick={onClose}>닫기</Btn></div>
      </div>
    </div>
  );
}
