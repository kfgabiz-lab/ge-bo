'use client';

/**
 * CategoryBuilder — 카테고리 위젯 설정 빌더
 *
 * 빌더에서 카테고리 컨텐츠를 추가할 때 표시되는 설정 패널.
 * - dbSlug: 연결할 카테고리 데이터 slug
 * - depth: 이 위젯이 표시할 depth 번호 (1=대분류, 2=중분류, ...)
 * - parentWidgetId: 상위 depth 위젯 ID (선택 연동용)
 * - label: depth 레이블 (예: '대분류')
 * - allowCreate/Edit/Delete: CRUD 허용 여부
 * - showBorder: 테두리 표시 여부
 *
 * 사용법:
 *   <CategoryBuilder widget={categoryWidget} onChange={setWidget} categoryWidgets={[...]} />
 */

import React from 'react';
import { LABEL_CLS, INPUT_CLS } from './fields/_FieldBase';
import { ToggleRow } from './fields/_ToggleRow';
import type { CategoryWidget } from '../renderer/types';

export interface CategoryBuilderProps {
    widget: CategoryWidget;
    onChange: (w: CategoryWidget) => void;
    /** 현재 페이지에 있는 다른 카테고리 위젯 목록 — parentWidgetId 선택용 */
    categoryWidgets?: { widgetId: string; label?: string; depth: number }[];
}

export function CategoryBuilder({ widget, onChange, categoryWidgets = [] }: CategoryBuilderProps) {
    /** 상위로 연결 가능한 위젯 목록 — 자기 자신 제외, depth가 더 낮은 것만 */
    const parentCandidates = categoryWidgets.filter(
        w => w.widgetId !== widget.widgetId && w.depth < widget.depth
    );

    return (
        <div className="space-y-4 p-1">

            {/* dbSlug 설정 */}
            <div>
                <label className={LABEL_CLS}>데이터 Slug <span className="text-red-500">*</span></label>
                <input
                    type="text"
                    className={INPUT_CLS}
                    value={widget.dbSlug}
                    placeholder="예: category-menu"
                    onChange={e => onChange({ ...widget, dbSlug: e.target.value })}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                    page_data에 저장할 카테고리 그룹 slug (같은 카테고리 트리는 동일한 slug 사용)
                </p>
            </div>

            {/* depth 설정 */}
            <div>
                <label className={LABEL_CLS}>Depth (계층 번호)</label>
                <select
                    className={INPUT_CLS}
                    value={widget.depth}
                    onChange={e => onChange({ ...widget, depth: Number(e.target.value) })}
                >
                    <option value={1}>1 — 대분류 (루트)</option>
                    <option value={2}>2 — 중분류</option>
                    <option value={3}>3 — 소분류</option>
                    <option value={4}>4 — 세분류</option>
                </select>
            </div>

            {/* 상위 위젯 연결 — depth 2 이상에서만 의미 있음 */}
            {widget.depth > 1 && (
                <div>
                    <label className={LABEL_CLS}>상위 카테고리 위젯 연결</label>
                    <select
                        className={INPUT_CLS}
                        value={widget.parentWidgetId ?? ''}
                        onChange={e => onChange({ ...widget, parentWidgetId: e.target.value || undefined })}
                    >
                        <option value="">선택 안 함</option>
                        {parentCandidates.map(w => (
                            <option key={w.widgetId} value={w.widgetId}>
                                {w.label ? `${w.label} (depth ${w.depth})` : `위젯 ${w.widgetId} (depth ${w.depth})`}
                            </option>
                        ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                        선택 시 상위 위젯에서 선택한 항목 ID를 parentId로 필터링합니다
                    </p>
                </div>
            )}

            {/* depth 레이블 */}
            <div>
                <label className={LABEL_CLS}>레이블</label>
                <input
                    type="text"
                    className={INPUT_CLS}
                    value={widget.label ?? ''}
                    placeholder="예: 대분류, 중분류, 카테고리"
                    onChange={e => onChange({ ...widget, label: e.target.value || undefined })}
                />
            </div>

            {/* CRUD 허용 설정 */}
            <div className="space-y-1">
                <label className={LABEL_CLS}>CRUD 허용</label>
                <ToggleRow
                    label="등록 허용"
                    checked={widget.allowCreate ?? true}
                    onChange={v => onChange({ ...widget, allowCreate: v })}
                />
                <ToggleRow
                    label="수정 허용"
                    checked={widget.allowEdit ?? true}
                    onChange={v => onChange({ ...widget, allowEdit: v })}
                />
                <ToggleRow
                    label="삭제 허용"
                    checked={widget.allowDelete ?? true}
                    onChange={v => onChange({ ...widget, allowDelete: v })}
                />
            </div>

            {/* 테두리 표시 */}
            <ToggleRow
                label="테두리 표시"
                checked={widget.showBorder ?? true}
                onChange={v => onChange({ ...widget, showBorder: v })}
            />
        </div>
    );
}
