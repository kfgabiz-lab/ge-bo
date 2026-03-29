'use client';

import { X } from 'lucide-react';

export interface FieldTypeItem {
    type: string;
    label: string;
    desc: string;
    defaultColSpan?: number;
}

interface FieldPickerTypeListProps {
    /** 표시할 필드 유형 목록 */
    types: FieldTypeItem[];
    /** 유형 선택 핸들러 */
    onSelect: (type: string) => void;
    /** 취소 핸들러 */
    onCancel: () => void;
}

/**
 * 필드 유형 선택 목록 — 라벨 입력 이전 단계 (유형 선택 화면)
 * @example
 * <FieldPickerTypeList types={FIELD_TYPES} onSelect={selectFieldType} onCancel={cancelAddField} />
 */
export const FieldPickerTypeList = ({ types, onSelect, onCancel }: FieldPickerTypeListProps) => (
    <>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-2 pb-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">필드 유형 선택</span>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
            </button>
        </div>

        {/* 유형 목록 */}
        {types.map(ft => (
            <button
                key={ft.type}
                onClick={() => onSelect(ft.type)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-white hover:shadow-sm text-left transition-all"
            >
                <div>
                    <span className="text-xs font-semibold text-slate-700">{ft.label}</span>
                    <span className="text-[10px] text-slate-400 ml-2">{ft.desc}</span>
                </div>
                {ft.defaultColSpan !== undefined && (
                    <span className="text-[10px] text-slate-400">×{ft.defaultColSpan}</span>
                )}
            </button>
        ))}
    </>
);
