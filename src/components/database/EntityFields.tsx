'use client';

/**
 * 엔티티 필드 상세 정보 (우측 패널)
 * - 선택된 엔티티의 필드 목록을 테이블로 표시
 * - 필드명 / 컬럼명 / Java 타입 / PK 여부 / Nullable 여부
 */

import React from 'react';
import { useEntityStore } from '@/store/useEntityStore';

export function EntityFields() {
    const { selectedEntity, isFieldsLoading } = useEntityStore();

    /* 엔티티 미선택 */
    if (!selectedEntity) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl h-full min-h-0 flex items-center justify-center">
                <p className="text-sm text-slate-400">왼쪽 목록에서 엔티티를 선택하세요.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-full min-h-0 flex flex-col">
            {/* 헤더 */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <span className="text-sm font-bold text-slate-800 font-mono">{selectedEntity.entityName}</span>
                <span className="text-xs text-slate-400">{selectedEntity.tableName}</span>
                <span className="text-xs text-slate-400 ml-auto">필드 {selectedEntity.fieldCount}개</span>
            </div>

            {/* 필드 테이블 */}
            <div className="flex-1 overflow-auto">
                {isFieldsLoading ? (
                    <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        <span className="text-xs">필드 정보 불러오는 중...</span>
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80 sticky top-0">
                                <th className="text-left px-4 py-2.5 font-semibold text-slate-600 w-8">#</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-slate-600 min-w-[140px]">필드명</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-slate-600 min-w-[140px]">컬럼명</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-slate-600 min-w-[120px]">Java 타입</th>
                                <th className="text-center px-4 py-2.5 font-semibold text-slate-600 w-12">PK</th>
                                <th className="text-center px-4 py-2.5 font-semibold text-slate-600 w-16">NULL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedEntity.fields.map((field, idx) => (
                                <tr key={field.fieldName} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                    {/* 순번 */}
                                    <td className="px-4 py-2.5 text-slate-400">{idx + 1}</td>

                                    {/* 필드명 */}
                                    <td className="px-4 py-2.5 font-mono font-medium text-slate-800">
                                        {field.fieldName}
                                    </td>

                                    {/* 컬럼명 */}
                                    <td className="px-4 py-2.5 font-mono text-slate-600">
                                        {field.columnName}
                                    </td>

                                    {/* Java 타입 */}
                                    <td className="px-4 py-2.5 font-mono text-slate-600">
                                        {field.javaType}
                                    </td>

                                    {/* PK */}
                                    <td className="px-4 py-2.5 text-center">
                                        {field.isId && (
                                            <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-semibold">PK</span>
                                        )}
                                    </td>

                                    {/* Nullable */}
                                    <td className="px-4 py-2.5 text-center">
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                                            field.isNullable
                                                ? 'bg-slate-100 text-slate-400'
                                                : 'bg-red-50 text-red-500 font-semibold'
                                        }`}>
                                            {field.isNullable ? 'Y' : 'N'}
                                        </span>
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
