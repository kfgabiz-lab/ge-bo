'use client';

/**
 * 테이블 컬럼 상세 정보 (우측 패널)
 * - 선택된 테이블의 컬럼 목록을 테이블로 표시
 * - 컬럼명 / 데이터타입 / 길이 / NULL여부 / PK여부 / 기본값 / 설명
 */

import React from 'react';
import { useDatabaseStore } from '@/store/useDatabaseStore';

export function TableColumns() {
    const { selectedTable, isColumnsLoading } = useDatabaseStore();

    /* 테이블 미선택 */
    if (!selectedTable) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl h-full min-h-0 flex items-center justify-center">
                <p className="text-sm text-slate-400">왼쪽 목록에서 테이블을 선택하세요.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-full min-h-0 flex flex-col">
            {/* 헤더 */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <span className="text-sm font-bold text-slate-800 font-mono">{selectedTable.tableName}</span>
                {selectedTable.comment && (
                    <span className="text-xs text-slate-400">{selectedTable.comment}</span>
                )}
                <span className="text-xs text-slate-400 ml-auto">컬럼 {selectedTable.columnCount}개</span>
            </div>

            {/* 컬럼 테이블 */}
            <div className="flex-1 overflow-auto">
                {isColumnsLoading ? (
                    <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        <span className="text-xs">컬럼 정보 불러오는 중...</span>
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80 sticky top-0">
                                <th className="text-left px-4 py-2.5 font-semibold text-slate-600 w-8">#</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-slate-600 min-w-[140px]">컬럼명</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-slate-600 min-w-[110px]">데이터 타입</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-slate-600 w-16">길이</th>
                                <th className="text-center px-4 py-2.5 font-semibold text-slate-600 w-14">NULL</th>
                                <th className="text-center px-4 py-2.5 font-semibold text-slate-600 w-12">PK</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-slate-600 min-w-[120px]">기본값</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">설명</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedTable.columns.map((col, idx) => (
                                <tr key={col.columnName} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                    {/* 순번 */}
                                    <td className="px-4 py-2.5 text-slate-400">{idx + 1}</td>

                                    {/* 컬럼명 — PK는 굵게 */}
                                    <td className="px-4 py-2.5 font-mono font-medium text-slate-800">
                                        {col.columnName}
                                    </td>

                                    {/* 데이터 타입 */}
                                    <td className="px-4 py-2.5 font-mono text-slate-600">
                                        {col.dataType}
                                    </td>

                                    {/* 길이 */}
                                    <td className="px-4 py-2.5 text-slate-500 font-mono">
                                        {col.length ?? <span className="text-slate-300">—</span>}
                                    </td>

                                    {/* NULL 여부 */}
                                    <td className="px-4 py-2.5 text-center">
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                                            col.isNullable
                                                ? 'bg-slate-100 text-slate-400'
                                                : 'bg-red-50 text-red-500 font-semibold'
                                        }`}>
                                            {col.isNullable ? 'Y' : 'N'}
                                        </span>
                                    </td>

                                    {/* PK */}
                                    <td className="px-4 py-2.5 text-center">
                                        {col.isPrimaryKey && (
                                            <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-semibold">PK</span>
                                        )}
                                    </td>

                                    {/* 기본값 */}
                                    <td className="px-4 py-2.5 font-mono text-slate-500">
                                        {col.defaultValue ?? <span className="text-slate-300">—</span>}
                                    </td>

                                    {/* 설명 */}
                                    <td className="px-4 py-2.5 text-slate-500">
                                        {col.comment ?? <span className="text-slate-300">—</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
