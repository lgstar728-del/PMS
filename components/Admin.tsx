"use client";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { MISSIONS, missionById } from "@/lib/missions";
import { demoAttempts } from "@/lib/demo";
import { Btn, Card, Td, Th } from "./ui";

export function Admin() {
  const { attempts, user, resetAll, say } = useStore();
  const demo = useMemo(() => demoAttempts(), []);
  if (user?.role !== "admin") return <Card title="교육관리자 화면"><p className="text-sm">관리자 권한이 필요합니다. 로그아웃 후 ‘교육 관리자’로 입장하세요.</p></Card>;
  const all = [...demo, ...attempts];
  const users = [...new Set(all.map((a) => a.user))];
  const rows = users.map((u) => {
    const at = all.filter((a) => a.user === u);
    const best: Record<string, number> = {}; at.forEach((a) => (best[a.missionId] = Math.max(best[a.missionId] ?? 0, a.score.total)));
    const done = Object.keys(best).length; const avg = done ? Math.round(Object.values(best).reduce((a, b) => a + b, 0) / done) : 0;
    return { u, done, avg, errors: at.reduce((s, a) => s + a.errors.length, 0), isDemo: at.every((a) => a.demo) };
  });
  const byMission = MISSIONS.map((m) => { const a = all.filter((x) => x.missionId === m.id); return { m, n: a.length, avg: a.length ? Math.round(a.reduce((s, x) => s + x.score.total, 0) / a.length) : 0 }; });
  const errFreq: Record<string, { msg: string; n: number }> = {};
  all.forEach((a) => a.errors.forEach((e) => { errFreq[e.code] = { msg: e.msg, n: (errFreq[e.code]?.n ?? 0) + 1 }; }));
  const topErr = Object.entries(errFreq).sort((a, b) => b[1].n - a[1].n).slice(0, 6);
  const csv = () => {
    const head = "trainee,mission,score,procedure,operation,time,recovery,seconds,errors,demo\n";
    const body = all.map((a) => [a.user, missionById(a.missionId).title, a.score.total, a.score.procedure, a.score.operation, a.score.time, a.score.recovery, a.seconds, a.errors.length, a.demo ? "demo" : "real"].join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + head + body], { type: "text/csv;charset=utf-8" }));
    const el = document.createElement("a"); el.href = url; el.download = "opera-academy-results.csv"; el.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gold/15 p-3 text-xs text-slate-700">‘가상’ 표시 학습자는 시연용 샘플 데이터입니다. 이 데이터는 브라우저 안에서만 계산되며, 여러 기기의 학습 기록을 모으려면 Supabase/PostgreSQL 연결이 필요합니다(README 참고).</div>
      <Card title="신입사원별 학습 진도" right={<Btn variant="gold" onClick={csv}>평가 결과 CSV 다운로드</Btn>}>
        <div className="overflow-auto"><table className="w-full min-w-[520px]"><thead><tr><Th>이름</Th><Th>진도</Th><Th>평균(최고점)</Th><Th>오류 수</Th><Th>수료</Th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.u}><Td><b>{r.u}</b></Td><Td><div className="flex items-center gap-2"><div className="h-2 w-24 rounded bg-slate-100"><div className="h-2 rounded bg-navy" style={{ width: `${(r.done / MISSIONS.length) * 100}%` }} /></div>{r.done}/{MISSIONS.length}</div></Td><Td>{r.avg}</Td><Td>{r.errors}</Td><Td>{r.done === MISSIONS.length ? "✅ 수료" : "진행중"}</Td></tr>)}</tbody></table></div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="모듈(미션)별 평균 성취도">
          <div className="space-y-2">{byMission.map(({ m, avg, n }) => <div key={m.id} className="text-xs"><div className="flex justify-between"><span>{m.title}</span><span>{avg} · {n}회</span></div><div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-gold" style={{ width: `${avg}%` }} /></div></div>)}</div>
        </Card>
        <Card title="실습 오류 빈도 TOP">
          <ul className="space-y-1.5 text-sm">{topErr.map(([code, e]) => <li key={code} className="flex justify-between gap-2 rounded bg-mist px-2 py-1"><span>{e.msg}</span><b>{e.n}</b></li>)}</ul>
        </Card>
      </div>
      <Card title="데이터 관리"><Btn variant="danger" onClick={() => { if (confirm("이 브라우저의 모든 실습 데이터와 학습 기록을 초기화할까요?")) { resetAll(); say("초기화되었습니다.", "warn"); } }}>실습 데이터 + 학습 기록 전체 초기화</Btn></Card>
    </div>
  );
}
