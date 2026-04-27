'use client';

/**
 * FormRenderer — Form 위젯 렌더러 (CSS Grid 12칸 레이아웃)
 *
 * - preview: disabled 필드 (빌더 미리보기)
 * - live: 인터랙티브 입력 (실제 페이지용)
 *
 * 필드 렌더링은 FieldRenderer(공통)를 재사용한다.
 * 각 필드의 colSpan / rowSpan으로 그리드 내 위치와 크기를 결정한다.
 *
 * 사용법:
 *   // preview
 *   <FormRenderer mode="preview" fields={widget.fields} codeGroups={codeGroups} />
 *
 *   // live
 *   <FormRenderer
 *     mode="live"
 *     fields={widget.fields}
 *     codeGroups={codeGroups}
 *     values={formValues}
 *     onChangeValues={(fieldId, v) => updateFormValue(fieldId, v)}
 *   />
 */

import React from 'react';
import type { FormFieldItem } from '../builder/FormBuilder';
import type { RendererMode } from './types';
import { FieldRenderer } from './FieldRenderer';
import type { CodeGroupDef, SearchFieldConfig } from '../../types';

interface FormRendererProps {
    mode: RendererMode;
    fields: FormFieldItem[];
    /** 폼 섹션 타이틀 — 1행 영역 상단에 표시 (선택) */
    title?: string;
    /** 타이틀 아래 설명 — 타이틀과 함께 1행 안에 표시 (선택) */
    description?: string;
    /** 테두리 표시 여부 (기본 true) */
    showBorder?: boolean;
    /** 바탕색 CSS 값 ('none' 또는 미설정 시 투명) */
    bgColor?: string;
    /** 부모 위젯 colSpan — 그리드 열 수를 결정 (기본 12) */
    contentColSpan?: number;
    /** 공통코드 그룹 목록 — select 필드 옵션 렌더링에 사용 */
    codeGroups?: CodeGroupDef[];
    /** 필드별 입력값 — live 모드에서 외부 상태 관리 (fieldId → value) */
    values?: Record<string, string>;
    /** 필드값 변경 핸들러 — live 모드에서 외부로 값 전달 */
    onChangeValues?: (fieldId: string, value: string) => void;
    /* ── 파일/이미지/비디오 전용 (live 모드) ── */
    /** 새로 선택한 파일 목록 (fieldId → File[]) */
    fileValues?: Record<string, File[]>;
    /** 기존 파일 메타 (fieldId → 메타 배열) */
    existingFileMeta?: Record<string, { id: number; origName: string; fileSize: number }[]>;
    /** 이미지 blob URL 캐시 (fileId → blob URL) */
    imgBlobUrls?: Record<number, string>;
    /** 파일 변경 핸들러 */
    onFileChange?: (fieldId: string, files: File[]) => void;
    /** 기존 파일 제거 핸들러 */
    onRemoveExisting?: (fieldId: string, fileId: number) => void;
}

export function FormRenderer({
    mode,
    fields,
    title,
    description,
    showBorder = true,
    bgColor,
    contentColSpan = 12,
    codeGroups = [],
    values = {},
    onChangeValues,
    fileValues,
    existingFileMeta,
    imgBlobUrls,
    onFileChange,
    onRemoveExisting,
}: FormRendererProps) {
    const isPreview = mode === 'preview';

    if (!fields.length) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <span className="text-[10px] text-slate-300 italic">필드를 추가하세요</span>
            </div>
        );
    }

    /* SpaceRenderer와 동일 패턴 — 테두리/바탕색 적용 */
    const wrapperStyle: React.CSSProperties = {
        backgroundColor: (!bgColor || bgColor === 'none') ? undefined : bgColor,
    };
    /* 폼형 레이아웃 템플릿 FormSection 스타일 기준 */
    const wrapperCls = `w-full h-full rounded overflow-auto ${showBorder ? 'border border-slate-200' : ''}`;

    return (
        <div className={wrapperCls} style={wrapperStyle}>
            {/* 타이틀+설명 — 1행(68px) 고정 높이 안에 세로 중앙 정렬 */}
            {title && (
                <div className="px-6 flex flex-col justify-center" style={{ height: '68px' }}>
                    <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                    {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
                </div>
            )}
            <div
                className={`w-full ${title ? 'px-6 pb-6 pt-0' : 'p-6'}`}
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${contentColSpan}, 1fr)`,
                    gap: '8px',
                    gridAutoRows: '68px',
                }}
            >
                {fields.map(f => (
                    <div
                        key={f.id}
                        className="flex flex-col h-full"
                        style={{
                            gridColumn: `span ${Math.min(f.colSpan, contentColSpan)}`,
                            gridRow: `span ${f.rowSpan}`,
                        }}
                    >
                        {/* 라벨 */}
                        {f.label && (
                            <label className="block text-xs font-medium text-slate-700 mb-1 flex-shrink-0">
                                {f.label}
                                {f.required && <span className="text-red-500 ml-0.5">*</span>}
                            </label>
                        )}

                        {/* 필드 렌더링 — FieldRenderer 공통 컴포넌트 재사용 */}
                        <div className="flex-1 min-h-0">
                            <FieldRenderer
                                mode={mode}
                                field={f as unknown as SearchFieldConfig}
                                codeGroups={codeGroups}
                                value={values[f.id] ?? ''}
                                onChange={isPreview ? undefined : v => onChangeValues?.(f.id, v)}
                                fileList={fileValues?.[f.id]}
                                existingFileMeta={existingFileMeta?.[f.id]}
                                imgBlobUrls={imgBlobUrls}
                                onFileChange={isPreview ? undefined : files => onFileChange?.(f.id, files)}
                                onRemoveExisting={isPreview ? undefined : fileId => onRemoveExisting?.(f.id, fileId)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
