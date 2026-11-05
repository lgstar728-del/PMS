"use client";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Btn({ variant = "navy", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "navy" | "gold" | "ghost" | "danger" }) {
  return (
    <button
      {...p}
      className={clsx(
        "o-btn inline-flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        variant === "navy" && "bg-navy text-white hover:bg-navy-700",
        variant === "gold" && "bg-gold text-navy hover:brightness-110",
        variant === "ghost" && "border border-slate-300 bg-white text-navy hover:bg-slate-50",
        variant === "danger" && "bg-rose-700 text-white hover:bg-rose-800",
        className,
      )}
    />
  );
}
export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (<label className={clsx("block text-xs font-semibold text-slate-600", className)}><span className="mb-0.5 block">{label}</span>{children}</label>);
}
const inCls = "o-input w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/40";
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={clsx(inCls, p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={clsx(inCls, p.className)} />;
export function Card({ title, right, children, className }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {title && <header className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm font-bold text-navy"><span>{title}</span>{right}</header>}
      <div className="p-4">{children}</div>
    </section>
  );
}
export function Badge({ color = "#14213D", children }: { color?: string; children: ReactNode }) {
  return <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: color }}>{children}</span>;
}
export function Modal({ title, onClose, children, width = "max-w-lg" }: { title: string; onClose: () => void; children: ReactNode; width?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={clsx("max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl", width)} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b bg-navy px-4 py-2.5 text-white"><b className="text-sm">{title}</b><button onClick={onClose} aria-label="닫기" className="text-lg leading-none">×</button></div>
        <div className="p-4">{children}</div>
      </motion.div>
    </div>
  );
}
export function ErrorList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (<ul role="alert" className="mb-3 space-y-1 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800">{items.map((x) => <li key={x}>⚠ {x}</li>)}</ul>);
}
export function Toast({ toast }: { toast: { msg: string; kind: string; key: number } | null }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div key={toast.key} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
          className={clsx("pointer-events-none fixed bottom-16 left-1/2 z-[60] max-w-[90vw] -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xl", toast.kind === "ok" ? "bg-emerald-700" : toast.kind === "warn" ? "bg-amber-600" : "bg-rose-700")}>
          {toast.msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export const Th = ({ children }: { children?: ReactNode }) => <th className="whitespace-nowrap bg-slate-100 px-2 py-1.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">{children}</th>;
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={clsx("border-t border-slate-100 px-2 py-1.5 text-sm", className)}>{children}</td>;
export function Official({ official = false }: { official?: boolean }) {
  return official ? <Badge color="#2e9e6b">공식 자료 기반</Badge> : <Badge color="#8a6d00">교육용 재구성 화면</Badge>;
}
