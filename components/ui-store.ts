"use client";
import { create } from "zustand";

export type Panel = "learn" | "sim" | "tutor";
export type Center = "sim" | "3d" | "score" | "admin";
interface UI { panel: Panel; center: Center; setPanel: (p: Panel) => void; setCenter: (c: Center) => void; show: (c: Center) => void }
/** 화면 레이아웃(탭) 상태 — 학습 데이터와 분리 */
export const useUI = create<UI>((set) => ({
  panel: "learn", center: "sim",
  setPanel: (panel) => set({ panel }),
  setCenter: (center) => set({ center }),
  show: (center) => set({ center, panel: "sim" }),
}));
