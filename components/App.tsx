"use client";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { missionById } from "@/lib/missions";
import { Opera } from "./opera/Opera";
import { Learn } from "./Learn";
import { Tutor } from "./Tutor";
import { Score } from "./Score";
import { Admin } from "./Admin";
import { Btn, Field, Input, Toast } from "./ui";
import { useUI, type Center } from "./ui-store";

const Hotel3D = dynamic(() => import("./Hotel3D"), { ssr: false, loading: () => <div className="grid h-[420px] place-items-center text-sm text-slate-500">3D 호텔 불러오는 중…</div> });

function Landing() {
  const login = useStore((s) => s.login);
  const [name, setName] = useState(""); const [role, setRole] = useState<"trainee" | "admin">("trainee");
  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-navy via-navy-700 to-navy p-4">
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) login(name.trim(), role); }} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-7 shadow-2xl">
        <div className="text-center"><div className="text-[11px] font-bold tracking-[0.35em] text-gold">GRAND ACADEMY HOTEL</div><h1 className="mt-1 text-xl font-extrabold leading-tight text-navy">HOTEL OPERA PMS<br />TRAINING ACADEMY</h1><p className="mt-2 text-xs text-slate-500">객실부 신입사원을 위한 OPERA PMS 실습 시뮬레이터 · 가상 데이터 전용</p></div>
        <Field label="이름 (표시용)"><Input aria-label="trainee name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 신입 김하늘" /></Field>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {([["trainee", "신입사원 (학습자)"], ["admin", "교육 관리자 / Supervisor"]] as const).map(([v, l]) => <button type="button" key={v} onClick={() => setRole(v)} className={clsx("rounded-lg border-2 px-3 py-2 font-semibold", role === v ? "border-gold bg-gold/15" : "border-slate-200")}>{l}</button>)}
        </div>
        <Btn type="submit" variant="gold" className="w-full !py-2.5" disabled={!name.trim()}>입장하기</Btn>
        <p className="text-[11px] leading-relaxed text-slate-500">데모용 입장입니다(비밀번호 없음). 학습 기록은 이 브라우저에만 저장되며 실제 호텔 PMS·결제망과 연결되지 않습니다. 모든 화면은 교육용으로 재구성한 모의 화면입니다.</p>
      </form>
    </main>
  );
}

const TABS: [Center, string][] = [["sim", "OPERA 시뮬레이터"], ["3d", "3D 호텔"], ["score", "평가·성취"], ["admin", "관리자"]];

function Tour() {
  const run = useStore((s) => s.run);
  if (!run || run.done) return null;
  const t = missionById(run.missionId).steps[run.stepIdx].target;
  const list = !t ? [] : Array.isArray(t) ? t : [t];
  if (!list.length) return null;
  const css = list.map((x) => `[data-tour~="${x}"]`).join(",") + `{outline:3px solid #C9A227 !important;outline-offset:2px;animation:tourpulse 1.4s infinite;}`;
  return <style>{css}</style>;
}

function BottomBar() {
  const run = useStore((s) => s.run);
  if (!run) return <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-4 py-2 text-xs text-slate-500">자유 연습 모드 — 왼쪽 커리큘럼에서 미션을 선택하면 단계별 실습이 시작됩니다.</div>;
  const m = missionById(run.missionId);
  const pct = run.done ? 100 : Math.round((run.stepIdx / m.steps.length) * 100);
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-4 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 text-xs">
        <b className="hidden whitespace-nowrap sm:inline">{m.title}</b>
        <div className="h-2 min-w-20 flex-1 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-gold transition-all" style={{ width: `${pct}%` }} /></div>
        <span className="whitespace-nowrap font-semibold">{run.done ? "완료" : `${run.stepIdx + 1}/${m.steps.length}`}</span>
        <span className="whitespace-nowrap text-slate-500">오류 {run.errors.length}</span>
        {run.lastErr && <span role="alert" className="max-w-[40%] truncate font-semibold text-rose-700" title={run.lastErr}>⚠ {run.lastErr}</span>}
      </div>
    </div>
  );
}

