"use client";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import clsx from "clsx";
import { useStore } from "@/lib/store";
import { roomState, STATE_COLOR, STATE_KO } from "@/lib/rules";
import type { Room } from "@/lib/types";
import { Btn } from "./ui";
import { useUI } from "./ui-store";

const FLOOR_H = 0.55, COL_W = 0.52, BASE = 1.5;
const posOf = (r: Room): [number, number, number] => [(Number(r.no.slice(2)) - 10.5) * COL_W, BASE + (r.floor - 3) * FLOOR_H + 0.27, 0.62];

function Rooms({ floor, onPick }: { floor: number; onPick: (no: string) => void }) {
  const rooms = useStore((s) => s.rooms);
  const focus = useStore((s) => s.ctx.focusRoom);
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    const m = ref.current; if (!m) return;
    rooms.forEach((r, i) => {
      const p = posOf(r); dummy.position.set(...p); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
      const c = new THREE.Color(STATE_COLOR[roomState(r)]);
      if (floor !== 0 && r.floor !== floor) c.multiplyScalar(0.18);
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [rooms, floor, dummy]);
  const fr = rooms.find((r) => r.no === focus);
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (ring.current) { const k = 1 + Math.sin(clock.elapsedTime * 5) * 0.12; ring.current.scale.set(k, k, 1); } });
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, rooms.length]} onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.instanceId !== undefined) onPick(rooms[e.instanceId].no); }}>
        <boxGeometry args={[COL_W * 0.86, FLOOR_H * 0.78, 0.18]} /><meshStandardMaterial roughness={0.45} />
      </instancedMesh>
      {fr && <mesh ref={ring} position={[posOf(fr)[0], posOf(fr)[1], 0.74]}><ringGeometry args={[0.3, 0.36, 4, 1, Math.PI / 4]} /><meshBasicMaterial color="#C9A227" side={THREE.DoubleSide} /></mesh>}
    </>
  );
}

function Walker() {
  const anim = useStore((s) => s.anim);
  const ref = useRef<THREE.Group>(null);
  const t0 = useRef(0);
  const path = useMemo(() => (anim?.kind === "checkout"
    ? [new THREE.Vector3(-2.2, 0.35, 2.8), new THREE.Vector3(0, 0.35, 4.6), new THREE.Vector3(3, 0.35, 9)]
    : [new THREE.Vector3(3, 0.35, 9), new THREE.Vector3(0, 0.35, 4.6), new THREE.Vector3(-2.2, 0.35, 2.8)]), [anim?.kind]);
  useEffect(() => { t0.current = performance.now(); }, [anim?.key]);
  useFrame(() => {
    const g = ref.current; if (!g || !anim) return;
    const t = (performance.now() - t0.current) / 1000; const total = 4.2;
    if (t > total + 1.5) { g.visible = false; return; }
    g.visible = true; const u = Math.min(1, t / total) * (path.length - 1); const i = Math.min(path.length - 2, Math.floor(u));
    g.position.lerpVectors(path[i], path[i + 1], u - i); g.position.y = 0.35 + Math.abs(Math.sin(t * 8)) * 0.05;
  });
  if (!anim) return null;
  return (<group ref={ref} visible={false}><mesh><capsuleGeometry args={[0.14, 0.4, 4, 8]} /><meshStandardMaterial color={anim.kind === "checkin" ? "#2e9e6b" : "#b83a4b"} /></mesh><mesh position={[0, 0.42, 0]}><sphereGeometry args={[0.13, 12, 12]} /><meshStandardMaterial color="#f1c9a5" /></mesh></group>);
}

