"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import PageLayout from "@/components/layout/page-layout";

/** Google Looker Studio(Data Studio) 리포트 원본 embed 크기 — 반응형 스케일링 기준 비율 */
const REPORT_WIDTH = 1800;
const REPORT_HEIGHT = 1000;

const REPORT_EMBED_URL =
  "https://datastudio.google.com/embed/reporting/15f093ff-ef5f-4dbe-b74e-ecb12e7bc53e/page/kIV1C";

export default function StatisticsPage() {
  const reportBoxRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* Fullscreen API 상태 동기화 — Esc 등 브라우저 자체 종료도 함께 반영 */
  useEffect(() => {
    const handleChange = () => setIsFullscreen(document.fullscreenElement === reportBoxRef.current);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      reportBoxRef.current?.requestFullscreen();
    }
  };

  return (
    <PageLayout mode="live" noGrid title="">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">통계</h1>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-all"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          전체화면
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mt-3">
        <div
          ref={reportBoxRef}
          className="w-full mx-auto"
          style={
            isFullscreen
              ? { width: "100vw", height: "100vh" }
              : { maxWidth: REPORT_WIDTH, aspectRatio: `${REPORT_WIDTH} / ${REPORT_HEIGHT}` }
          }
        >
          <iframe
            title="Google Looker Studio Report"
            src={REPORT_EMBED_URL}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      </div>
    </PageLayout>
  );
}
