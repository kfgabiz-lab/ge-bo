'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/page-layout';
import { GridCell } from '@/components/layout/grid-cell';
import { WidgetRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type {
    SearchWidget,
} from '@/app/admin/templates/make/_shared/components/renderer';
import type { TableWidget } from '@/app/admin/templates/make/_shared/components/builder/TableBuilder';
import type { TableActionHandlers } from '@/app/admin/templates/make/_shared/components/renderer/types';
import { useI18n } from '@/hooks/use-i18n';
import api from '@/lib/api';

/* ── 트랜잭션 로그 단건 타입 ── */
interface TransactionLogItem {
    id: number;
    actionType: string | null;
    method: string | null;
    requestUrl: string | null;
    httpStatus: number;
    loginUser: string | null;
    clientIp: string | null;
    durationMs: number | null;
    createdAt: string; // OffsetDateTime ISO 문자열
}

/* ── Spring Page 응답 타입 ── */
interface PageResponse {
    content: TransactionLogItem[];
    totalElements: number;
    totalPages: number;
    number: number; // 현재 페이지 (0-based)
}

/* ── 상수 ── */
const PAGE_SIZE = 20;

/* ──────────────────────────────────────────────
   날짜 문자열 → ISO OffsetDateTime 변환 유틸
   입력: YYYY-MM-DD
   출력: YYYY-MM-DDTHH:mm:ss+09:00
────────────────────────────────────────────── */
function toStartIso(dateStr: string): string {
    return `${dateStr}T00:00:00+09:00`;
}
function toEndIso(dateStr: string): string {
    return `${dateStr}T23:59:59+09:00`;
}

/* ── 페이지 컴포넌트 ── */
export default function TransactionLogPage() {
    const { t } = useI18n();
    const router = useRouter();

    /* 목록 데이터 상태 */
    const [items, setItems] = useState<TransactionLogItem[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [loading, setLoading] = useState(false);

    /* 검색 입력값 — 필드 ID 기준 */
    const [searchValues, setSearchValues] = useState<Record<string, string>>({
        f1: '',  // 상태코드
        f2: '',  // 변경유형
        f3: '',  // 사용자
        f4_from: '', // 시작일 (dateRange)
        f4_to: '',   // 종료일 (dateRange)
    });

    /* 검색 버튼 클릭 시 실제 API 호출에 사용되는 확정 검색값 */
    const [appliedSearch, setAppliedSearch] = useState<Record<string, string>>({
        f1: '',
        f2: '',
        f3: '',
        f4_from: '',
        f4_to: '',
    });

    /* ── 목록 API 호출 ── */
    const fetchList = useCallback(async (page = 0, search = appliedSearch) => {
        setLoading(true);
        try {
            /* API 파라미터 구성 */
            const params: Record<string, string> = {
                page: String(page),
                size: String(PAGE_SIZE),
                sort: 'createdAt,desc',
            };

            /* 상태코드 — 숫자로 변환 가능한 경우만 전달 */
            if (search.f1 && !isNaN(Number(search.f1))) {
                params.httpStatus = search.f1;
            }
            /* 변경유형 */
            if (search.f2) {
                params.actionType = search.f2;
            }
            /* 사용자 */
            if (search.f3) {
                params.loginUser = search.f3;
            }
            /* 시작일 — YYYY-MM-DD → ISO OffsetDateTime */
            if (search.f4_from) {
                params.startDate = toStartIso(search.f4_from);
            }
            /* 종료일 — YYYY-MM-DD → ISO OffsetDateTime */
            if (search.f4_to) {
                params.endDate = toEndIso(search.f4_to);
            }

            const res = await api.get<PageResponse>('/transaction-logs', { params });
            setItems(res.data.content);
            setTotalElements(res.data.totalElements);
            /* totalPages 보정 — 서버 응답이 0이거나 누락된 경우 클라이언트에서 계산 */
            const safePages = res.data.totalPages > 0
                ? res.data.totalPages
                : Math.ceil((res.data.totalElements ?? 0) / PAGE_SIZE) || 1;
            setTotalPages(safePages);
            setCurrentPage(page);
        } finally {
            setLoading(false);
        }
    }, [appliedSearch]);

    /* 초기 로드 */
    useEffect(() => {
        fetchList(0, { f1: '', f2: '', f3: '', f4_from: '', f4_to: '' });
    // 마운트 시 1회만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── 상세 페이지 이동 ── */
    const goDetail = useCallback((id: number) => {
        router.push(`/admin/logs/transaction/${id}`);
    }, [router]);

    /* ── 검색 위젯 정의 ── */
    const SEARCH_WIDGET: SearchWidget = useMemo(() => ({
        type: 'search',
        widgetId: 'transaction-log-search',
        contentKey: 'transactionLogSearch',
        displayStyle: 'standard',
        rows: [
            {
                id: 'r1',
                cols: 4,
                fields: [
                    {
                        id: 'f1',
                        type: 'input',
                        label: '상태코드',
                        colSpan: 1,
                        placeholder: '예: 200',
                    },
                    {
                        id: 'f2',
                        type: 'input',
                        label: '변경유형',
                        colSpan: 1,
                        placeholder: 'CREATE / UPDATE / DELETE',
                    },
                    {
                        id: 'f3',
                        type: 'input',
                        label: '사용자',
                        colSpan: 1,
                        placeholder: '로그인 사용자',
                    },
                    {
                        id: 'f4',
                        type: 'dateRange',
                        label: '발생일',
                        label2: '종료일',
                        colSpan: 1,
                    },
                ],
            },
        ],
    }), []);

    /* ── 테이블 위젯 정의 ── */
    const TABLE_WIDGET: TableWidget = useMemo(() => ({
        type: 'table',
        widgetId: 'transaction-log-table',
        contentKey: 'transactionLogList',
        displayMode: 'pagination',
        pageSize: PAGE_SIZE,
        connectedSearchIds: ['transaction-log-search'],
        connectedSlug: '',
        columns: [
            {
                id: 'c1',
                header: '발생일시',
                accessor: 'createdAt',
                cellType: 'text',
                align: 'center',
                sortable: false,
                width: 160,
            },
            {
                id: 'c2',
                header: '상태코드',
                accessor: 'httpStatus',
                cellType: 'text',
                align: 'center',
                sortable: false,
                width: 90,
            },
            {
                id: 'c3',
                header: '메서드',
                accessor: 'method',
                cellType: 'text',
                align: 'center',
                sortable: false,
                width: 80,
            },
            {
                id: 'c4',
                header: '변경유형',
                accessor: 'actionType',
                cellType: 'text',
                align: 'center',
                sortable: false,
                width: 100,
            },
            {
                id: 'c5',
                header: '요청 URL',
                accessor: 'requestUrl',
                cellType: 'text',
                align: 'left',
                sortable: false,
            },
            {
                id: 'c6',
                header: '처리시간(ms)',
                accessor: 'durationMs',
                cellType: 'text',
                align: 'center',
                sortable: false,
                width: 110,
            },
            {
                id: 'c7',
                header: '요청자 IP',
                accessor: 'clientIp',
                cellType: 'text',
                align: 'center',
                sortable: false,
                width: 120,
            },
            {
                id: 'c8',
                header: '사용자',
                accessor: 'loginUser',
                cellType: 'text',
                align: 'center',
                sortable: false,
                width: 150,
            },
            {
                id: 'c9',
                header: '상세',
                accessor: '_actions',
                cellType: 'actions',
                align: 'center',
                sortable: false,
                actions: ['edit'],
                width: 70,
            },
        ],
    }), []);

    /* ── 검색 핸들러 ── */
    const handleSearchChange = useCallback((fieldId: string, value: string) => {
        setSearchValues(prev => ({ ...prev, [fieldId]: value }));
    }, []);

    const handleSearch = useCallback(() => {
        const nextSearch = { ...searchValues };
        setAppliedSearch(nextSearch);
        fetchList(0, nextSearch);
    }, [searchValues, fetchList]);

    const handleReset = useCallback(() => {
        const empty = { f1: '', f2: '', f3: '', f4_from: '', f4_to: '' };
        setSearchValues(empty);
        setAppliedSearch(empty);
        fetchList(0, empty);
    }, [fetchList]);

    /* ── 페이지 변경 핸들러 ── */
    const handlePageChange = useCallback((page: number) => {
        fetchList(page, appliedSearch);
    }, [fetchList, appliedSearch]);

    /* ── 테이블 액션 핸들러 — 상세 버튼 클릭 시 상세 페이지 이동 ── */
    const handlers: TableActionHandlers = useMemo(() => ({
        onEdit: (row) => {
            const id = row._id as number;
            if (id) goDetail(id);
        },
    }), [goDetail]);

    /* ── 테이블 렌더링용 데이터 변환 ── */
    const tableData = useMemo(
        () => items.map(item => ({
            _id:        item.id,
            /* 발생일시 — ISO 문자열에서 앞 19자(YYYY-MM-DD HH:mm:ss) 추출 */
            createdAt:  item.createdAt ? item.createdAt.slice(0, 19).replace('T', ' ') : '-',
            httpStatus: String(item.httpStatus),
            method:     item.method     ?? '-',
            actionType: item.actionType ?? '-',
            requestUrl: item.requestUrl ?? '-',
            durationMs: item.durationMs != null ? String(item.durationMs) : '-',
            clientIp:   item.clientIp   ?? '-',
            loginUser:  item.loginUser  ?? '-',
        })) as unknown as Record<string, unknown>[],
        [items],
    );

    return (
        <PageLayout mode="live">
            {/* 검색 위젯 */}
            <GridCell colSpan={12} rowSpan={2}>
                <WidgetRenderer
                    mode="live"
                    widget={SEARCH_WIDGET}
                    contentColSpan={12}
                    searchValues={searchValues}
                    onSearchChange={handleSearchChange}
                    onSearch={handleSearch}
                    onReset={handleReset}
                />
            </GridCell>

            {/* 테이블 위젯 — 서버 페이징 */}
            <GridCell colSpan={12} rowSpan={15}>
                <WidgetRenderer
                    mode="live"
                    widget={TABLE_WIDGET}
                    contentColSpan={12}
                    tableData={tableData}
                    tableLoading={loading}
                    totalElements={totalElements}
                    totalPages={totalPages}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                    handlers={handlers}
                />
            </GridCell>
        </PageLayout>
    );
}