export function App() {
  const { user, logout, toast, resetHotel, hydrated } = useStore();
  const { panel, setPanel, center, setCenter } = useUI();
  const [ready, setReady] = useState(false);
  useEffect(() => { Promise.resolve(useStore.persist.rehydrate()).then(() => { useStore.setState({ hydrated: true }); setReady(true); }); }, []);
  if (!ready || !hydrated) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">불러오는 중…</div>;
  if (!user) return <Landing />;
  const done = false;
  void done;
  return (
    <div className="min-h-screen pb-14">
      <Tour />
      <header className="sticky top-0 z-40 bg-navy text-white shadow">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-2">
          <div><div className="text-[9px] font-bold tracking-[0.3em] text-gold">GRAND ACADEMY HOTEL</div><div className="text-sm font-extrabold leading-none">OPERA PMS TRAINING ACADEMY</div></div>
          <nav className="ml-2 hidden gap-1 md:flex" aria-label="main tabs">{TABS.filter(([k]) => k !== "admin" || user.role === "admin").map(([k, l]) => <button key={k} onClick={() => { setCenter(k); setPanel("sim"); }} className={clsx("rounded-md px-3 py-1.5 text-xs font-semibold", center === k ? "bg-gold text-navy" : "bg-white/10 hover:bg-white/20")}>{l}</button>)}</nav>
          <div className="ml-auto flex items-center gap-2 text-xs"><span className="hidden sm:inline opacity-80">{user.name} · {user.role === "admin" ? "관리자" : "학습자"}</span>
            <button onClick={() => { if (confirm("호텔 실습 데이터를 초기 상태로 되돌릴까요? (학습 기록은 유지)")) { resetHotel(); } }} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">데이터 초기화</button>
            <button onClick={logout} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">로그아웃</button></div>
        </div>
        {/* mobile / tablet tab strip */}
        <div className="flex gap-1 overflow-x-auto bg-navy-700 px-3 py-1 md:hidden">
          {([["learn", "📚 학습"], ["sim", "🖥 화면"], ["tutor", "🎓 튜터"]] as const).map(([k, l]) => <button key={k} onClick={() => setPanel(k)} className={clsx("whitespace-nowrap rounded px-3 py-1 text-xs font-semibold", panel === k ? "bg-gold text-navy" : "text-white/80")}>{l}</button>)}
          <span className="mx-1 w-px bg-white/20" />
          {TABS.filter(([k]) => k !== "admin" || user.role === "admin").map(([k, l]) => <button key={k} onClick={() => { setCenter(k); setPanel("sim"); }} className={clsx("whitespace-nowrap rounded px-3 py-1 text-xs", center === k && panel === "sim" ? "bg-white/25 font-bold text-white" : "text-white/70")}>{l.replace("OPERA ", "")}</button>)}
        </div>
        <div className="hidden bg-navy-700 px-4 py-1 md:flex lg:hidden">
          {([["sim", "🎓 튜터"], ["learn", "📚 커리큘럼"]] as const).map(([k, l]) => <button key={k} onClick={() => setPanel(k === "sim" ? "tutor" : "learn")} className={clsx("mr-1 rounded px-3 py-1 text-xs font-semibold", (k === "sim" ? panel !== "learn" : panel === "learn") ? "bg-gold text-navy" : "text-white/80")}>{l}</button>)}
        </div>
      </header>
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 p-3 md:grid-cols-[1fr_340px] lg:grid-cols-[250px_minmax(0,1fr)_340px]">
        <div className={clsx(panel === "learn" ? "block" : "hidden", "lg:block md:col-start-2 md:row-start-1 lg:col-start-1")}><div className="lg:sticky lg:top-16 lg:max-h-[calc(100vh-7rem)] lg:overflow-auto"><Learn /></div></div>
        <div className={clsx(panel === "sim" ? "block" : "hidden", "md:col-start-1 md:row-start-1 md:block lg:col-start-2")}>
          {center === "sim" && <Opera />}
          {center === "3d" && <Hotel3D />}
          {center === "score" && <Score />}
          {center === "admin" && <Admin />}
        </div>
        <div className={clsx(panel === "tutor" ? "block" : "hidden", panel === "learn" ? "md:hidden" : "md:block", "lg:block md:col-start-2 md:row-start-1 lg:col-start-3")}><div className="lg:sticky lg:top-16 lg:h-[calc(100vh-7rem)]"><Tutor /></div></div>
      </div>
      <BottomBar />
      <Toast toast={toast} />
    </div>
  );
}