function Building({ floor, onPick }: { floor: number; onPick: (no: string) => void }) {
  const dirty = useStore((s) => s.rooms.filter((r) => r.hk === "Dirty" && r.fo === "Vacant" && !r.ooo).length);
  return (
    <group>
      <mesh position={[0, -0.02, 4]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[40, 30]} /><meshStandardMaterial color="#d9dee6" /></mesh>
      <mesh position={[0, BASE + 2.75, 0.2]}><boxGeometry args={[11.4, 5.75, 1.0]} /><meshStandardMaterial color="#14213D" /></mesh>
      <mesh position={[0, BASE + 5.78, 0.2]}><boxGeometry args={[11.7, 0.18, 1.2]} /><meshStandardMaterial color="#C9A227" metalness={0.6} roughness={0.3} /></mesh>
      {/* lobby */}
      <mesh position={[0, 0.75, 1.9]}><boxGeometry args={[12, 1.5, 4.4]} /><meshStandardMaterial color="#9fb7d6" transparent opacity={0.45} /></mesh>
      <mesh position={[0, 1.55, 4.3]}><boxGeometry args={[5, 0.1, 1.6]} /><meshStandardMaterial color="#C9A227" /></mesh>
      <mesh position={[-2.4, 0.3, 2.5]}><boxGeometry args={[2, 0.6, 0.6]} /><meshStandardMaterial color="#C9A227" /></mesh>
      <Html position={[-2.4, 1.0, 2.5]} center distanceFactor={9}><div className="whitespace-nowrap rounded bg-navy/85 px-2 py-0.5 text-[10px] font-semibold text-white">FRONT DESK</div></Html>
      {/* housekeeping */}
      <mesh position={[8.4, 0.5, 1.6]}><boxGeometry args={[2.4, 1, 2.4]} /><meshStandardMaterial color="#d98a1c" /></mesh>
      <mesh position={[8.4, 0.2, 3.1]}><boxGeometry args={[0.7, 0.4, 0.4]} /><meshStandardMaterial color="#6b7280" /></mesh>
      <Html position={[8.4, 1.4, 1.6]} center distanceFactor={9}><div className="whitespace-nowrap rounded bg-amber-600/90 px-2 py-0.5 text-[10px] font-semibold text-white">HOUSEKEEPING · Dirty {dirty}</div></Html>
      <Rooms floor={floor} onPick={onPick} />
      <Walker />
    </group>
  );
}

function Interior({ room }: { room: Room }) {
  const st = roomState(room); const color = STATE_COLOR[st];
  return (
    <group>
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[7, 6]} /><meshStandardMaterial color="#c9b79c" /></mesh>
      <mesh position={[0, 1.5, -3]}><boxGeometry args={[7, 3, 0.1]} /><meshStandardMaterial color="#f5f7fa" /></mesh>
      <mesh position={[-3.5, 1.5, 0]}><boxGeometry args={[0.1, 3, 6]} /><meshStandardMaterial color="#eef1f6" /></mesh>
      <mesh position={[0, 2.85, -2.93]}><boxGeometry args={[7, 0.1, 0.08]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} /></mesh>
      <mesh position={[1.6, 1.6, -2.93]}><boxGeometry args={[2, 1.4, 0.05]} /><meshStandardMaterial color="#8ec5ff" emissive="#8ec5ff" emissiveIntensity={0.3} /></mesh>
      <mesh position={[-1.2, 0.3, -1.6]}><boxGeometry args={[2.4, 0.6, 3]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[-1.2, 0.68, -2.5]}><boxGeometry args={[1.8, 0.16, 0.6]} /><meshStandardMaterial color="#14213D" /></mesh>
      <mesh position={[0.6, 0.25, -2.6]}><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color="#8a6d4b" /></mesh>
      <mesh position={[2.8, 0.4, 0.5]}><boxGeometry args={[1.6, 0.8, 0.7]} /><meshStandardMaterial color="#8a6d4b" /></mesh>
      {room.fo === "Occupied" && <mesh position={[-1.2, 0.95, -1.4]}><capsuleGeometry args={[0.22, 0.9, 4, 8]} /><meshStandardMaterial color="#b83a4b" /></mesh>}
      {room.hk === "Dirty" && !room.ooo && [0, 1, 2].map((i) => <mesh key={i} position={[1 + i * 0.5, 0.1, 1.2 - i * 0.3]}><boxGeometry args={[0.3, 0.2, 0.3]} /><meshStandardMaterial color="#d98a1c" /></mesh>)}
      {room.ooo && [0, 1].map((i) => <mesh key={i} position={[0.5 + i * 1.5, 0.4, 1.5]}><coneGeometry args={[0.3, 0.8, 4]} /><meshStandardMaterial color="#f97316" /></mesh>)}
    </group>
  );
}

