import type { Ev, Mission, Step, StepResult } from "./types";

const err = (code: string, cat: "proc" | "op" | "recover", msg: string, hints: string[], soft = false): StepResult => ({ code, cat, err: msg, hints, soft });
const grp = (s: string) => [`grp-${s}`, `item-${s}`];
const navTo = (screen: string, label: string): Step["check"] => (e) =>
  e.t !== "nav" ? "ignore" : e.screen === screen ? "ok" : err("nav.wrong", "proc", `지금은 ‘${label}’ 화면을 열어야 합니다.`, [`상단 메뉴에서 ${label} 항목을 찾아보세요.`, `메뉴 그룹을 먼저 연 뒤 ${label}을(를) 선택합니다 (금색으로 깜빡이는 곳).`], true);

export const LEVELS = [
  { n: 1, name: "기초", desc: "로그인·메뉴 탐색·조회" },
  { n: 2, name: "예약 업무", desc: "예약 생성·수정·취소·프로필" },
  { n: 3, name: "프런트 업무", desc: "체크인·객실 관리·체크아웃" },
  { n: 4, name: "요금 및 결제", desc: "Folio·부대요금·결제" },
  { n: 5, name: "종합 실무", desc: "전 과정·오류 대응·나이트 오딧" },
];

const isHong = (s: Parameters<Step["check"]>[1], resId: string) => {
  const r = s.reservations.find((x) => x.id === resId);
  return !!r && s.guests.find((g) => g.id === r.guestId)?.name === "홍길동";
};

/** 홍길동 시나리오 예약값 검증 (모듈 2 / 종합 실무 공용) */
const hongSave: Step["check"] = (e) => {
  if (e.t !== "res.save") return "ignore";
  if (!e.ok) return err("res.invalid", "op", "예약 입력 검증에서 오류가 있어 저장되지 않았습니다.", ["화면 상단의 빨간 오류 목록을 읽고 해당 항목을 수정하세요.", "오류 문구가 가리키는 필드를 다시 확인하세요."]);
  const d = e.draft;
  if (d.guestName !== "홍길동") return err("res.name", "proc", "시나리오 고객은 ‘홍길동’입니다.", ["Guest 항목의 고객 이름을 확인하세요.", "홍길동 프로필을 새로 만들어 연결해야 합니다."]);
  if (d.arrival !== "2026-12-10" || d.departure !== "2026-12-12") return err("res.dates", "op", "체크인/체크아웃 날짜가 시나리오와 다릅니다.", ["날짜를 다시 읽어보세요. 2박 숙박입니다.", "체크인은 12월 10일, 체크아웃은 12월 12일입니다."]);
  if (d.roomType !== "Deluxe") return err("res.type", "op", "객실 유형이 시나리오와 다릅니다.", ["고객이 요청한 객실 등급을 다시 확인하세요.", "Deluxe 객실로 예약합니다."]);
  if (d.adults !== 2) return err("res.adults", "op", "인원수가 시나리오와 다릅니다.", ["Adults 항목을 확인하세요.", "성인 2명입니다."]);
  if (d.rateCode !== "BAR" || d.rate !== 180000) return err("res.rate", "proc", "요금 코드/요금이 시나리오와 다릅니다 (180,000원/박).", ["Rate Code마다 같은 객실의 요금이 다릅니다. 180,000원이 나오는 코드를 찾으세요.", "Deluxe에서 180,000원이 되는 코드는 BAR입니다. 요금을 손으로 고치지 말고 코드를 선택하세요."]);
  return "ok";
};

const checkHongRoom = (e: Ev, hongOnly = true, s?: Parameters<Step["check"]>[1]) => (hongOnly && s && e.t === "ci.assign" ? isHong(s, e.resId) : true);

