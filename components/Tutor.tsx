"use client";
import clsx from "clsx";
import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { missionById } from "@/lib/missions";
import { ruleAnswer } from "@/lib/tutor";
import { Btn, Input } from "./ui";

interface Msg { who: "ai" | "me"; text: string }
let llmDown = false;

export function Tutor() {
  const { run, screen, mode, requestHint, quitMission } = useStore();
  const [msgs, setMsgs] = useState<Msg[]>([{ who: "ai", text: "안녕하세요! 저는 AI 실무 강사입니다. 막히는 부분이나 OPERA 메뉴 위치를 물어보세요. (정답을 바로 알려주기보다 힌트를 드려요.)" }]);
  const [q, setQ] = useState(""); const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const m = run ? missionById(run.missionId) : null;
  const step = m && !run!.done ? m.steps[run!.stepIdx] : null;

  const ask = async (text: string) => {
    if (!text.trim()) return;
    setMsgs((x) => [...x, { who: "me", text }]); setQ(""); setBusy(true);
    const ctx = { screen, mode, mission: m?.title, step: step ? { title: step.title, instruction: step.instruction } : undefined };
    let answer = "";
    if (!llmDown) {
      try { const r = await fetch("/api/tutor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: text, context: ctx }) }); const j = await r.json(); if (j.answer) answer = j.answer; else llmDown = true; } catch { llmDown = true; }
    }
    if (!answer) answer = ruleAnswer(text, ctx);
    setMsgs((x) => [...x, { who: "ai", text: answer }]); setBusy(false);
    setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <aside className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="rounded-t-xl bg-navy px-4 py-2.5 text-white"><b className="text-sm">🎓 AI 실무 강사</b><span className="ml-2 text-[11px] opacity-70">{llmDown ? "규칙 기반 모드" : "LLM 연결 시 자동 사용"}</span></div>
      <div className="space-y-3 border-b p-3">
        {m && run ? (
          <>
            <div className="flex items-start justify-between gap-2"><div><div className="text-[11px] font-bold text-gold">{m.module}</div><div className="text-sm font-bold">{m.title}</div></div><button onClick={quitMission} className="text-[11px] text-slate-500 underline">종료</button></div>
            {run.done ? (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">🎉 실습 완료! 점수 <b>{run.result!.score.total}</b>/100 — 왼쪽 ‘평가’ 탭에서 상세 결과를 확인하세요.</div>
            ) : step && (
              <div className="rounded-lg border-2 border-gold bg-gold/10 p-3">
                <div className="text-[11px] font-bold text-gold">STEP {run.stepIdx + 1} / {m.steps.length}</div>
                <div className="text-sm font-bold">{step.title}</div>
                <p className="mt-1 text-sm leading-relaxed">{step.instruction}</p>
              </div>
            )}
            {run.lastErr && <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs text-rose-800">⚠ {run.lastErr}</div>}
            {run.lastHint && <div className="rounded-lg border border-sky-300 bg-sky-50 p-2 text-xs text-sky-900">💡 힌트: {run.lastHint}</div>}
            {!run.done && <Btn variant="ghost" className="w-full" onClick={requestHint}>💡 힌트 보기 (점수 소폭 감점)</Btn>}
          </>
        ) : <p className="text-sm text-slate-600">왼쪽에서 미션을 선택하면 단계별 안내가 여기에 표시됩니다. 지금은 자유 연습 중입니다.</p>}
      </div>
      <div className="min-h-40 flex-1 space-y-2 overflow-auto p-3">
        {msgs.map((x, i) => <div key={i} className={clsx("max-w-[92%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm", x.who === "ai" ? "bg-mist" : "ml-auto bg-navy text-white")}>{x.text}</div>)}
        {busy && <div className="text-xs text-slate-400">답변 작성 중…</div>}
        <div ref={end} />
      </div>
      <div className="flex flex-wrap gap-1 px-3 pb-1">{["신규 예약은 어디에서 등록하나요?", "Dirty 객실을 배정하면?", "Folio는 어디서 확인하나요?"].map((x) => <button key={x} onClick={() => ask(x)} className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] hover:border-gold">{x}</button>)}</div>
      <form className="flex gap-2 p-3" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <Input aria-label="tutor question" placeholder="질문을 입력하세요" value={q} onChange={(e) => setQ(e.target.value)} /><Btn type="submit" variant="gold">전송</Btn>
      </form>
    </aside>
  );
}
