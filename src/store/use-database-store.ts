/**
 * 데이터베이스 테이블 조회 스토어
 * - 테이블 목록 / 선택 테이블 / 컬럼 정보 상태 관리
 * - API: GET /api/v1/database/tables
 *        GET /api/v1/database/tables/{tableName}/columns
 *
 * 사용법:
 *   const { tables, selectedTable, selectTable, fetchTables } = useDatabaseStore();
 */

import { create } from 'zustand';
import api from '@/lib/api';

/* ── 컬럼 정보 타입 (BE ColumnInfoResponse 와 1:1 대응) ── */
export interface ColumnInfo {
    columnName: string;
    dataType: string;
    length: number | null;
    isNullable: boolean;
    isPrimaryKey: boolean;
    defaultValue: string | null;
    comment: string | null;
}

/* ── 테이블 정보 타입 (BE TableInfoResponse 와 1:1 대응) ── */
export interface TableInfo {
    tableName: string;
    comment: string | null;
    columnCount: number;
    columns: ColumnInfo[];   // 선택 후 fetchColumns 호출 시 채워짐
}

/* ── 스토어 인터페이스 ── */
interface DatabaseStore {
    tables: TableInfo[];
    selectedTable: TableInfo | null;
    isLoading: boolean;
    isColumnsLoading: boolean;

    /** 테이블 선택: 선택 시 컬럼 정보 자동 로드 */
    selectTable: (table: TableInfo | null) => void;
    /** 테이블 목록 API 호출 */
    fetchTables: () => Promise<void>;
    /** 컬럼 정보 API 호출 (selectTable 내부에서 자동 호출) */
    fetchColumns: (tableName: string) => Promise<void>;
}

export const useDatabaseStore = create<DatabaseStore>((set, get) => ({
    tables: [],
    selectedTable: null,
    isLoading: false,
    isColumnsLoading: false,

    /* 테이블 선택 → 컬럼 정보 자동 로드 */
    selectTable: (table) => {
        if (!table) {
            set({ selectedTable: null });
            return;
        }
        /* 이미 컬럼 정보가 있으면 API 재호출 생략 */
        if (table.columns.length > 0) {
            set({ selectedTable: table });
            return;
        }
        set({ selectedTable: table });
        get().fetchColumns(table.tableName);
    },

    /* 테이블 목록 조회 */
    fetchTables: async () => {
        set({ isLoading: true });
        try {
            const res = await api.get<TableInfo[]>('/database/tables');
            /* columns는 선택 시 로드하므로 빈 배열로 초기화 */
            const tables = res.data.map(t => ({ ...t, columns: [] }));
            set({ tables });
        } finally {
            set({ isLoading: false });
        }
    },

    /* 특정 테이블의 컬럼 정보 조회 */
    fetchColumns: async (tableName: string) => {
        set({ isColumnsLoading: true });
        try {
            const res = await api.get<ColumnInfo[]>(`/database/tables/${tableName}/columns`);
            /* 선택된 테이블과 목록 양쪽 모두 columns 업데이트 */
            set(state => ({
                tables: state.tables.map(t =>
                    t.tableName === tableName ? { ...t, columns: res.data } : t
                ),
                selectedTable: state.selectedTable?.tableName === tableName
                    ? { ...state.selectedTable, columns: res.data }
                    : state.selectedTable,
            }));
        } finally {
            set({ isColumnsLoading: false });
        }
    },
}));
