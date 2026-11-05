import { useStore } from "../lib/store";
import { MISSIONS } from "../lib/missions";
const S = () => useStore.getState();
let fails = 0;
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log("  ✗ FAIL:", m); } else console.log("  ✓", m); };
const step = (id: string) => S().run!.stepIdx;
const hong = () => S().reservations.find((r) => S().guests.find((g) => g.id === r.guestId)?.name === "홍길동");
S().login("tester", "trainee");

console.log("M1"); S().startMission("m1");
S().operaLogin(); S().go("reservations"); S().go("profiles"); S().go("rooms"); S().act({ t: "room.select", no: "1201" }); S().go("dashboard");
ok(S().run!.done, "m1 done " + S().run!.result?.score.total);

console.log("M2"); S().startMission("m2"); S().go("newres");
let p = S().createProfile({ name: "홍길동", phone: "010-1234-5678", email: "", vip: 0, prefs: [] }); ok(p.ok, "profile");
let bad = S().createReservation({ guestId: p.id!, guestName: "홍길동", arrival: "2026-12-10", departure: "2026-12-12", roomType: "Deluxe", adults: 2, rateCode: "RACK", rate: 200000, guarantee: "Credit Card" });
ok(!bad.ok && S().run!.lastHint, "wrong rate gated: " + S().run!.lastHint);
let good = S().createReservation({ guestId: p.id!, guestName: "홍길동", arrival: "2026-12-10", departure: "2026-12-12", roomType: "Deluxe", adults: 2, rateCode: "BAR", rate: 180000, guarantee: "Credit Card" });
ok(good.ok, "res saved " + good.res?.confNo); S().act({ t: "res.open", id: good.res!.id }); ok(S().run!.done, "m2 done score " + S().run!.result?.score.total);

console.log("M3"); S().startMission("m3"); S().go("profiles"); S().act({ t: "search", kind: "guest", q: "최" });
S().updateProfile("g-choi", { requests: "Late check-out 요청" });
ok(!S().createProfile({ name: "박서연", phone: "010-9", email: "", vip: 0, prefs: [] }).ok, "vip0 rejected by mission");
ok(S().createProfile({ name: "박서연", phone: "010-9999-0000", email: "", vip: 2, prefs: ["Quiet room"] }).ok, "vip profile ok");
ok(!S().createProfile({ name: "박서연", phone: "010-9999-0000", email: "", vip: 2, prefs: [] }).ok, "duplicate blocked"); ok(S().run!.done, "m3 done");

console.log("M4"); S().startMission("m4"); S().go("reservations"); S().act({ t: "search", kind: "res", q: "한도윤" });
ok(S().modifyReservation("R-1004", { departure: "2026-12-13" }).ok, "modify"); ok(!S().cancelReservation("R-1005", "").ok, "reason required");
ok(S().cancelReservation("R-1005", "고객 요청").ok, "cancel"); ok(S().run!.done, "m4 done");

console.log("M5"); S().startMission("m5"); S().go("arrivals"); S().act({ t: "ci.select", resId: "R-1001" });
ok(S().completeCheckIn("R-1001", { room: undefined, idVerified: false, guarantee: "None", request: "" }).missing.length === 3, "missing list");
S().act({ t: "ci.id", resId: "R-1001" });
const dirty = S().act({ t: "ci.assign", resId: "R-1001", room: "1203", ok: false, reason: "dirty" }); void dirty; ok(S().run!.lastHint?.includes("청소") || S().run!.lastHint?.includes("상태"), "dirty hint: " + S().run!.lastHint);
S().act({ t: "ci.assign", resId: "R-1001", room: "1201", ok: true }); S().act({ t: "ci.guarantee", resId: "R-1001" });
ok(S().completeCheckIn("R-1001", { room: "1201", idVerified: true, guarantee: "Credit Card", request: "" }).ok, "checkin"); ok(S().run!.done, "m5 done");
ok(S().rooms.find((r) => r.no === "1201")!.fo === "Occupied" && S().anim?.kind === "checkin", "room occupied + anim");