export default function Hotel3D() {
  const { rooms, ctx, go, anim } = useStore();
  const show = useUI((u) => u.show);
  const [floor, setFloor] = useState(0); const [sel, setSel] = useState<string | null>(null); const [inside, setInside] = useState(false);
  const room = rooms.find((r) => r.no === (sel ?? ctx.focusRoom));
  const res = useStore((s) => s.reservations.find((r) => r.id === room?.resId));
  const guest = useStore((s) => s.guests.find((g) => g.id === res?.guestId));
  useEffect(() => { if (ctx.focusRoom) setSel(ctx.focusRoom); }, [ctx.focusRoom]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-semibold">층 보기</span>
        {[0, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3].map((f) => <button key={f} onClick={() => setFloor(f)} className={clsx("rounded-full border px-2.5 py-1", floor === f ? "border-gold bg-gold font-bold text-navy" : "border-slate-300 bg-white")}>{f === 0 ? "전체" : `${f}F`}</button>)}
        <Btn variant="ghost" className="ml-auto !py-1 text-xs" disabled={!room} onClick={() => setInside((v) => !v)}>{inside ? "← 외관" : "객실 내부 보기"}</Btn>
      </div>
      <div className="relative h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-sky-100 to-mist sm:h-[500px]" role="img" aria-label="3D 호텔 디지털 트윈">
        <Canvas camera={{ position: inside ? [5, 3.5, 6] : [0, 5, 15], fov: 50 }} key={inside ? "in" : "out"} dpr={[1, 1.5]}>
          <ambientLight intensity={0.8} /><directionalLight position={[6, 12, 10]} intensity={1.1} />
          {inside && room ? <Interior room={room} /> : <Building floor={floor} onPick={(no) => { setSel(no); useStore.getState().act({ t: "3d.room", no }); }} />}
          <OrbitControls enablePan={false} minDistance={4} maxDistance={26} target={inside ? [0, 1, 0] : [0, 3.5, 1]} maxPolarAngle={Math.PI / 2.05} />
        </Canvas>
        {anim && <div className="pointer-events-none absolute left-3 top-3 rounded bg-navy/85 px-3 py-1 text-xs text-white">{anim.kind === "checkin" ? `🧳 체크인 → ${anim.room}호 투숙 반영` : `👋 체크아웃 → ${anim.room}호 Dirty 전환`}</div>}
        <div className="pointer-events-none absolute bottom-2 left-3 flex flex-wrap gap-2 rounded bg-white/80 px-2 py-1 text-[10px]">{(Object.keys(STATE_COLOR) as (keyof typeof STATE_COLOR)[]).map((k) => <span key={k} className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: STATE_COLOR[k] }} />{STATE_KO[k]}</span>)}</div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
        {room ? (<div className="flex flex-wrap items-center gap-3"><b>Room {room.no}</b><span>{room.type}</span><span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: STATE_COLOR[roomState(room)] }}>{STATE_KO[roomState(room)]}</span>{guest && <span>👤 {guest.name} ({res!.arrival}~{res!.departure})</span>}
          <Btn variant="gold" className="ml-auto" onClick={() => { go("rooms", { focusRoom: room.no }); show("sim"); }}>OPERA 객실정보에서 열기</Btn></div>)
          : <span className="text-slate-500">객실(창문)을 클릭하면 정보가 표시됩니다. 드래그로 회전, 휠/핀치로 확대·축소합니다. OPERA 시뮬레이터와 같은 상태 데이터를 사용합니다.</span>}
      </div>
    </div>
  );
}
