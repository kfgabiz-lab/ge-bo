'use client';

/**
 * MultiSelectBuilder — 다중선택(MultiSelect) 위젯 설정 빌더 공통 컴포넌트
 *
 * 연결된 slug에서 옵션 목록을 가져와 체크박스 드롭다운으로 다중 선택하는
 * 컨텐츠 컴포넌트 설정 패널.
 *
 * 설정 항목:
 *   - contentKey  : dataJson 저장 키 (영문 필수)
 *   - sourceSlug  : 옵션 목록을 가져올 slug
 *   - labelFields : 표시 필드 — 쉼표 구분, ' > ' 연결 (예: "name,dept")
 *   - valueField  : ID 필드 키 (기본: id)
 *   - title       : 위젯 상단 타이틀
 *   - placeholder : 토글 버튼 placeholder
 *   - showBorder  : 테두리 표시 여부
 *
 * 사용법:
 *   <MultiSelectBuilder widget={widget} onChange={setWidget} slugOptions={slugOptions} />
 */

import { LABEL_CLS, INPUT_CLS } from './fields/_FieldBase';
import { ToggleRow } from './fields/_ToggleRow';
import { SlugSelectField } from './fields';
import type { MultiSelectWidget } from '../renderer/types';

interface MultiSelectBuilderProps {
    widget: MultiSelectWidget;
    onChange: (w: MultiSelectWidget) => void;
    slugOptions: { id: number; slug: string; name: string }[];
}

export function MultiSelectBuilder({ widget, onChange, slugOptions }: MultiSelectBuilderProps) {
    return (
        <div className="space-y-5 pt-1">

            {/* ── 기본 설정 ── */}
            <section className="space-y-3">
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">기본 설정</h4>

                {/* contentKey */}
                <div>
                    <label className={LABEL_CLS}>데이터 키 (contentKey) <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        value={widget.contentKey}
                        onChange={e => onChange({ ...widget, contentKey: e.target.value })}
                        placeholder="dataJson 저장 키 (영문, 예: assignedUsers)"
                        className={INPUT_CLS}
                    />
                </div>

                {/* sourceSlug — 옵션 목록 출처 */}
                <SlugSelectField
                    value={widget.sourceSlug ?? ''}
                    onChange={slug => onChange({ ...widget, sourceSlug: slug })}
                    slugOptions={slugOptions}
                    label="옵션 출처 Slug"
                    required
                    emptyLabel="slug 선택"
                />

                {/* labelFields */}
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

                {/* valueField */}
                <div>
                    <label className={LABEL_CLS}>ID 필드 키 (valueField)</label>
                    <input
                        type="text"
                        value={widget.valueField ?? ''}
                        onChange={e => onChange({ ...widget, valueField: e.target.value || undefined })}
                        placeholder="id (기본값)"
                        className={INPUT_CLS}
                    />
                </div>
            </section>

            {/* ── 표시 설정 ── */}
            <section className="space-y-3">
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">표시 설정</h4>

                {/* title */}
                <div>
                    <label className={LABEL_CLS}>타이틀</label>
                    <input
                        type="text"
                        value={widget.title ?? ''}
                        onChange={e => onChange({ ...widget, title: e.target.value || undefined })}
                        placeholder="위젯 상단 타이틀 (예: 담당자 선택)"
                        className={INPUT_CLS}
                    />
                </div>

                {/* placeholder */}
                <div>
                    <label className={LABEL_CLS}>Placeholder</label>
                    <input
                        type="text"
                        value={widget.placeholder ?? ''}
                        onChange={e => onChange({ ...widget, placeholder: e.target.value || undefined })}
                        placeholder="항목을 선택하세요"
                        className={INPUT_CLS}
                    />
                </div>

                {/* showBorder */}
                <div>
                    <label className={LABEL_CLS}>테두리</label>
                    <ToggleRow
                        label={widget.showBorder !== false ? '표시' : '숨김'}
                        value={widget.showBorder !== false}
                        onChange={v => onChange({ ...widget, showBorder: v })}
                    />
                </div>
            </section>

        </div>
    );
}
