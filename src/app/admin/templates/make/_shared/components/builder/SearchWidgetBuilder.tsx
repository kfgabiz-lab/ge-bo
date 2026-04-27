'use client';

import { SearchBuilder } from '../SearchBuilder';
import type { SearchWidget } from '../renderer/types';

/**
 * SearchWidgetBuilder — 검색 위젯 전용 설정 빌더
 * WidgetBuilder의 인라인 SearchWidgetPanel을 추출함.
 */

interface SearchWidgetBuilderProps {
    widget: SearchWidget;
    onChange: (w: SearchWidget) => void;
}

export function SearchWidgetBuilder({ widget, onChange }: SearchWidgetBuilderProps) {
    const displayStyle = widget.displayStyle ?? 'standard';

    return (
        <div className="space-y-2 pt-1">
            {/* 레이아웃 스타일 선택 */}
            <div>
                <label className="text-[10px] font-medium text-slate-500 mb-1 block">검색 스타일</label>
                <div className="flex gap-1">
                    {(['standard', 'simple'] as const).map(style => (
                        <button
                            key={style}
                            onClick={() => {
                                if (style === 'simple') {
                                    /* 심플버전 전환: 모든 행의 필드를 1개 행으로 합치기 */
                                    const allFields = widget.rows.flatMap(r => r.fields);
                                    const firstRowId = widget.rows[0]?.id ?? `row-${Date.now()}`;
                                    onChange({
                                        ...widget,
                                        displayStyle: 'simple',
                                        rows: [{ id: firstRowId, cols: 5, fields: allFields }],
                                    });
                                } else {
                                    onChange({ ...widget, displayStyle: style });
                                }
                            }}
                            className={`flex-1 py-1.5 text-[11px] font-medium rounded border transition-all ${
                                displayStyle === style
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {style === 'standard' ? '현재버전' : '심플버전'}
                        </button>
                    ))}
                </div>
            </div>

            {/* 컨텐츠 Key */}
            <div>
                <label className="text-[10px] font-medium text-slate-500 mb-1 block">Key <span className="text-red-400">*</span></label>
                <input
                    type="text"
                    value={widget.contentKey}
                    onChange={e => onChange({ ...widget, contentKey: e.target.value })}
                    placeholder="예: userSearch (페이지 내 고유)"
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-slate-900"
                />
            </div>

            {/* 검색 필드 구성 (SearchBuilder 재사용) */}
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-3 mb-1">검색 필드 구성</p>
            <SearchBuilder
                rows={widget.rows}
                onChange={rows => onChange({ ...widget, rows })}
            />
        </div>
    );
}
