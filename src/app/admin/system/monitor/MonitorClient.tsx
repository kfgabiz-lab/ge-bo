"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import PageLayout from "@/components/layout/page-layout";
import { GridCell } from "@/components/layout/grid-cell";
import {
  WidgetRenderer,
  RendererContainer,
  FieldRenderer,
} from "@/app/admin/templates/make/_shared/components/renderer";
import type { TableWidget } from "@/app/admin/templates/make/_shared/components/builder/TableBuilder";
import type { SearchFieldConfig } from "@/app/admin/templates/make/_shared/types";
import { CircleCountCard } from "@/app/admin/dashboard/CircleCountCard";
import api from "@/lib/api";

interface ProcessResourceSummary {
  processName: string;
  avgCpuPercent: number;
  maxCpuPercent: number;
  avgMemoryMb: number;
  maxMemoryMb: number;
}

interface DailyTrendItem {
  date: string;
  processName: string;
  avgCpuPercent: number;
  avgMemoryMb: number;
}

interface ServerResourceMonitorResponse {
  date: string;
  dailySummary: ProcessResourceSummary[];
  weeklyTrend: DailyTrendItem[];
}

interface ProcessMetricDetail {
  processName: string;
  cpuPercent: number;
  memoryMb: number;
  capturedAt: string;
}

const BASE_DATE_FIELD: SearchFieldConfig = {
  id: "baseDate",
  type: "date",
  label: "",
  colSpan: 1,
};

const PROCESS_FILTER_FIELD: SearchFieldConfig = {
  id: "processFilter",
  type: "select",
  label: "",
  colSpan: 1,
  placeholder: "전체",
  options: ["bo:bo", "fo:fo", "bo-api:bo-api"],
};

const SERVER_IP_FIELD_BASE: Omit<SearchFieldConfig, "options" | "placeholder"> = {
  id: "serverIp",
  type: "select",
  label: "",
  colSpan: 1,
};

const RESOURCE_TABLE_WIDGET: TableWidget = {
  type: "table",
  widgetId: "server-resource-daily-table",
  contentKey: "serverResourceDailyList",
  displayMode: "scroll",
  pageSize: 7,
  connectedSearchIds: [],
  columns: [
    { id: "c1", header: "날짜", accessor: "date", cellType: "text", align: "center", sortable: false, width: 140 },
    { id: "c2", header: "bo 평균 CPU (%)", accessor: "boCpu", cellType: "text", align: "center", sortable: false },
    {
      id: "c3",
      header: "bo 평균 메모리 (MB)",
      accessor: "boMemory",
      cellType: "text",
      align: "center",
      sortable: false,
    },
    { id: "c4", header: "fo 평균 CPU (%)", accessor: "foCpu", cellType: "text", align: "center", sortable: false },
    {
      id: "c5",
      header: "fo 평균 메모리 (MB)",
      accessor: "foMemory",
      cellType: "text",
      align: "center",
      sortable: false,
    },
    { id: "c6", header: "bo-api 평균 CPU (%)", accessor: "apiCpu", cellType: "text", align: "center", sortable: false },
    {
      id: "c7",
      header: "bo-api 평균 메모리 (MB)",
      accessor: "apiMemory",
      cellType: "text",
      align: "center",
      sortable: false,
    },
  ],
};

const RESOURCE_DETAIL_TABLE_WIDGET: TableWidget = {
  type: "table",
  widgetId: "server-resource-detail-table",
  contentKey: "serverResourceDetailList",
  displayMode: "scroll",
  pageSize: 1,
  connectedSearchIds: [],
  columns: [
    {
      id: "d1",
      header: "프로세스명",
      accessor: "processName",
      cellType: "text",
      align: "center",
      sortable: false,
      width: 140,
    },
    { id: "d2", header: "CPU (%)", accessor: "cpuPercent", cellType: "text", align: "center", sortable: false },
    { id: "d3", header: "메모리 (MB)", accessor: "memoryMb", cellType: "text", align: "center", sortable: false },
    {
      id: "d4",
      header: "측정시각",
      accessor: "capturedAt",
      cellType: "date",
      dateFormat: "YYYY-MM-DD HH:mm:ss",
      align: "center",
      sortable: false,
      width: 180,
    },
  ],
};

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface ProcessSummaryCardProps {
  summary: ProcessResourceSummary;
}

