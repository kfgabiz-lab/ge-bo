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

import { useState, useEffect } from 'react';
import api from '@/lib/api';
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
    /* connectedSlug에서 가져온 필드 목록 (표시 필드 선택용) */
    const [fieldOptions, setFieldOptions] = useState<string[]>([]);

    /* 호출 slug 변경 시 해당 slug의 첫 번째 레코드 필드 목록 로드 */
    useEffect(() => {
        if (!widget.sourceSlug) {
            setFieldOptions([]);
            return;
        }
        api.get(`/page-data/${widget.sourceSlug}`, { params: { size: 1 } })
            .then(res => {
                const first = (res.data.content ?? [])[0] as { dataJson?: Record<string, unknown> } | undefined;
                if (!first?.dataJson) return;
                /* id 필드는 표시 필드로 사용하지 않으므로 제외 */
                const keys = Object.keys(first.dataJson).filter(k => k !== 'id');
                setFieldOptions(keys);
            })
            .catch(() => setFieldOptions([]));
    }, [widget.sourceSlug]);

    /* 필드 선택 시 labelFields에 쉼표로 추가 (중복 무시) */
    const handleFieldSelect = (field: string) => {
        const current = widget.labelFields ? widget.labelFields.split(',').map(f => f.trim()) : [];
        if (current.includes(field)) return;
        const next = [...current, field].join(',');
        onChange({ ...widget, labelFields: next });
    };

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
                    label="연결 Slug"
                    value={widget.connectedSlug ?? ''}
                    onChange={slug => onChange({ ...widget, connectedSlug: slug })}
                    slugOptions={slugOptions}
                />
            </div>

            {/* 호출 Slug | 표시 필드 */}
            <div className="grid grid-cols-2 gap-2">
                <SlugSelectField
                    label="호출 Slug"
                    value={widget.sourceSlug ?? ''}
                    onChange={slug => onChange({ ...widget, sourceSlug: slug })}
                    slugOptions={slugOptions}
                />
                <div>
                    <label className={LABEL_CLS}>표시 필드 <span className="text-red-400">*</span></label>
                    {/* 호출 slug의 필드 목록에서 선택 — 선택 시 labelFields에 쉼표로 추가 */}
                    <select
                        value=""
                        onChange={e => handleFieldSelect(e.target.value)}
                        disabled={fieldOptions.length === 0}
                        className={INPUT_CLS}
                    >
                        <option value="" disabled>
                            {fieldOptions.length === 0 ? '호출 Slug 선택 필요' : `필드 선택 (${widget.labelFields || '없음'})`}
                        </option>
                        {fieldOptions.map(f => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>
                </div>
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
