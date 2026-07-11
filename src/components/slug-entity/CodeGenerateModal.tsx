'use client';

/**
 * Slug Entity 기반 Java 코드 자동생성 — 미리보기 모달
 * - "파일생성" 버튼 클릭 → POST /slug-entity/{id}/generate-preview 로 받은
 *   6개 파일(+DDL) 코드를 파일명 탭 전환 방식으로 보여준다.
 * - [저장] 클릭 시 이 미리보기 데이터를 그대로 재전송한다. (서버가 다시 생성하지 않음)
 */

import React, { useState } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import api, { getApiErrorMessage } from '@/lib/api';

/* ── generate-preview 응답 타입 (BE SlugEntityCodePreviewResponse와 동일) ── */
export interface SlugEntityCodePreviewResponse {
    slugEntityId: number;
    slug: string;
    tableName: string;
    className: string;

    entityFileName: string;
    entityCode: string;

    requestFileName: string;
    requestCode: string;

    responseFileName: string;
    responseCode: string;

    repositoryFileName: string;
    repositoryCode: string;

    serviceFileName: string;
    serviceCode: string;

    controllerFileName: string;
    controllerCode: string;

    /** 참고용 CREATE TABLE DDL 문자열 — 실제로 실행되지 않는다. */
    ddl: string | null;
}

/* ── generate-save 응답 타입 (BE SlugEntityCodeSaveResponse와 동일) ── */
export interface SlugEntityCodeSaveResponse {
    /** 실제로 기록된 파일들의 절대경로 */
    writtenFilePaths: string[];
    /** 기존 파일을 덮어쓰기 전 생성된 백업 파일 절대경로 */
    backupFilePaths: string[];
}

/* ── 탭 1개 정보 ── */
interface CodeTab {
    key: string;
    label: string;
    fileName: string;
    code: string;
}

interface Props {
    entityId: number;
    preview: SlugEntityCodePreviewResponse;
    onClose: () => void;
    /** 저장 성공 시 결과(생성된 파일 경로 목록)를 부모로 전달 — 부모가 이 모달을 닫고 결과 모달을 연다 */
    onSaved: (result: SlugEntityCodeSaveResponse) => void;
}

export function CodeGenerateModal({ entityId, preview, onClose, onSaved }: Props) {
    /* 6개 파일 + DDL(있으면 참고용 7번째) 탭 구성 */
    const tabs: CodeTab[] = [
        { key: 'entity',     label: 'Entity',     fileName: preview.entityFileName,     code: preview.entityCode },
        { key: 'request',    label: 'Request',    fileName: preview.requestFileName,    code: preview.requestCode },
        { key: 'response',   label: 'Response',   fileName: preview.responseFileName,   code: preview.responseCode },
        { key: 'repository', label: 'Repository', fileName: preview.repositoryFileName, code: preview.repositoryCode },
        { key: 'service',    label: 'Service',    fileName: preview.serviceFileName,    code: preview.serviceCode },
        { key: 'controller', label: 'Controller', fileName: preview.controllerFileName, code: preview.controllerCode },
        ...(preview.ddl ? [{ key: 'ddl', label: 'DDL (참고)', fileName: '실행되지 않는 참고용 DDL', code: preview.ddl }] : []),
    ];

    const [activeTab, setActiveTab] = useState(tabs[0].key);
    const [saving, setSaving]       = useState(false);

    const activeTabData = tabs.find(t => t.key === activeTab) ?? tabs[0];

    /* 저장 — 미리보기에서 받은 코드를 그대로 재전송 (재생성하지 않음, DDL은 저장 대상 아님) */
    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await api.post<SlugEntityCodeSaveResponse>(`/slug-entity/${entityId}/generate-save`, {
                className:          preview.className,
                entityFileName:     preview.entityFileName,
                entityCode:         preview.entityCode,
                requestFileName:    preview.requestFileName,
                requestCode:        preview.requestCode,
                responseFileName:   preview.responseFileName,
                responseCode:       preview.responseCode,
                repositoryFileName: preview.repositoryFileName,
                repositoryCode:     preview.repositoryCode,
                serviceFileName:    preview.serviceFileName,
                serviceCode:        preview.serviceCode,
                controllerFileName: preview.controllerFileName,
                controllerCode:     preview.controllerCode,
            });
            onSaved(res.data);
        } catch (err: unknown) {
            /* 저장 실패 시 모달은 그대로 유지 — 재시도 가능하게 */
            toast.error(getApiErrorMessage(err, '파일 저장 중 오류가 발생했습니다.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Java 코드 생성 미리보기</h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {preview.className} · table: <span className="font-mono">{preview.tableName}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-all">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                {/* 파일명 탭 */}
                <div className="px-6 pt-4 shrink-0">
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit flex-wrap">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 코드 영역 — 다크 배경 코드 미리보기 (templates/make 생성 미리보기 스타일 재사용) */}
                <div className="px-6 py-4 flex-1 overflow-hidden flex flex-col min-h-0">
                    <p className="text-[11px] text-slate-400 font-mono mb-2">{activeTabData.fileName}</p>
                    <div className="bg-[#161929] rounded-xl p-5 overflow-auto flex-1 min-h-[300px]">
                        <pre className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre">{activeTabData.code}</pre>
                    </div>
                </div>

                {/* 푸터 */}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50/50 rounded-b-xl shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50">
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md disabled:opacity-60"
                    >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
}