function ProcessSummaryCard({ summary }: ProcessSummaryCardProps) {
  return (
    <RendererContainer bgColor="#ffffff">
      <div className="h-full w-full flex flex-col gap-4 p-5">
        <h2 className="text-sm font-bold text-slate-900 flex-shrink-0">{summary.processName}</h2>
        <div className="flex-1 flex items-center justify-center gap-4">
          <CircleCountCard label="평균 CPU (%)" count={summary.avgCpuPercent} emphasis />
          <CircleCountCard label="최고 CPU (%)" count={summary.maxCpuPercent} />
          <CircleCountCard label="평균 메모리 (MB)" count={summary.avgMemoryMb} />
          <CircleCountCard label="최고 메모리 (MB)" count={summary.maxMemoryMb} />
        </div>
      </div>
    </RendererContainer>
  );
}

export default function MonitorClient() {
  const today = useMemo(() => formatDateInput(new Date()), []);

  const [baseDate, setBaseDate] = useState<string>(today);
  const [dailySummary, setDailySummary] = useState<ProcessResourceSummary[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<DailyTrendItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [serverIps, setServerIps] = useState<string[]>([]);
  const [selectedIp, setSelectedIp] = useState<string>("");
  const [ipsLoading, setIpsLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailRows, setDetailRows] = useState<ProcessMetricDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [processFilter, setProcessFilter] = useState<string>("");

  const serverIpField = useMemo<SearchFieldConfig>(
    () => ({
      ...SERVER_IP_FIELD_BASE,
      placeholder: serverIps.length === 0 ? "IP 없음" : "전체",
      options: serverIps.map((ip) => `${ip}:${ip}`),
    }),
    [serverIps]
  );

  const fetchMonitor = useCallback(async (date: string, ip: string) => {
    setLoading(true);
    try {
      const res = await api.get<ServerResourceMonitorResponse>("/server-resource-metrics", {
        params: { date, ip: ip || undefined },
      });
      setDailySummary(res.data.dailySummary);
      setWeeklyTrend(res.data.weeklyTrend);
    } catch {
      toast.error("서버 리소스 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDetail = useCallback(async (date: string, ip: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get<ProcessMetricDetail[]>("/server-resource-metrics/detail", {
        params: { date, ip: ip || undefined },
      });
      setDetailRows(res.data);
    } catch {
      toast.error("상세 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get<string[]>("/server-resource-metrics/ips");
        if (!active) {
          return;
        }
        setServerIps(res.data);
        if (res.data.length > 0) {
          setSelectedIp(res.data[0]);
        }
      } catch {
        toast.error("서버 IP 목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (active) {
          setIpsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (ipsLoading) {
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
      return;
    }
    setSelectedDate(null);
    fetchMonitor(baseDate, selectedIp);
  }, [baseDate, selectedIp, ipsLoading, fetchMonitor]);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }
    setProcessFilter("");
    fetchDetail(selectedDate, selectedIp);
  }, [selectedDate, selectedIp, fetchDetail]);

  const handleCloseDetail = useCallback(() => {
    setSelectedDate(null);
    setDetailRows([]);
    setProcessFilter("");
  }, []);

  const tableData = useMemo(() => {
    const rowsByDate = new Map<
      string,
      {
        boCpu?: number;
        boMemoryMb?: number;
        foCpu?: number;
        foMemoryMb?: number;
        apiCpu?: number;
        apiMemoryMb?: number;
      }
    >();

    weeklyTrend.forEach((item) => {
      const row = rowsByDate.get(item.date) ?? {};
      if (item.processName === "bo") {
        row.boCpu = item.avgCpuPercent;
        row.boMemoryMb = item.avgMemoryMb;
      } else if (item.processName === "fo") {
        row.foCpu = item.avgCpuPercent;
        row.foMemoryMb = item.avgMemoryMb;
      } else if (item.processName === "bo-api") {
        row.apiCpu = item.avgCpuPercent;
        row.apiMemoryMb = item.avgMemoryMb;
      }
      rowsByDate.set(item.date, row);
    });

    return Array.from(rowsByDate.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, row], idx) => ({
        _id: idx,
        date,
        boCpu: row.boCpu !== undefined ? String(row.boCpu) : "-",
        boMemory: row.boMemoryMb !== undefined ? row.boMemoryMb.toLocaleString() : "-",
        foCpu: row.foCpu !== undefined ? String(row.foCpu) : "-",
        foMemory: row.foMemoryMb !== undefined ? row.foMemoryMb.toLocaleString() : "-",
        apiCpu: row.apiCpu !== undefined ? String(row.apiCpu) : "-",
        apiMemory: row.apiMemoryMb !== undefined ? row.apiMemoryMb.toLocaleString() : "-",
      })) as unknown as Record<string, unknown>[];
  }, [weeklyTrend]);

  const handleSummaryRowClick = useCallback((row: Record<string, unknown>) => {
    setSelectedDate(row.date as string);
  }, []);

  const filteredDetailRows = useMemo(() => {
    if (!processFilter) {
      return detailRows;
    }
    return detailRows.filter((row) => row.processName === processFilter);
  }, [detailRows, processFilter]);

  const detailTableData = useMemo(() => {
    return filteredDetailRows.map((row, idx) => ({
      _id: idx,
      processName: row.processName,
      cpuPercent: String(row.cpuPercent),
      memoryMb: row.memoryMb.toLocaleString(),
      capturedAt: row.capturedAt,
    })) as unknown as Record<string, unknown>[];
  }, [filteredDetailRows]);

  const detailTableWidget = useMemo<TableWidget>(
    () => ({ ...RESOURCE_DETAIL_TABLE_WIDGET, pageSize: Math.max(detailTableData.length, 1) }),
    [detailTableData.length]
  );

  return (
    <PageLayout mode="live" title="서버 리소스 모니터링" description="bo / fo / bo-api 프로세스의 CPU·메모리 일일 요약">
      <GridCell colSpan={12} rowSpan={2}>
        <RendererContainer bgColor="#ffffff">
          <div className="h-full w-full flex items-center gap-4 p-5">
            <span className="text-sm font-bold text-slate-900 flex-shrink-0">조회 기준일</span>
            <div className="w-48">
              <FieldRenderer mode="live" field={BASE_DATE_FIELD} value={baseDate} onChange={setBaseDate} />
            </div>
            <span className="text-sm font-bold text-slate-900 flex-shrink-0">서버 IP</span>
            <div className="w-48">
              <FieldRenderer
                mode="live"
                field={serverIpField}
                value={selectedIp}
                onChange={setSelectedIp}
                forceDisabled={serverIps.length === 0}
              />
            </div>
          </div>
        </RendererContainer>
      </GridCell>

      {loading && dailySummary.length === 0 ? (
        <GridCell colSpan={12} rowSpan={3}>
          <RendererContainer bgColor="#ffffff">
            <div className="h-full w-full flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
            </div>
          </RendererContainer>
        </GridCell>
      ) : (
        dailySummary.map((summary) => (
          <GridCell key={summary.processName} colSpan={4} rowSpan={3}>
            <ProcessSummaryCard summary={summary} />
          </GridCell>
        ))
      )}

      <GridCell colSpan={12} rowSpan={6}>
        <RendererContainer bgColor="#ffffff">
          <div className="h-full w-full flex flex-col gap-3 p-5">
            <h2 className="text-sm font-bold text-slate-900 flex-shrink-0">최근 7일 요약</h2>
            <div className="flex-1 min-h-0">
              <WidgetRenderer
                mode="live"
                widget={RESOURCE_TABLE_WIDGET}
                contentColSpan={12}
                tableData={tableData}
                tableLoading={loading}
                totalElements={tableData.length}
                hasMore={false}
                onRowClick={handleSummaryRowClick}
              />
            </div>
          </div>
        </RendererContainer>
      </GridCell>

      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={handleCloseDetail} />
          <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <h2 className="text-base font-bold text-slate-900">{selectedDate} 상세 (5분 단위)</h2>
              <button
                type="button"
                onClick={handleCloseDetail}
                className="p-1.5 rounded-md hover:bg-slate-100 transition-all"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="px-6 pt-4 flex items-center gap-3 flex-shrink-0">
              <span className="text-xs font-semibold text-slate-600 flex-shrink-0">프로세스</span>
              <div className="w-40">
                <FieldRenderer
                  mode="live"
                  field={PROCESS_FILTER_FIELD}
                  value={processFilter}
                  onChange={setProcessFilter}
                />
              </div>
            </div>
            <div className="px-6 py-4 flex-1 min-h-0 overflow-y-auto">
              <WidgetRenderer
                mode="live"
                widget={detailTableWidget}
                contentColSpan={12}
                tableData={detailTableData}
                tableLoading={detailLoading}
                totalElements={detailTableData.length}
                hasMore={false}
              />
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
