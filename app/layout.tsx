import "./globals.css";
import type { Metadata, Viewport } from "next";
export const metadata: Metadata = {
  title: "HOTEL OPERA PMS TRAINING ACADEMY",
  description: "GRAND ACADEMY HOTEL — OPERA PMS 객실부 신입사원 교육용 시뮬레이터 (가상 데이터)",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="ko"><body>{children}</body></html>);
}
