'use client';

/**
 * Slug Entity 코드 저장 결과 알림 모달
 * - generate-save 성공 직후 CodeGenerateModal이 닫히고 이 모달이 열린다.
 * - bo-api 재기동 필요 안내 + 실제로 기록된 파일 경로 목록을 보여준다.
 */

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { SlugEntityCodeSaveResponse } from './CodeGenerateModal';

interface Props {
    result: SlugEntityCodeSaveResponse;
    onClose: () => void;
}

export function CodeSaveResultModal({ result, onClose }: Props) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col">

                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-base font-bold text-slate-900">파일 생성 완료</h2>
                    <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-all">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {/* 재기동 필요 안내 — 사용자가 놓치지 않도록 강조 표시 */}
                    <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-800 leading-relaxed">
                            <span className="font-bold">bo-api 재기동이 필요합니다.</span>
                            <br />
                            재기동 시 로컬 hibernate.ddl-auto 설정에 의해 DB 테이블이 자동 생성됩니다.
                        </p>
                    </div>

                    {/* 기록된 파일 경로 목록 */}
                    <div>
                        <p className="text-xs font-semibold text-slate-600 mb-1.5">
                            생성된 파일 ({result.writtenFilePaths.length}개)
                        </p>
                        <ul className="space-y-1 max-h-40 overflow-y-auto bg-slate-50 border border-slate-100 rounded-md px-3 py-2">
                            {result.writtenFilePaths.map(path => (
                                <li key={path} className="text-[11px] font-mono text-slate-600 break-all">{path}</li>
                            ))}
                        </ul>
                    </div>

                    {/* 백업된 파일 경로 목록 — 기존 파일을 덮어쓴 경우에만 표시 */}
                    {result.backupFilePaths.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-slate-600 mb-1.5">
                                백업된 기존 파일 ({result.backupFilePaths.length}개)
                            </p>
                            <ul className="space-y-1 max-h-32 overflow-y-auto bg-slate-50 border border-slate-100 rounded-md px-3 py-2">
                                {result.backupFilePaths.map(path => (
                                    <li key={path} className="text-[11px] font-mono text-slate-600 break-all">{path}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
}
