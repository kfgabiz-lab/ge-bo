"use client";

/**
 * 콘텐츠 통합배치 수동 실행 페이지
 * - 카탈로그 → SSQ → 인증서 순으로 백엔드 배치를 순차 실행하고, 각 배치의 결과를 간단히 리포트한다.
 * - 한 소스가 실패해도 전체가 중단되지 않고 다음 소스가 계속 실행된다(백엔드 ContentsBatchOrchestrator 정책).
 */

import { useState } from "react";
import { Play, Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import api, { getApiErrorMessage } from "@/lib/api";

/* ══════════════════════════════════════════ */
/*  타입                                       */
/* ══════════════════════════════════════════ */

interface RunAllResponse {
  catalogBatchId: number | null;
  ssqBatchId: number | null;
  certiBatchId: number | null;
}

interface BatchRowCounts {
  received_row_count: number;
  received_document_count: number;
  success_count: number;
  partial_count: number;
  failure_count: number;
  quarantine_count: number;
  master_insert_count: number;
  master_update_count: number;
  category_insert_count: number;
  category_update_count: number;
  version_insert_count: number;
  version_update_count: number;
  file_insert_count: number;
  file_update_count: number;
}

interface BatchReport {
  delete_candidate_count: number;
  notes: string[];
}

interface BatchLog {
  batchId: number;
  sourceSystem: string;
  status: "RUNNING" | "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";
  currentStep: string | null;
  rowCounts: BatchRowCounts | null;
  report: BatchReport | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

interface SourceState {
  log: BatchLog | null;
  errorMessage: string | null;
}

interface FailRow {
  id: number;
  batchId: number;
  sourceSystem: string;
  sourceTable: string;
  sourceDocKey: string | null;
  sourceRowKey: string | null;
  failStep: string;
  failCode: string;
  failDetail: string | null;
  rawData: Record<string, unknown>;
  status: string;
  createdAt: string;
}

type SourceKey = "catalog" | "ssq" | "certi";

const SOURCES: { key: SourceKey; label: string; batchIdField: keyof RunAllResponse }[] = [
  { key: "catalog", label: "카탈로그", batchIdField: "catalogBatchId" },
  { key: "ssq", label: "SSQ", batchIdField: "ssqBatchId" },
  { key: "certi", label: "인증서", batchIdField: "certiBatchId" },
];

/* run-all은 배치를 비동기로 시작만 하고 즉시 반환한다 — 완료될 때까지 이 간격으로 상태를 폴링한다 */
const POLL_INTERVAL_MS = 2000;

const EMPTY_SOURCE_STATE: SourceState = { log: null, errorMessage: null };
const INITIAL_SOURCES: Record<SourceKey, SourceState> = {
  catalog: EMPTY_SOURCE_STATE,
  ssq: EMPTY_SOURCE_STATE,
  certi: EMPTY_SOURCE_STATE,
};

/* 상태별 배지 색상 */
const STATUS_CLS: Record<string, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-700",
  PARTIAL_SUCCESS: "bg-amber-100 text-amber-700",
  FAILED: "bg-red-100 text-red-700",
  RUNNING: "bg-blue-100 text-blue-700",
};

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  SUCCESS: CheckCircle2,
  PARTIAL_SUCCESS: AlertTriangle,
  FAILED: XCircle,
};

/* ══════════════════════════════════════════ */
/*  메인 페이지                                */
/* ══════════════════════════════════════════ */