export const MISSIONS: Mission[] = [
  {
    id: "m1", level: 1, module: "MODULE 01 · OPERA 기초", title: "로그인과 메뉴 탐색", desc: "교육용 계정으로 로그인하고 예약·프로필·객실 현황을 열어 봅니다.", targetSec: 150, setup: "logout",
    steps: [
      { id: "s1", title: "OPERA 로그인", instruction: "로그인 화면에서 교육용 계정(TRAINEE01)이 입력되어 있는지 확인하고 [Sign In]을 누르세요.", target: "btn-login", check: (e) => (e.t === "login" ? "ok" : "ignore") },
      { id: "s2", title: "예약 메뉴 찾기", instruction: "상단 메뉴에서 예약 조회(Reservations) 화면을 여세요.", target: grp("reservations"), check: navTo("reservations", "Reservations") },
      { id: "s3", title: "고객 검색 화면", instruction: "고객 프로필 검색(Profiles) 화면을 여세요.", target: grp("profiles"), check: navTo("profiles", "Profiles") },
      { id: "s4", title: "객실 현황 열기", instruction: "Room Rack(객실 현황)을 여세요.", target: grp("rooms"), check: navTo("rooms", "Room Rack") },
      { id: "s5", title: "객실 선택", instruction: "객실 하나를 클릭해 객실 정보 패널이 열리는지 확인하세요.", target: "room-grid", check: (e) => (e.t === "room.select" ? "ok" : "ignore") },
      { id: "s6", title: "메인 화면 복귀", instruction: "Dashboard(메인 화면)로 돌아오세요.", target: grp("dashboard"), check: navTo("dashboard", "Dashboard") },
    ],
  },
  {
    id: "m2", level: 2, module: "MODULE 02 · Reservation", title: "신규 예약: 홍길동(가상)", desc: "프로필을 만들고 Deluxe 2박 예약을 정확히 입력합니다. (12/10~12/12 · 2명 · 180,000원/박)", targetSec: 240, setup: "reset",
    steps: [
      { id: "s1", title: "New Reservation 열기", instruction: "예약 메뉴에서 New Reservation 화면을 여세요.", target: grp("newres"), check: navTo("newres", "New Reservation") },
      { id: "s2", title: "고객 프로필 생성", instruction: "[New Profile]로 홍길동(가상) 프로필을 만들어 예약에 연결하세요. 전화번호는 가상 번호를 입력합니다.", target: "res-newprofile", gate: true,
        check: (e) => e.t !== "profile.save" ? "ignore" : !e.ok ? err("pf.invalid", "op", "프로필 입력 오류로 저장되지 않았습니다.", ["이름과 전화번호는 필수입니다."]) : e.guest.name !== "홍길동" ? err("pf.name", "proc", "이 시나리오의 고객은 ‘홍길동’입니다.", ["고객 이름을 다시 확인하세요."]) : "ok" },
      { id: "s3", title: "예약 입력 후 저장", instruction: "체크인 12/10, 체크아웃 12/12, Deluxe, 성인 2명, 180,000원/박이 되도록 입력하고 보증 방법을 고른 뒤 [Save]를 누르세요.", target: ["res-ratecode", "res-save"], gate: true, check: hongSave },
      { id: "s4", title: "예약번호 확인", instruction: "저장 완료 창의 예약번호(Confirmation No.)를 확인하고 [예약 열기]를 눌러 예약 상세를 여세요.", target: "res-conf-open", check: (e, s) => (e.t === "res.open" && isHong(s, e.id) ? "ok" : "ignore") },
    ],
  },
  {
    id: "m3", level: 2, module: "MODULE 03 · Guest Profile", title: "고객 프로필 관리", desc: "기존 고객 검색·요청사항 기록·VIP 프로필 신규 생성.", targetSec: 210, setup: "reset",
    steps: [
      { id: "s1", title: "Profiles 열기", instruction: "Profiles 화면을 여세요.", target: grp("profiles"), check: navTo("profiles", "Profiles") },
      { id: "s2", title: "기존 고객 검색", instruction: "검색창에 ‘최도현’ 또는 ‘최’를 입력해 기존 고객을 찾으세요.", target: "pf-search", check: (e) => (e.t === "search" && e.kind === "guest" && e.q.includes("최") ? "ok" : "ignore") },
      { id: "s3", title: "요청사항 기록", instruction: "최도현 고객을 열고 요청사항(Requests)에 ‘Late check-out 요청’ 등 메모를 저장하세요.", target: "pf-requests", check: (e) => (e.t === "profile.update" ? (e.requests.trim().length >= 3 ? "ok" : err("pf.req", "op", "요청사항이 비어 있습니다.", ["요청 내용을 한 줄 이상 적어 주세요."])) : "ignore") },
      { id: "s4", title: "VIP 프로필 생성", instruction: "[New Profile]로 ‘박서연’(가상) 프로필을 만들고 VIP 레벨 1 이상, 선호사항 1개 이상을 선택해 저장하세요.", target: "pf-new", gate: true,
        check: (e) => { if (e.t !== "profile.save") return "ignore"; if (!e.ok) return err("pf.invalid", "op", "프로필 저장 실패: 필수 항목이나 중복 여부를 확인하세요.", ["이름과 전화번호는 필수이며, 같은 이름·전화번호는 중복 프로필로 막힙니다."]);
          if (e.guest.name !== "박서연") return err("pf.name", "proc", "생성할 고객은 ‘박서연’입니다.", ["이름을 다시 확인하세요."]);
          if (e.guest.vip < 1) return err("pf.vip", "op", "VIP 레벨이 0입니다.", ["VIP Level을 1 이상으로 설정하세요."]);
          if (e.guest.prefs.length < 1) return err("pf.pref", "op", "선호사항이 선택되지 않았습니다.", ["Preferences에서 하나 이상 선택하세요."]);
          return "ok"; } },
    ],
  },
  {
    id: "m4", level: 2, module: "MODULE 02 · Reservation", title: "예약 조회·수정·취소", desc: "한도윤 예약을 1박 연장하고, 서하은 예약을 사유와 함께 취소합니다.", targetSec: 210, setup: "reset",
    steps: [
      { id: "s1", title: "예약 조회 화면", instruction: "Reservations(예약 조회) 화면을 여세요.", target: grp("reservations"), check: navTo("reservations", "Reservations") },
      { id: "s2", title: "예약 검색", instruction: "검색창에 고객명 ‘한도윤’을 검색하세요.", target: "rs-search", check: (e) => (e.t === "search" && e.kind === "res" && e.q.includes("한도윤") ? "ok" : "ignore") },
      { id: "s3", title: "숙박일 연장", instruction: "한도윤 예약(R-1004)의 체크아웃을 하루 늘려 2박으로 수정하고 저장하세요.", target: "rs-modify",
        check: (e) => e.t !== "res.modify" ? "ignore" : e.id !== "R-1004" ? err("rm.wrong", "proc", "수정 대상은 한도윤(R-1004) 예약입니다.", ["고객명을 다시 확인하세요."]) : e.nightsAfter !== 2 ? err("rm.nights", "op", "수정 결과가 2박이 아닙니다.", ["체크아웃 날짜를 하루만 늘리세요."]) : "ok" },
      { id: "s4", title: "예약 취소", instruction: "서하은 예약(R-1005)을 취소하세요. 취소 사유(Cancel Reason)는 필수입니다.", target: "rs-cancel",
        check: (e) => e.t !== "res.cancel" ? "ignore" : e.id !== "R-1005" ? err("cx.wrong", "proc", "취소 대상은 서하은(R-1005) 예약입니다.", ["취소 전에 고객명을 다시 확인하세요. 잘못 취소하면 복구가 번거롭습니다."]) : "ok" },
    ],
  },
  {
    id: "m5", level: 3, module: "MODULE 04 · Check-in", title: "체크인: 이지우 고객", desc: "도착 예약 확인 → 신원 확인 → 객실 배정 → 보증 확인 → 체크인 완료. 함정: Dirty 객실.", targetSec: 270, trap: "Dirty·OOO 객실 배정 시도", setup: "reset",
    steps: [
      { id: "s1", title: "Arrivals 열기", instruction: "오늘 도착 예정 목록(Arrivals)을 여세요.", target: grp("arrivals"), check: navTo("arrivals", "Arrivals") },
      { id: "s2", title: "예약 선택", instruction: "이지우(R-1001) 예약의 [Check In]을 누르세요.", target: "ar-checkin-R-1001", check: (e) => (e.t === "ci.select" ? (e.resId === "R-1001" ? "ok" : err("ci.wrongguest", "proc", "다른 고객의 예약을 선택했습니다.", ["도착 목록에서 고객 이름을 다시 확인하세요."])) : "ignore") },
      { id: "s3", title: "신원 확인", instruction: "여권/신분증을 확인했다면 ID 확인 체크박스를 선택하세요.", target: "ci-id", check: (e) => (e.t === "ci.id" ? "ok" : e.t === "ci.assign" ? err("ci.order", "proc", "신원 확인 전에 객실을 배정했습니다. 절차 순서를 지키세요.", ["체크인 절차는 신원 확인이 먼저입니다."]) : "ignore") },
      { id: "s4", title: "객실 배정", instruction: "Deluxe 객실 중 투숙 가능한 객실을 선택해 배정하세요. (객실 상태를 꼭 확인!)", target: "ci-room",
        check: (e) => { if (e.t !== "ci.assign") return "ignore"; if (e.ok) return "ok";
          const h: Record<string, string[]> = {
            dirty: ["객실 상태 색상/라벨을 살펴보세요. 방금 배정한 객실은 아직 청소되지 않았습니다.", "Vacant Dirty 객실은 배정 불가입니다. Clean 또는 Inspected 객실을 고르세요."],
            ooo: ["회색(사용불가) 객실은 판매할 수 없습니다.", "Out of Order 객실은 건너뛰고 다른 객실을 선택하세요."],
            occupied: ["빨간색 객실은 이미 투숙 중입니다.", "Vacant 상태인 객실만 배정 가능합니다."],
            type: ["예약 시 구매한 객실 유형을 확인하세요.", "Deluxe 유형의 객실만 선택할 수 있습니다."], none: ["객실번호를 확인하세요."] };
          return err(`ci.assign.${e.reason}`, "op", "객실 배정이 거부되었습니다.", h[e.reason ?? "none"]); } },
      { id: "s5", title: "결제 보증 확인", instruction: "이 예약은 보증(Guarantee)이 없습니다. 교육용 카드(****4242)를 보증으로 등록하세요.", target: "ci-guarantee", check: (e) => (e.t === "ci.guarantee" ? "ok" : "ignore") },
      { id: "s6", title: "체크인 완료", instruction: "모든 항목이 완료되면 [Complete Check-in]을 누르세요.", target: "ci-complete",
        check: (e) => e.t === "ci.blocked" ? err("ci.incomplete", "proc", `체크인 필수 항목 누락: ${e.missing.join(", ")}`, ["빨간 경고에 표시된 항목을 먼저 처리하세요."]) : e.t === "ci.complete" ? "ok" : "ignore" },
    ],
  },
  {
    id: "m6", level: 3, module: "MODULE 05 · Room Management", title: "객실 현황 관리", desc: "Dirty 객실 정리, OOO 등록/해제, 객실 이동까지 업무 규칙 검증을 체험합니다.", targetSec: 300, trap: "투숙 중 객실 OOO 시도", setup: "reset",
    steps: [
      { id: "s1", title: "Room Rack 열기", instruction: "Room Rack을 여세요.", target: grp("rooms"), check: navTo("rooms", "Room Rack") },
      { id: "s2", title: "Dirty 객실 확인", instruction: "주황색(Dirty) 객실 1203을 클릭해 정보를 확인하세요.", target: "room-1203", check: (e) => (e.t === "room.select" ? (e.no === "1203" ? "ok" : err("rm.pick", "proc", "1203 객실을 선택하세요.", ["12층에서 주황색 객실을 찾으세요."], true)) : "ignore") },
      { id: "s3", title: "청소 완료 처리", instruction: "하우스키핑 상태를 Clean으로 변경하세요.", target: "rm-hk-clean", check: (e) => (e.t === "room.hk" && e.no === "1203" && e.to !== "Dirty" ? "ok" : "ignore") },
      { id: "s4", title: "OOO 해제", instruction: "1204(Out of Order, 에어컨 수리) 객실의 수리가 끝났다고 가정하고 OOO를 해제하세요.", target: "rm-ooo", check: (e) => (e.t === "room.ooo" ? (e.no === "1204" && !e.on && e.ok ? "ok" : e.no === "1204" ? "ignore" : err("rm.pick", "proc", "1204 객실을 선택해야 합니다.", ["회색 객실을 찾으세요."], true)) : "ignore") },
      { id: "s5", title: "규칙 검증 체험", instruction: "투숙 중인 1202 객실을 OOO로 등록해 보세요. 시스템이 막는 이유를 읽어 보세요.", target: "rm-ooo", check: (e) => (e.t === "room.ooo" && e.no === "1202" && e.on ? (e.ok ? err("rm.bad", "op", "투숙 중 객실을 OOO 처리하면 안 됩니다.", ["투숙 객실은 먼저 이동시켜야 합니다."]) : "ok") : "ignore") },
      { id: "s6", title: "객실 이동", instruction: "1202 투숙객(윤서준)을 Clean/Inspected 상태의 다른 Deluxe 객실(예: 1205)로 이동시키세요.", target: "rm-move", check: (e) => (e.t === "room.move" ? (e.ok ? "ok" : err("mv.fail", "op", "객실 이동이 거부되었습니다.", ["이동할 객실은 같은 유형이며 비어 있고 청소가 끝난 객실이어야 합니다."])) : "ignore") },
    ],
  },
  {
    id: "m7", level: 3, module: "MODULE 07 · Check-out", title: "체크아웃: 윤서준 고객", desc: "Folio 검토 → 미결제 확인 → 결제 → 영수증 → 체크아웃 → 하우스키핑 연계.", targetSec: 240, trap: "잔액이 있는 상태로 체크아웃", setup: "inhouse-full",
    steps: [
      { id: "s1", title: "Departures 열기", instruction: "오늘 출발 예정(Departures)을 여세요.", target: grp("departures"), check: navTo("departures", "Departures") },
      { id: "s2", title: "Folio 열기", instruction: "윤서준(1202)의 [Folio]를 열어 청구 내역을 검토하세요.", target: "fo-open-R-0950", check: (e) => (e.t === "folio.open" ? (e.resId === "R-0950" ? "ok" : err("fo.wrong", "proc", "다른 고객의 Folio입니다.", ["객실 1202, 윤서준 고객입니다."])) : "ignore") },
      { id: "s3", title: "미결제 정산", instruction: "잔액(Balance) 전액을 가상 결제로 정산하세요. 먼저 체크아웃을 시도하면 어떻게 되는지 보아도 좋습니다.", target: "fo-pay", check: (e) => e.t === "co.blocked" ? err("co.balance", "proc", `미결제 금액 ${e.balance.toLocaleString()}원이 남아 체크아웃할 수 없습니다.`, ["Folio 하단의 Balance를 확인하세요.", "결제(Payment)를 먼저 등록하세요."], true) : e.t === "pay" ? (e.ok && e.balanceAfter === 0 ? "ok" : e.ok ? err("pay.partial", "op", "잔액이 남았습니다.", ["결제 금액이 Balance와 일치하는지 확인하세요."]) : "ignore") : "ignore" },
      { id: "s4", title: "영수증 확인", instruction: "[Receipt]를 눌러 영수증을 확인하세요.", target: "fo-receipt", check: (e) => (e.t === "receipt.view" ? "ok" : "ignore") },
      { id: "s5", title: "체크아웃 처리", instruction: "[Check Out]을 눌러 체크아웃을 완료하세요.", target: "fo-checkout", check: (e) => (e.t === "co.complete" ? "ok" : "ignore") },
      { id: "s6", title: "하우스키핑 연계 확인", instruction: "Room Rack에서 1202가 Dirty로 바뀌어 청소 대기 상태가 되었는지 확인하세요.", target: ["grp-rooms", "room-1202"], check: (e) => (e.t === "room.select" && e.no === "1202" ? "ok" : "ignore") },
    ],
  },
  {
    id: "m8", level: 4, module: "MODULE 06 · Cashiering", title: "Folio와 결제 처리", desc: "객실료 360,000원 + 레스토랑 50,000원 + 기타 20,000원 = 430,000원을 정산합니다.", targetSec: 270, trap: "권한 없는 조정(Adjustment)", setup: "inhouse-partial",
    steps: [
      { id: "s1", title: "Folio 열기", instruction: "Billing에서 윤서준(1202) Folio를 여세요. 객실료만 올라와 있습니다.", target: ["grp-folio", "fo-open-R-0950"], check: (e) => (e.t === "folio.open" ? (e.resId === "R-0950" ? "ok" : err("fo.wrong", "proc", "윤서준(1202)의 Folio를 여세요.", ["재실 고객 목록에서 객실번호를 확인하세요."])) : "ignore") },
      { id: "s2", title: "레스토랑 요금", instruction: "레스토랑 이용료 50,000원을 코드 RST로 등록하세요.", target: "fo-post", gate: true, check: (e) => (e.t !== "folio.post" ? "ignore" : e.code === "RST" && e.amount === 50000 ? "ok" : err("fo.rst", "op", "코드 또는 금액이 다릅니다 (RST · 50,000원).", ["Transaction Code가 매출 부서에 맞는지 확인하세요.", "코드 RST(레스토랑), 금액 50000입니다."])) },
      { id: "s3", title: "기타 요금", instruction: "기타 요금 20,000원을 코드 MSC로 등록하세요.", target: "fo-post", gate: true, check: (e) => (e.t !== "folio.post" ? "ignore" : e.code === "MSC" && e.amount === 20000 ? "ok" : err("fo.msc", "op", "코드 또는 금액이 다릅니다 (MSC · 20,000원).", ["기타(Miscellaneous) 코드를 고르세요.", "코드 MSC, 금액 20000입니다."])) },
      { id: "s4", title: "권한 확인", instruction: "[Adjust] 버튼으로 요금 조정을 시도해 보세요. 프런트 데스크 권한으로 가능한지 확인합니다.", target: "fo-adjust", check: (e) => (e.t === "folio.adjust" ? "ok" : "ignore") },
      { id: "s5", title: "가상 결제", instruction: "총 청구액 430,000원을 신용카드(교육용 ****4242)로 결제하세요.", target: "fo-pay", gate: true, check: (e) => (e.t !== "pay" ? "ignore" : e.method !== "Credit Card" ? err("pay.method", "op", "결제수단이 다릅니다.", ["고객이 카드로 결제합니다."]) : e.amount !== 430000 ? err("pay.amount", "op", "결제 금액이 총 청구액과 다릅니다.", ["Folio의 Balance와 같은 금액이어야 합니다.", "430,000원입니다."]) : "ok") },
      { id: "s6", title: "영수증 확인", instruction: "[Receipt]로 결제 내역을 확인하세요.", target: "fo-receipt", check: (e) => (e.t === "receipt.view" ? "ok" : "ignore") },
    ],
  },
  {
    id: "m9", level: 5, module: "종합 실무", title: "예약부터 체크아웃까지 (홍길동)", desc: "예약 → 체크인 → 객실 배정 → 요청사항 → 요금 → 결제 오류 대응 → 체크아웃. 함정: Dirty 객실, 카드 승인 거절.", targetSec: 720, trap: "Dirty 객실 / 카드 거절", setup: "reset",
    steps: [
      { id: "s1", title: "New Reservation", instruction: "홍길동(가상) 고객의 Deluxe 예약을 새로 만드세요. (12/10~12/12 · 2명 · 180,000원/박 · 프로필 신규)", target: grp("newres"), gate: true, check: (e, s) => (e.t === "res.save" ? hongSave(e, s) : "ignore") },
      { id: "s2", title: "Arrivals 열기", instruction: "오늘 도착 목록에서 방금 만든 홍길동 예약을 찾으세요.", target: grp("arrivals"), check: navTo("arrivals", "Arrivals") },
      { id: "s3", title: "체크인 시작", instruction: "홍길동 예약의 [Check In]을 누르세요.", target: "ar-checkin-hong", check: (e, s) => (e.t === "ci.select" ? (isHong(s, e.resId) ? "ok" : err("ci.wrongguest", "proc", "다른 고객입니다.", ["고객명을 확인하세요."])) : "ignore") },
      { id: "s4", title: "신원 확인", instruction: "신원 확인(ID)을 체크하세요.", target: "ci-id", check: (e) => (e.t === "ci.id" ? "ok" : "ignore") },
      { id: "s5", title: "고객 요청사항", instruction: "고객이 ‘조용한 객실’을 요청했습니다. Special Request에 입력하고 저장하세요.", target: "ci-request", check: (e) => (e.t === "ci.request" ? (e.text.trim().length >= 2 ? "ok" : err("rq.empty", "op", "요청 내용이 비었습니다.", ["요청사항을 입력하세요."])) : "ignore") },
      { id: "s6", title: "객실 배정", instruction: "투숙 가능한 Deluxe 객실을 배정하세요. (1201~1208 구역에 Dirty·OOO 객실이 섞여 있습니다)", target: "ci-room",
        check: (e, s) => { if (e.t !== "ci.assign" || !checkHongRoom(e, true, s)) return "ignore"; if (e.ok) return "ok";
          const m = { dirty: "Dirty 객실은 배정할 수 없습니다.", ooo: "OOO 객실은 배정 불가입니다.", occupied: "이미 투숙 중인 객실입니다.", type: "객실 유형이 다릅니다.", none: "객실 번호 오류" }[e.reason ?? "none"];
          return err(`ci.assign.${e.reason}`, "op", m, ["객실 상태 색상을 보세요.", "Vacant Clean 또는 Inspected인 Deluxe 객실만 가능합니다."]); } },
      { id: "s7", title: "체크인 완료", instruction: "[Complete Check-in]으로 체크인을 완료하세요. 3D 호텔 탭에서 객실이 투숙 상태로 바뀝니다.", target: "ci-complete", check: (e) => (e.t === "ci.blocked" ? err("ci.incomplete", "proc", `필수 항목 누락: ${e.missing.join(", ")}`, ["경고에 표시된 항목을 처리하세요."]) : e.t === "ci.complete" ? "ok" : "ignore") },
      { id: "s8", title: "Folio 열기", instruction: "Billing에서 홍길동 Folio를 여세요. 체크인 시 객실료 360,000원이 올라와 있습니다.", target: "grp-folio", check: (e, s) => (e.t === "folio.open" ? (isHong(s, e.resId) ? "ok" : err("fo.wrong", "proc", "홍길동 Folio를 여세요.", ["객실 번호와 고객명을 확인하세요."])) : "ignore") },
      { id: "s9", title: "부대 요금 등록", instruction: "레스토랑 50,000원(RST)을 등록하세요.", target: "fo-post", gate: true, check: (e) => (e.t === "folio.post" ? (e.code === "RST" && e.amount === 50000 ? "ok" : err("fo.rst", "op", "RST · 50,000원이어야 합니다.", ["코드/금액을 확인하세요."])) : "ignore") },
      { id: "s10", title: "기타 요금 등록", instruction: "기타 요금 20,000원(MSC)을 등록하세요.", target: "fo-post", gate: true, check: (e) => (e.t === "folio.post" ? (e.code === "MSC" && e.amount === 20000 ? "ok" : err("fo.msc", "op", "MSC · 20,000원이어야 합니다.", ["코드/금액을 확인하세요."])) : "ignore") },
      { id: "s11", title: "결제 (오류 대응)", instruction: "430,000원을 신용카드로 결제하세요. 승인 거절이 나오면 원인을 읽고 다른 방법으로 해결하세요.", target: "fo-pay",
        check: (e) => { if (e.t === "pay") { if (e.ok) return e.balanceAfter === 0 ? "ok" : err("pay.partial", "op", "잔액이 남아 있습니다.", ["전액을 결제하세요."]); return err("pay.declined", "recover", "카드 승인이 거절되었습니다 (교육용 시뮬레이션).", ["거절 사유를 읽어 보세요. 카드를 다시 시도하거나 다른 결제수단을 쓸 수 있습니다.", "고객에게 안내한 뒤 현금 또는 다른 카드로 결제해 보세요."]); } return e.t === "co.blocked" ? err("co.balance", "proc", "잔액이 남아 체크아웃할 수 없습니다.", ["먼저 결제를 완료하세요."], true) : "ignore"; } },
      { id: "s12", title: "체크아웃", instruction: "영수증을 확인하고 [Check Out]으로 체크아웃을 완료하세요.", target: "fo-checkout", check: (e, s) => (e.t === "co.complete" && isHong(s, e.resId) ? "ok" : "ignore") },
    ],
  },
  {
    id: "m10", level: 5, module: "MODULE 08 · Night Audit", title: "나이트 오딧 시뮬레이션", desc: "일일 마감 절차를 순서대로 진행하고 ADR·RevPAR 보고서를 확인합니다. (실제 마감은 실행되지 않음)", targetSec: 240, trap: "절차 순서 위반", setup: "reset",
    steps: [
      { id: "s1", title: "Night Audit 열기", instruction: "End of Day / Night Audit 화면을 여세요.", target: grp("audit"), check: navTo("audit", "Night Audit") },
      { id: "s2", title: "No-Show 처리", instruction: "1단계: 도착하지 않은 예약(Arrivals 미체크인)을 처리하세요.", target: "au-noshow", check: (e) => e.t === "audit.step" ? (e.step === "noshow" && e.ok ? "ok" : !e.ok ? err("au.order", "proc", "절차 순서가 맞지 않습니다.", ["각 단계는 위에서부터 차례로 진행합니다."]) : "ignore") : "ignore" },
      { id: "s3", title: "출발 미처리 확인", instruction: "2단계: 체크아웃되지 않은 출발 예정 고객을 확인하세요.", target: "au-departures", check: (e) => e.t === "audit.step" ? (e.step === "departures" && e.ok ? "ok" : !e.ok ? err("au.order", "proc", "절차 순서가 맞지 않습니다.", ["이전 단계를 먼저 완료하세요."]) : "ignore") : "ignore" },
      { id: "s4", title: "객실료 Post", instruction: "3단계: 객실료·세금 자동 Post(시뮬레이션)를 실행하세요.", target: "au-post", check: (e) => e.t === "audit.step" ? (e.step === "post" && e.ok ? "ok" : !e.ok ? err("au.order", "proc", "절차 순서가 맞지 않습니다.", ["이전 단계를 먼저 완료하세요."]) : "ignore") : "ignore" },
      { id: "s5", title: "보고서 생성", instruction: "4단계: 일일 운영보고서를 생성하고 점유율·ADR·RevPAR을 확인하세요.", target: "au-report", check: (e) => e.t === "audit.step" ? (e.step === "report" && e.ok ? "ok" : !e.ok ? err("au.order", "proc", "절차 순서가 맞지 않습니다.", ["이전 단계를 먼저 완료하세요."]) : "ignore") : "ignore" },
      { id: "s6", title: "영업일 전환", instruction: "5단계: 영업일 전환(Rollover)을 시뮬레이션하세요.", target: "au-rollover", check: (e) => e.t === "audit.step" ? (e.step === "rollover" && e.ok ? "ok" : !e.ok ? err("au.order", "proc", "보고서 생성 전에는 전환할 수 없습니다.", ["이전 단계를 먼저 완료하세요."]) : "ignore") : "ignore" },
    ],
  },
];
export const missionById = (id: string) => MISSIONS.find((m) => m.id === id)!;
