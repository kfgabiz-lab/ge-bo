'use client';

import React, { useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useEntityStore } from '@/store/useEntityStore';

interface EntityInfoPopupProps {
    entityName: string;
    onClose: () => void;
}

export function EntityInfoPopup({ entityName, onClose }: EntityInfoPopupProps) {
    const { entities, fetchFields, isFieldsLoading } = useEntityStore();

    useEffect(() => {
        if (entityName) {
            fetchFields(entityName);
        }
    }, [entityName, fetchFields]);

    const selectedEntity = entities.find(e => e.entityName === entityName);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] mx-4 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* 헤더 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-bold text-slate-800 font-mono">{entityName}</h2>
                        {selectedEntity?.tableName && (
                            <span className="text-xs text-slate-400">{selectedEntity.tableName}</span>
                        )}
                        {selectedEntity?.fieldCount !== undefined && (
                            <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                                필드 {selectedEntity.fieldCount}개
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 바디 (필드 테이블) */}
                <div className="flex-1 overflow-auto bg-white p-4">
                    {isFieldsLoading ? (
                        <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
                            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                            <span className="text-sm">필드 정보 불러오는 중...</span>
                        </div>
                    ) : !selectedEntity?.fields || selectedEntity.fields.length === 0 ? (
                        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
                            조회 가능한 필드 정보가 없습니다.
                        </div>
                    ) : (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="text-left px-4 py-3 font-semibold text-slate-600 w-10 text-center">#</th>
                                        <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[140px]">필드명</th>
                                        <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[140px]">컬럼명</th>
                                        <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[120px]">Java 타입</th>
                                        <th className="text-center px-4 py-3 font-semibold text-slate-600 w-14">PK</th>
                                        <th className="text-center px-4 py-3 font-semibold text-slate-600 w-16">NULL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedEntity.fields.map((field, idx) => (
                                        <tr key={field.fieldName} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                                            <td className="px-4 py-2.5 text-center text-slate-400">{idx + 1}</td>
                                            <td className="px-4 py-2.5 font-mono font-medium text-slate-800">{field.fieldName}</td>
                                            <td className="px-4 py-2.5 font-mono text-slate-600">{field.columnName}</td>
                                            <td className="px-4 py-2.5 font-mono text-slate-600">{field.javaType}</td>
                                            <td className="px-4 py-2.5 text-center">
                                                {field.isId && (
                                                    <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-semibold">PK</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${field.isNullable
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
