/** API 키가 없을 때 동작하는 규칙 기반 교육 도우미.
 *  확인되지 않은 OPERA 조작법은 만들어내지 않고, 시뮬레이터(교육용 재구성 화면)에 구현된 범위만 안내한다. */
export interface TutorCtx { screen: string; mode: "cloud" | "opera5"; step?: { title: string; instruction: string }; mission?: string }

const MENU = (mode: "cloud" | "opera5") => ({
  newres: mode === "cloud" ? "Bookings ▸ New Reservation" : "Reservations ▸ New Reservation",
  lookup: mode === "cloud" ? "Bookings ▸ Reservations" : "Reservations ▸ Reservation Look Up",
  profiles: mode === "cloud" ? "Bookings ▸ Profiles" : "Profiles ▸ Profile Search",
  arrivals: "Front Desk ▸ Arrivals", inhouse: "Front Desk ▸ In House", departures: "Front Desk ▸ Departures",
  rooms: mode === "cloud" ? "Rooms Management ▸ Room Rack" : "Rooms Mgmt ▸ Room Plan",
  billing: mode === "cloud" ? "Cashiering ▸ Billing" : "Cashiering ▸ Billing",
  audit: mode === "cloud" ? "End of Day ▸ Night Audit" : "Night Audit",
});

const NOTE = "\n\n※ 이 안내는 ‘교육용으로 재구성한 모의 화면’ 기준입니다. 실제 OPERA 메뉴명·위치는 제품 버전과 호텔 설정에 따라 다를 수 있으니 공식 교육자료로 확인하세요.";

