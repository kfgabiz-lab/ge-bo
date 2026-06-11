'use client';

import { Plus, X } from 'lucide-react';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';

interface OptionInputRowsProps {
    /** { text, value } 형식의 옵션 목록 */
    options: { text: string; value: string }[];
    /** 옵션 목록 변경 핸들러 */
    onChange: (options: { text: string; value: string }[]) => void;
    /**
     * 다국어 모드 — true 시 텍스트 입력란을 MessageKeySelector로 전환
     * 선택한 msgKey가 text 부분에 저장되고 렌더러에서 t(text)로 표시됨
     */
    i18nMode?: boolean;
    /** 현재 기본값으로 선택된 option value */
    defaultValue?: string;
    /** 기본값 변경 핸들러 */
    onDefaultChange?: (value: string) => void;
}

/**
 * text:value 형식의 옵션 입력 행 컴포넌트 (select/radio/checkbox 공통)
 * - 1개 이하일 때 삭제 버튼 disabled
 * - i18nMode=true: 텍스트 입력 → MessageKeySelector (다국어 키 선택)
 * @example <OptionInputRows options={opts} onChange={setOpts} i18nMode={i18nMode} />
 */
export const OptionInputRows = ({ options, onChange, i18nMode = false, defaultValue, onDefaultChange }: OptionInputRowsProps) => (
    <div className="space-y-1.5">
        {/* 기본값 열 헤더 — onDefaultChange가 있을 때만 표시 */}
        {onDefaultChange && (
            <div className="grid grid-cols-[1fr_auto_1fr_auto_auto] items-center gap-1">
                <span className="text-[10px] text-slate-400">텍스트</span>
                <span />
                <span className="text-[10px] text-slate-400">값</span>
                <span />
                <span className="text-[10px] text-slate-400 text-center w-8">기본</span>
            </div>
        )}
        {options.map((opt, i) => (
            <div key={i} className={`grid items-center gap-1 ${onDefaultChange ? 'grid-cols-[1fr_auto_1fr_auto_auto]' : 'grid-cols-[1fr_auto_1fr_auto]'}`}>
                {i18nMode ? (
                    <MessageKeySelector
                        value={opt.text}
                        onChange={key => onChange(options.map((o, j) => j === i ? { ...o, text: key } : o))}
                        resourceType="WORD"
                        size="sm"
                    />
                ) : (
                    <input
                        type="text"
                        placeholder="텍스트"
                        value={opt.text}
                        onChange={e => onChange(options.map((o, j) => j === i ? { ...o, text: e.target.value } : o))}
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900"
                    />
                )}
                <span className="text-slate-300 text-xs px-0.5">:</span>
                <input
                    type="text"
                    placeholder="값"
                    value={opt.value}
                    onChange={e => onChange(options.map((o, j) => j === i ? { ...o, value: e.target.value } : o))}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-slate-900"
                />
                <button
                    onClick={() => onChange(options.filter((_, j) => j !== i))}
                    disabled={options.length <= 1}
                    className="p-1 text-slate-400 hover:text-red-500 transition-all disabled:opacity-30"
                >
                    <X className="w-3 h-3" />
                </button>
                {/* 기본값 라디오버튼 — onDefaultChange가 있을 때만 표시 */}
                {onDefaultChange && (
                    <div className="flex justify-center w-8">
                        <input
                            type="radio"
                            name="option-default"
                            checked={defaultValue === opt.value}
                            onChange={() => onDefaultChange(opt.value)}
                            className="w-3.5 h-3.5 accent-slate-900 cursor-pointer"
                        />
                    </div>
                )}
            </div>
        ))}
        {/* 옵션 추가 버튼 */}
        <button
            onClick={() => onChange([...options, { text: '', value: '' }])}
            className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-slate-200 rounded text-[10px] font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all"
        >
            <Plus className="w-3 h-3" />옵션 추가
        </button>
    </div>
);

/**
 * string[] 형식("text:value") → { text, value }[] 변환
 * @example stringsToOpts(['전체:all']) // [{ text: '전체', value: 'all' }]
 */
export const stringsToOpts = (strs: string[]): { text: string; value: string }[] =>
    strs.map(s => {
        const idx = s.indexOf(':');
        return idx === -1 ? { text: s, value: s } : { text: s.slice(0, idx), value: s.slice(idx + 1) };
    });

/**
 * { text, value }[] → string[] 형식("text:value") 변환
 * @example optsToStrings([{ text: '전체', value: 'all' }]) // ['전체:all']
 */
export const optsToStrings = (opts: { text: string; value: string }[]): string[] =>
    opts.map(o => `${o.text.trim()}:${o.value.trim()}`);
