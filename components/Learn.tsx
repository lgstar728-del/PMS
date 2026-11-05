"use client";
import clsx from "clsx";
import { useStore } from "@/lib/store";
import { LEVELS, MISSIONS } from "@/lib/missions";
import { useUI } from "./ui-store";

/** 사용자의 미션별 최고 점수 (없으면 undefined) */
export function bestScores(attempts: { user: string; missionId: string; score: { total: number } }[], user?: string) {
  const b: Record<string, number> = {};
  attempts.filter((a) => a.user === user).forEach((a) => { b[a.missionId] = Math.max(b[a.missionId] ?? 0, a.score.total); });
  return b;
}

export function Learn() {
  const { attempts, user, startMission, run } = useStore();
  const setPanel = useUI((u) => u.setPanel); const show = useUI((u) => u.show);
  const best = bestScores(attempts, user?.name);
  const isAdmin = user?.role === "admin";
  const levelDone = (n: number) => MISSIONS.filter((m) => m.level === n).every((m) => best[m.id] !== undefined);
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div><h2 className="text-sm font-bold text-navy">📚 실습 커리큘럼</h2><p className="text-[11px] text-slate-500">레벨을 완료하면 다음 레벨이 열립니다.{isAdmin && " (관리자: 전체 열림)"}</p></div>
      {LEVELS.map((lv) => {
        const locked = !isAdmin && lv.n > 1 && !levelDone(lv.n - 1);
        return (
          <section key={lv.n} className={clsx("rounded-lg border p-2", locked ? "border-slate-200 bg-slate-50 opacity-60" : "border-gold/40")}>
            <div className="flex items-center justify-between"><b className="text-xs">LEVEL {lv.n} · {lv.name}</b><span className="text-[10px] text-slate-500">{locked ? "🔒 잠김" : levelDone(lv.n) ? "✅ 완료" : lv.desc}</span></div>
            <ul className="mt-1.5 space-y-1">
              {MISSIONS.filter((m) => m.level === lv.n).map((m) => {
                const active = run?.missionId === m.id && !run.done;
                return (
                  <li key={m.id}>
                    <button disabled={locked} onClick={() => { startMission(m.id); show("sim"); setPanel("sim"); }}
                      className={clsx("w-full rounded-md px-2 py-1.5 text-left text-xs transition", active ? "bg-gold text-navy" : "bg-mist hover:bg-gold/20", locked && "cursor-not-allowed")}>
                      <div className="font-semibold">{m.title}</div>
                      <div className="flex justify-between text-[10px] text-slate-500"><span>{m.module.split("·")[0]} · {m.steps.length}단계</span><span>{best[m.id] !== undefined ? `최고 ${best[m.id]}점` : "미완료"}</span></div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
