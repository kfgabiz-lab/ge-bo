'use client';

export interface ValidationValues {
    required: boolean;
    minLength?: number;
    maxLength?: number;
    pattern: string;
    patternDesc: string;
    minSelect?: number;
    maxSelect?: number;
}

interface ValidationSectionProps {
    /** 필드 유형 (input/checkbox 등에 따라 표시 항목 결정) */
    fieldType: string | null;
    /** 현재 값 */
    values: ValidationValues;
    /** 변경 핸들러 */
    onChange: (updates: Partial<ValidationValues>) => void;
}

/**
 * 필수항목 토글 + 필드 유형별 Validation 입력 섹션
 * - input: 최소/최대 글자, 정규식 패턴
 * - checkbox: 최소/최대 선택 수
 * @example
 * <ValidationSection fieldType={pendingType} values={validation} onChange={setValidation} />
 */
export const ValidationSection = ({ fieldType, values, onChange }: ValidationSectionProps) => (
    <div className="space-y-2">
        {/* 필수 항목 토글 (list 스타일 통일) */}
        <div className="flex items-center justify-between px-1 py-1">
            <span className="text-[10px] font-medium text-slate-500">필수 항목</span>
            <button
                type="button"
                onClick={() => onChange({ required: !values.required })}
                className={`relative w-9 h-5 rounded-full transition-colors ${values.required ? 'bg-slate-900' : 'bg-slate-300'}`}
            >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${values.required ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
        </div>

        {/* input 전용: 최소/최대 글자, 정규식 */}
        {fieldType === 'input' && (
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Validation</p>
                <div className="grid grid-cols-2 gap-1.5">
                    <div>
                        <label className="text-[10px] text-slate-500 mb-0.5 block">최소 글자</label>
                        <input
                            type="number"
                            min={0}
                            value={values.minLength ?? ''}
                            onChange={e => onChange({ minLength: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 mb-0.5 block">최대 글자</label>
                        <input
                            type="number"
                            min={0}
                            value={values.maxLength ?? ''}
                            onChange={e => onChange({ maxLength: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] text-slate-500 mb-0.5 block">정규식 패턴</label>
                    <input
                        type="text"
                        value={values.pattern}
                        onChange={e => onChange({ pattern: e.target.value })}
                        placeholder="예: ^[0-9]+$"
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none"
                    />
                </div>
                {values.pattern && (
                    <div>
                        <label className="text-[10px] text-slate-500 mb-0.5 block">패턴 설명</label>
                        <input
                            type="text"
                            value={values.patternDesc}
                            onChange={e => onChange({ patternDesc: e.target.value })}
                            placeholder="예: 숫자만 입력"
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                        />
                    </div>
                )}
            </div>
        )}

        {/* checkbox 전용: 최소/최대 선택 수 */}
        {fieldType === 'checkbox' && (
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">선택 제한</p>
                <div className="grid grid-cols-2 gap-1.5">
                    <div>
                        <label className="text-[10px] text-slate-500 mb-0.5 block">최소 선택</label>
                        <input
                            type="number"
                            min={0}
                            value={values.minSelect ?? ''}
                            onChange={e => onChange({ minSelect: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 mb-0.5 block">최대 선택</label>
                        <input
                            type="number"
                            min={0}
                            value={values.maxSelect ?? ''}
                            onChange={e => onChange({ maxSelect: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                        />
                    </div>
                </div>
            </div>
        )}
    </div>
);