export function ruleAnswer(q: string, c: TutorCtx): string {
  const m = MENU(c.mode); const t = q.toLowerCase().replace(/\s/g, "");
  const has = (...k: string[]) => k.some((x) => t.includes(x.toLowerCase().replace(/\s/g, "")));
  const stepLine = c.step ? `\n\n지금 단계: “${c.step.title}” — ${c.step.instruction}` : "";
  if (has("신규예약", "예약등록", "예약은어디", "예약만들")) return `신규 예약은 ${m.newres} 에서 등록합니다. ① 고객 프로필 검색 또는 New Profile ② 도착/출발일 ③ Room Type·인원 ④ Rate Code(요금 코드를 고르면 요금이 채워집니다) ⑤ 보증(Guarantee) 선택 후 Save. 저장하면 확인번호(Confirmation No.)가 나옵니다.${stepLine}${NOTE}`;
  if (has("dirty") && has("배정", "체크인", "어떻게")) return `Dirty 객실은 아직 청소가 끝나지 않은 객실입니다. 이 교육 호텔 정책에서는 Dirty 객실에 체크인 배정을 하면 경고와 함께 거부됩니다. 하우스키핑이 Clean(또는 Inspected)으로 바꾼 객실을 선택하거나, ${m.rooms} 에서 상태를 확인하세요. (실제 호텔에서는 설정/권한에 따라 허용 여부가 다를 수 있습니다.)${stepLine}${NOTE}`;
  if (has("객실배정", "룸배정", "체크인")) return `체크인은 ${m.arrivals} 에서 시작합니다. 순서: 예약 선택 → 신원 확인 → 객실 배정(Vacant + Clean/Inspected, 예약한 객실 유형) → 결제 보증 확인 → Complete Check-in. 객실 색상: 초록=Clean, 파랑=Inspected, 주황=Dirty, 빨강=투숙중, 회색=OOO.${stepLine}${NOTE}`;
  if (has("folio", "폴리오", "청구", "요금확인")) return `Folio(투숙객 계정)는 ${m.billing} 에서 투숙 중인 고객을 선택해 확인합니다. 객실료/부대요금(Charge)과 결제(Payment), 잔액(Balance)이 표시됩니다. 부대요금은 Transaction Code(예: RST 레스토랑)와 금액으로 Post합니다.${stepLine}${NOTE}`;
  if (has("체크아웃취소", "체크아웃을취소", "undocheck", "reinstate")) return `체크아웃 취소(재입실)는 OPERA 제품·버전·사용자 권한·호텔 설정에 따라 방식이 달라서, 이 시뮬레이터에는 구현하지 않았고 확인되지 않은 조작법을 안내드릴 수 없습니다. 실제 업무에서는 슈퍼바이저와 공식 매뉴얼의 절차를 확인하세요.${NOTE}`;
  if (has("체크아웃", "check-out", "checkout")) return `체크아웃은 ${m.departures} 에서 고객의 Folio를 열고 ① 청구내역 검토 ② 잔액 결제(Balance 0) ③ 영수증 ④ Check Out 순서로 진행합니다. 잔액이 남아 있으면 체크아웃이 거부됩니다. 완료되면 객실은 Dirty가 되어 하우스키핑에 연계됩니다.${stepLine}${NOTE}`;
  if (has("결제거절", "거절", "declined", "승인")) return `카드 승인이 거절되면 ① 고객에게 안내 ② 같은 카드 재시도 ③ 다른 카드/현금 등 다른 결제수단 요청 순으로 대응합니다. 교육 시뮬레이터에서는 한 번 거절된 뒤 재시도하거나 Cash로 바꿔 보세요.${stepLine}`;
  if (has("환불", "조정", "adjust")) return `요금 조정(Adjustment)과 환불은 일반 프런트 직원에게 허용되지 않고 Supervisor 권한이 필요하도록 시뮬레이션되어 있습니다. 권한이 필요한 작업은 슈퍼바이저에게 요청하세요.`;
  if (has("ooo", "outoforder")) return `Out of Order(OOO)는 수리 등으로 판매할 수 없는 객실입니다. ${m.rooms} 에서 객실을 클릭해 사유와 함께 등록/해제합니다. 투숙 중인 객실은 OOO로 등록할 수 없으므로 먼저 Room Move로 고객을 이동하세요.${NOTE}`;
  if (has("adr", "revpar", "점유율", "occupancy")) return `Occupancy = 판매객실 ÷ 판매가능객실(OOO 제외). ADR = 객실매출 ÷ 판매객실. RevPAR = 객실매출 ÷ 판매가능객실 (= ADR × 점유율). ${m.audit} 와 Reports 에서 현재 시뮬레이션 값을 확인할 수 있습니다.`;
  if (has("night", "나이트", "마감")) return `일일 마감(${m.audit})은 ① No-Show 처리 ② 출발 미처리 확인 ③ 객실료 Post ④ 보고서 ⑤ 영업일 전환 순서로 연습합니다. 이 시뮬레이터에서는 실제 마감을 실행하지 않습니다.${stepLine}`;
  if (has("프로필", "고객검색", "profile")) return `고객 프로필은 ${m.profiles} 에서 검색/생성합니다. 이름·전화번호가 같은 프로필은 중복으로 막힙니다. 선호사항·VIP·요청사항을 기록해 두면 체크인 때 확인할 수 있습니다.${NOTE}`;
  if (has("cloud", "opera5", "차이", "버전")) return `이 앱은 OPERA Cloud(웹형 상단 메뉴)와 OPERA 5(클래식 메뉴) 두 교육 모드를 제공하며 메뉴 묶음과 화면 스타일만 다르게 재구성했습니다. 두 제품의 실제 화면은 공식 자료로 검증하지 못했으므로 모두 ‘교육용 모의 화면’입니다.`;
  if (has("힌트", "모르겠", "막혔", "도와")) return c.step ? `현재 단계는 “${c.step.title}”입니다. 금색으로 깜빡이는 곳을 확인하고, 지시문을 다시 읽어 보세요: ${c.step.instruction}\n정답을 바로 알려드리지는 않지만, 오류가 나면 이유와 단서를 드릴게요.` : "실습을 시작하면 단계별로 도와드릴게요. 왼쪽에서 미션을 선택하세요.";
  return `질문을 이해하지 못했어요. 예: “신규 예약은 어디에서 하나요?”, “Dirty 객실을 배정하면?”, “Folio는 어디서 확인하나요?”.${c.step ? `\n\n지금 단계: ${c.step.title}` : ""}\n공식 매뉴얼에 없는 기능은 만들어서 안내하지 않습니다.`;
}