console.log("M6"); S().startMission("m6"); S().go("rooms"); S().act({ t: "room.select", no: "1203" });
ok(S().setHK("1203", "Clean").ok, "hk clean"); ok(S().setOOO("1204", false, "").ok, "ooo off"); ok(!S().setOOO("1202", true, "x").ok, "occupied OOO blocked");
ok(S().moveGuest("R-0950", "1205").ok, "move"); ok(S().rooms.find((r) => r.no === "1202")!.hk === "Dirty", "old room dirty"); ok(S().run!.done, "m6 done");

console.log("M7"); S().startMission("m7"); S().go("departures"); S().act({ t: "folio.open", resId: "R-0950" });
ok(!S().checkOut("R-0950").ok, "blocked w/ balance"); const pr = S().pay("R-0950", "Credit Card", 430000); ok(pr.ok, "paid"); S().act({ t: "receipt.view", resId: "R-0950" });
ok(S().checkOut("R-0950").ok, "checkout"); S().act({ t: "room.select", no: "1202" }); ok(S().run!.done, "m7 done " + S().run!.result?.score.total);

console.log("M8"); S().startMission("m8"); S().act({ t: "folio.open", resId: "R-0950" });
ok(S().folios["R-0950"].length === 2, "only room charges");
ok(!S().postCharge("R-0950", "RST", 40000).ok, "wrong amount gated"); ok(S().postCharge("R-0950", "RST", 50000).ok, "rst"); ok(S().postCharge("R-0950", "MSC", 20000).ok, "msc");
ok(!S().adjust("R-0950").ok, "adjust denied"); ok(S().pay("R-0950", "Credit Card", 430000).ok, "pay"); S().act({ t: "receipt.view", resId: "R-0950" }); ok(S().run!.done, "m8 done");

console.log("M9"); S().startMission("m9"); S().go("newres");
p = S().createProfile({ name: "홍길동", phone: "010-1234-5678", email: "", vip: 0, prefs: [] });
good = S().createReservation({ guestId: p.id!, guestName: "홍길동", arrival: "2026-12-10", departure: "2026-12-12", roomType: "Deluxe", adults: 2, rateCode: "BAR", rate: 180000, guarantee: "Credit Card" });
const id = good.res!.id; S().go("arrivals"); S().act({ t: "ci.select", resId: id }); S().act({ t: "ci.id", resId: id }); S().act({ t: "ci.request", resId: id, text: "조용한 객실" });
S().act({ t: "ci.assign", resId: id, room: "1203", ok: false, reason: "dirty" }); ok(S().run!.stepIdx === 5, "still on assign after dirty");
S().act({ t: "ci.assign", resId: id, room: "1201", ok: true }); ok(S().completeCheckIn(id, { room: "1201", idVerified: true, guarantee: "Credit Card", request: "조용한 객실" }).ok, "checkin hong");
S().act({ t: "folio.open", resId: id }); ok(S().folios[id].reduce((a, l) => a + l.amount, 0) === 360000, "room 360000");
S().postCharge(id, "RST", 50000); S().postCharge(id, "MSC", 20000);
const d = S().pay(id, "Credit Card", 430000); ok(!d.ok && d.msg.includes("거절"), "declined once"); ok(S().run!.lastHint, "recover hint: " + S().run!.lastHint);
ok(S().pay(id, "Cash", 430000).ok, "cash ok"); ok(S().checkOut(id).ok, "checkout"); ok(S().run!.done, "m9 done " + JSON.stringify(S().run!.result?.score));

console.log("M10"); S().startMission("m10"); S().go("audit");
ok(!S().auditStep("post").ok, "order enforced"); for (const k of ["noshow", "departures", "post", "report", "rollover"] as const) S().auditStep(k); ok(S().run!.done, "m10 done " + S().run!.result?.score.total);
console.log(fails ? `\n${fails} FAILURES` : "\nALL PASSED", "attempts:", S().attempts.length, "/", MISSIONS.length);
process.exit(fails ? 1 : 0);