export default function ContentsBatchPage() {
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [sources, setSources] = useState<Record<SourceKey, SourceState>>(INITIAL_SOURCES);
  const [failRows, setFailRows] = useState<Partial<Record<SourceKey, FailRow[]>>>({});
  const [failRowsLoading, setFailRowsLoading] = useState<Partial<Record<SourceKey, boolean>>>({});

  /** 격리 행은 목록이 클 수 있어 자동 조회하지 않고, 카드에서 버튼을 눌렀을 때만 가져온다. */
  const loadFailRows = async (key: SourceKey, batchId: number) => {
    setFailRowsLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await api.get<FailRow[]>(`/contents-batch/${batchId}/fail-rows`);
      setFailRows((prev) => ({ ...prev, [key]: res.data }));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "격리 행 조회에 실패했습니다."));
    } finally {
      setFailRowsLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  /** batchId 하나를 상태가 RUNNING을 벗어날 때까지 주기적으로 조회하며 sources를 갱신한다. */
  const pollUntilDone = async (key: SourceKey, batchId: number): Promise<"DONE" | "ERROR"> => {
    for (;;) {
      try {
        const logRes = await api.get<BatchLog>(`/contents-batch/${batchId}`);
        setSources((prev) => ({ ...prev, [key]: { log: logRes.data, errorMessage: null } }));
        if (logRes.data.status !== "RUNNING") {
          return logRes.data.status === "FAILED" ? "ERROR" : "DONE";
        }
      } catch (err) {
        setSources((prev) => ({
          ...prev,
          [key]: { log: null, errorMessage: getApiErrorMessage(err, "결과 조회에 실패했습니다.") },
        }));
        return "ERROR";
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setRunError(null);
    setSources(INITIAL_SOURCES);
    setFailRows({});
    try {
      // 배치는 백엔드에서 비동기로 시작만 되고 이 요청은 즉시 반환된다(batchId 3건만 내려옴) —
      // 순차 실행에 시간이 오래 걸려도(SSQ 실측 40초+) 이 요청 자체는 짧게 끝나므로 별도 timeout 불필요.
      const runRes = await api.post<RunAllResponse>("/contents-batch/run-all");
      const results = runRes.data;

      // 소스별 폴링은 서로 독립적으로 처리한다 — 하나가 이미 실행 중이라 건너뛰어도(batchId=null)
      // 나머지 소스의 결과 표시가 묻히지 않도록 개별 반영한다.
      const outcomes = await Promise.allSettled(
        SOURCES.map(({ key, batchIdField }) => {
          const batchId = results[batchIdField];
          if (batchId == null) {
            setSources((prev) => ({
              ...prev,
              [key]: { log: null, errorMessage: "이미 실행 중인 배치가 있어 이번 요청에서는 건너뛰었습니다." },
            }));
            return Promise.resolve<"DONE" | "ERROR">("ERROR");
          }
          return pollUntilDone(key, batchId);
        })
      );

      const anyError = outcomes.some((o) => o.status === "rejected" || o.value === "ERROR");
      if (anyError) {
        toast.warning("일부 소스가 실패했거나 건너뛰었습니다 — 카드별 상세를 확인하세요.");
      } else {
        toast.success("카탈로그 → SSQ → 인증서 순으로 배치가 모두 완료되었습니다.");
      }
    } catch (err) {
      const message = getApiErrorMessage(err, "배치 실행 중 오류가 발생했습니다.");
      setRunError(message);
      toast.error(message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">콘텐츠 통합배치 실행</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            카탈로그 → SSQ → 인증서 순으로 IF 데이터를 contents_* 테이블에 반영합니다. 한 소스가 실패해도 나머지는 계속
            실행됩니다.
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-semibold transition-all shadow-sm disabled:opacity-60"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? "실행 중..." : "배치 실행"}
        </button>
      </div>

      {/* 오류 배너 — run-all 호출 자체가 실패한 경우(네트워크/인증 등) */}
      {runError && (
        <div className="mb-4 px-4 py-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">{runError}</div>
      )}

      {/* 소스별 결과 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SOURCES.map(({ key, label }) => (
          <BatchReportCard
            key={key}
            sourceKey={key}
            label={label}
            state={sources[key]}
            loading={running}
            onLoadFailRows={loadFailRows}
            failRowsLoading={failRowsLoading[key] ?? false}
            failRowsLoaded={failRows[key] != null}
          />
        ))}
      </div>

      {/* 리포트 노트 상세 — 카드 안에 욱여넣지 않고 전체 폭으로 따로 표시해 한눈에 파악 가능하게 함 */}
      <ReportNotesSection sources={sources} />

      {/* 격리 행 상세 — 카드에서 "격리 행 보기"를 누른 소스만 표시 */}
      <FailRowsSection failRows={failRows} />
    </div>
  );
}

/* ══════════════════════════════════════════ */
/*  리포트 노트 상세 섹션                        */
/* ══════════════════════════════════════════ */

/**
 * 백엔드 노트 문자열은 전부 "원인 설명: 대상ID(또는 상세)" 형식(첫 ": " 기준)이라 이걸 나눠서
 * 표 형태로 보여준다 — 리스트로 쭉 나열할 때보다 어떤 ID가 왜 걸렸는지 한눈에 들어온다.
 */
function parseNote(note: string): { reason: string; detail: string } {
  const idx = note.indexOf(": ");
  if (idx === -1) {
    return { reason: note, detail: "-" };
  }
  return { reason: note.slice(0, idx), detail: note.slice(idx + 2) };
}

function ReportNotesSection({ sources }: { sources: Record<SourceKey, SourceState> }) {
  const groups = SOURCES.map(({ key, label }) => ({ key, label, notes: sources[key].log?.report?.notes ?? [] })).filter(
    (g) => g.notes.length > 0
  );

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      {groups.map(({ key, label, notes }) => (
        <div key={key} className="border border-slate-200 rounded-md bg-white">
          <p className="text-xs font-bold text-slate-700 px-4 py-2 border-b border-slate-200">
            {label} 리포트 노트 ({notes.length}건)
          </p>
          <div className="overflow-auto max-h-72">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 sticky top-0">
                <tr>
                  <th className="text-left font-semibold px-4 py-1.5 w-2/5">원인</th>
                  <th className="text-left font-semibold px-4 py-1.5">대상 ID / 상세</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((note, i) => {
                  const { reason, detail } = parseNote(note);
                  return (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-4 py-1.5 text-slate-600 align-top">{reason}</td>
                      <td className="px-4 py-1.5 text-slate-800 font-mono align-top">{detail}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════ */
/*  격리 행 상세 섹션                           */
/* ══════════════════════════════════════════ */

function FailRowsSection({ failRows }: { failRows: Partial<Record<SourceKey, FailRow[]>> }) {
  const groups = SOURCES.map(({ key, label }) => ({ key, label, rows: failRows[key] })).filter(
    (g): g is { key: SourceKey; label: string; rows: FailRow[] } => g.rows != null
  );

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      {groups.map(({ key, label, rows }) => (
        <div key={key} className="border border-slate-200 rounded-md bg-white">
          <p className="text-xs font-bold text-slate-700 px-4 py-2 border-b border-slate-200">
            {label} 격리 행 ({rows.length}건)
          </p>
          {rows.length === 0 ? (
            <p className="text-xs text-slate-400 px-4 py-3">격리된 행이 없습니다.</p>
          ) : (
            <div className="overflow-auto max-h-96">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                  <tr>
                    <th className="text-left font-semibold px-4 py-1.5">대상 ID</th>
                    <th className="text-left font-semibold px-4 py-1.5">단계/코드</th>
                    <th className="text-left font-semibold px-4 py-1.5 w-2/5">사유</th>
                    <th className="text-left font-semibold px-4 py-1.5">원본 데이터</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-1.5 text-slate-800 font-mono align-top">
                        {row.sourceDocKey ?? row.sourceRowKey ?? "-"}
                      </td>
                      <td className="px-4 py-1.5 text-slate-600 align-top whitespace-nowrap">
                        {row.failStep} / {row.failCode}
                      </td>
                      <td className="px-4 py-1.5 text-slate-600 align-top">{row.failDetail ?? "-"}</td>
                      <td className="px-4 py-1.5 align-top">
                        <details>
                          <summary className="cursor-pointer text-slate-500">보기</summary>
                          <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[11px] text-slate-700">
                            {JSON.stringify(row.rawData, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════ */
/*  소스별 리포트 카드                          */
/* ══════════════════════════════════════════ */

function BatchReportCard({
  sourceKey,
  label,
  state,
  loading,
  onLoadFailRows,
  failRowsLoading,
  failRowsLoaded,
}: {
  sourceKey: SourceKey;
  label: string;
  state: SourceState;
  loading: boolean;
  onLoadFailRows: (key: SourceKey, batchId: number) => void;
  failRowsLoading: boolean;
  failRowsLoaded: boolean;
}) {
  const { log, errorMessage } = state;
  const StatusIcon = log ? STATUS_ICON[log.status] : null;
  const quarantineCount = log?.rowCounts?.quarantine_count ?? 0;

  return (
    <div className="border border-slate-200 rounded-md p-4 bg-white min-h-[180px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900">{label}</h3>
        {log && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_CLS[log.status] ?? "bg-slate-100 text-slate-600"}`}
          >
            {StatusIcon && <StatusIcon className="w-3 h-3" />}
            {log.status}
          </span>
        )}
      </div>

      {loading && !log && !errorMessage ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
        </div>
      ) : errorMessage && !log ? (
        <p className="text-xs text-red-600">{errorMessage}</p>
      ) : !log ? (
        <p className="text-xs text-slate-400">아직 실행되지 않았습니다.</p>
      ) : log.status === "FAILED" ? (
        <p className="text-xs text-red-600">{log.errorMessage ?? "알 수 없는 오류"}</p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
          <ReportRow label="수신 문서" value={log.rowCounts?.received_document_count} />
          <ReportRow label="성공" value={log.rowCounts?.success_count} cls="text-emerald-600" />
          <ReportRow label="부분성공" value={log.rowCounts?.partial_count} cls="text-amber-600" />
          <ReportRow label="격리 행" value={log.rowCounts?.quarantine_count} cls="text-red-600" />
          <ReportRow label="삭제 후보" value={log.report?.delete_candidate_count} />
          <ReportRow label="batch_id" value={log.batchId} />
          {log.report?.notes && log.report.notes.length > 0 && (
            <div className="col-span-2 mt-1 text-amber-600">
              리포트 노트 {log.report.notes.length}건 — 아래 상세 참고
            </div>
          )}
          {quarantineCount > 0 && (
            <div className="col-span-2 mt-1">
              <button
                onClick={() => onLoadFailRows(sourceKey, log.batchId)}
                disabled={failRowsLoading}
                className="text-red-600 underline underline-offset-2 disabled:opacity-50"
              >
                {failRowsLoading
                  ? "조회 중..."
                  : failRowsLoaded
                    ? "격리 행 다시 조회"
                    : `격리 행 ${quarantineCount}건 보기 — 아래 상세 참고`}
              </button>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

function ReportRow({ label, value, cls }: { label: string; value: number | undefined; cls?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt>{label}</dt>
      <dd className={`font-mono font-medium ${cls ?? "text-slate-800"}`}>{value ?? "-"}</dd>
    </div>
  );
}
