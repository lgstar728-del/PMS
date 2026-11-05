import { MISSIONS } from "./missions";
import type { Attempt } from "./types";

/** 관리자 화면 시연용 가상 신입사원 학습 기록 (실제 사용자 데이터가 아님) */
const TRAINEES = [
  { name: "가상 김하늘", skill: 0.9, upto: 10 }, { name: "가상 이도영", skill: 0.75, upto: 8 }, { name: "가상 박소율", skill: 0.6, upto: 6 },
  { name: "가상 정우진", skill: 0.8, upto: 9 }, { name: "가상 최아린", skill: 0.5, upto: 4 }, { name: "가상 한지민", skill: 0.7, upto: 10 },
];
const CODES: [string, string, string][] = [["ci.assign.dirty", "op", "Dirty 객실 배정 시도"], ["res.rate", "proc", "요금 코드 선택 오류"], ["co.balance", "proc", "미결제 상태 체크아웃"], ["pay.declined", "recover", "카드 승인 거절 대응"], ["au.order", "proc", "나이트 오딧 순서 위반"], ["res.dates", "op", "예약 날짜 입력 오류"]];

export function demoAttempts(): Attempt[] {
  const out: Attempt[] = [];
  let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  TRAINEES.forEach((t) => {
    MISSIONS.slice(0, t.upto).forEach((m, i) => {
      const nErr = Math.floor((1 - t.skill) * 6 * rnd() + (rnd() > t.skill ? 1 : 0));
      const errors = Array.from({ length: nErr }, () => { const c = CODES[Math.floor(rnd() * CODES.length)]; return { code: c[0], cat: c[1], msg: c[2] }; });
      const proc = errors.filter((e) => e.cat === "proc").length, op = errors.filter((e) => e.cat === "op").length;
      const procedure = Math.max(0, 40 - 8 * proc), operation = Math.max(0, 30 - 5 * op);
      const time = Math.round(15 * (0.55 + 0.45 * t.skill * rnd() + 0.1)), recovery = Math.max(0, 15 - Math.round((1 - t.skill) * 8 * rnd()));
      out.push({ id: `demo-${t.name}-${m.id}`, user: t.name, missionId: m.id, at: Date.now() - (30 - i) * 86400000 / 3, seconds: Math.round(m.targetSec * (0.7 + (1 - t.skill) * rnd() * 1.5)), errors, hintsUsed: Math.round((1 - t.skill) * 4 * rnd()), stepCount: m.steps.length, demo: true, score: { procedure, operation, time: Math.min(15, time), recovery, total: procedure + operation + Math.min(15, time) + recovery } });
    });
  });
  return out;
}
