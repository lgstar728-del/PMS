import { NextResponse } from "next/server";

/** 선택 연결: ANTHROPIC_API_KEY가 있으면 LLM 튜터, 없으면 { fallback: true } → 클라이언트 규칙 기반 도우미 */
export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ fallback: true });
  const { question, context } = (await req.json()) as { question: string; context: Record<string, unknown> };
  const system = `당신은 5성급 호텔 객실부 교육 책임자이자 OPERA PMS 강사입니다. 한국어로 간결하게(6문장 이내) 답하세요.
규칙: (1) 학습자가 지금 보는 시뮬레이터 화면/미션 단계에 맞춰 설명. (2) 정답(입력값)을 바로 알려주지 말고 힌트를 단계적으로. (3) 공식 매뉴얼로 확인되지 않은 OPERA 메뉴·조작법은 만들어내지 말고 '교육용 재구성 화면 기준'이라고 밝히며 모르면 모른다고 답하세요. (4) 실제 카드번호 등 개인정보는 요구하지 않습니다.
현재 컨텍스트: ${JSON.stringify(context)}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.TUTOR_MODEL || "claude-sonnet-5-5", max_tokens: 600, system, messages: [{ role: "user", content: String(question).slice(0, 1000) }] }),
    });
    if (!r.ok) return NextResponse.json({ fallback: true });
    const j = await r.json();
    const text = j.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "";
    return NextResponse.json({ answer: text });
  } catch {
    return NextResponse.json({ fallback: true });
  }
}
