'use client';

/**
 * MultiSelectBuilder — 다중선택(MultiSelect) 위젯 설정 빌더 공통 컴포넌트
 *
 * 설정 항목:
 *   - contentKey    : dataJson 저장 키 (영문 필수)
 *   - connectedSlug : 옵션 목록을 가져올 slug
 *   - title         : 위젯 상단 타이틀
 *   - description   : 타이틀 아래 설명
 *   - labelFields   : 표시 필드 — 쉼표 구분, ' > ' 연결 (예: "name,dept")
 *   - showBorder    : 테두리 표시 여부
 *   - bgColor       : 바탕색
 *
 * 사용법:
 *   <MultiSelectBuilder widget={widget} onChange={setWidget} slugOptions={slugOptions} />
 */

import { LABEL_CLS, INPUT_CLS } from './fields/_FieldBase';
import { ToggleRow } from './fields/_ToggleRow';
import { SlugSelectField } from './fields';
import { BG_COLOR_OPTIONS } from './SpaceBuilder';
import type { MultiSelectWidget } from '../renderer/types';

interface MultiSelectBuilderProps {
    widget: MultiSelectWidget;
    onChange: (w: MultiSelectWidget) => void;
    slugOptions: { id: number; slug: string; name: string }[];
}

export function MultiSelectBuilder({ widget, onChange, slugOptions }: MultiSelectBuilderProps) {
    return (
        <div className="space-y-3 pt-1">

            {/* Key | 연결 Slug */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className={LABEL_CLS}>Key <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        value={widget.contentKey}
                        onChange={e => onChange({ ...widget, contentKey: e.target.value })}
                        placeholder="예: multiSelect1 (페이지 내 고유)"
                        className={INPUT_CLS}
                    />
                </div>
                <SlugSelectField
                    value={widget.connectedSlug ?? ''}
                    onChange={slug => onChange({ ...widget, connectedSlug: slug })}
                    slugOptions={slugOptions}
                />
            </div>

            {/* 타이틀 | 설명 */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className={LABEL_CLS}>타이틀</label>
                    <input
                        type="text"
                        value={widget.title ?? ''}
                        onChange={e => onChange({ ...widget, title: e.target.value || undefined })}
                        placeholder="예: 담당자 선택"
                        className={INPUT_CLS}
                    />
                </div>
                <div>
                    <label className={LABEL_CLS}>설명</label>
                    <input
                        type="text"
                        value={widget.description ?? ''}
                        onChange={e => onChange({ ...widget, description: e.target.value || undefined })}
                        placeholder="예: 복수 선택 가능"
                        className={INPUT_CLS}
                    />
                </div>
            </div>

            {/* 표시 필드 */}
            <div>
                <label className={LABEL_CLS}>표시 필드 (labelFields) <span className="text-red-400">*</span></label>
                <input
                    type="text"
                    value={widget.labelFields}
                    onChange={e => onChange({ ...widget, labelFields: e.target.value })}
                    placeholder="쉼표 구분 (예: name,dept) — ' > '로 연결 표시"
                    className={INPUT_CLS}
                />
                <p className="text-[10px] text-slate-400 mt-0.5">예: name,dept → 홍길동 &gt; 개발팀</p>
            </div>

            {/* 테두리 | 바탕색 */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className={LABEL_CLS}>테두리</label>
                    <ToggleRow
                        label={widget.showBorder ?? true ? '표시' : '숨김'}
                        value={widget.showBorder ?? true}
                        onChange={v => onChange({ ...widget, showBorder: v })}
                    />
                </div>
                <div>
                    <label className={LABEL_CLS}>바탕색</label>
                    <select
                        value={widget.bgColor ?? 'none'}
                        onChange={e => onChange({ ...widget, bgColor: e.target.value })}
                        className={INPUT_CLS}
                    >
                        {BG_COLOR_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

        </div>
    );
}
