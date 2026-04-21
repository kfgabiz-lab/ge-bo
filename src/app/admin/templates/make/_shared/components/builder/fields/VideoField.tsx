import React from 'react';
import { X } from 'lucide-react';
import { FieldEditProps } from './types';
import { FieldBase, INPUT_CLS, LABEL_CLS } from './_FieldBase';

/**
 * 확장자 태그 입력 컴포넌트 (내부용)
 */
const ExtensionTagInput = ({ extensions, onChange }: { extensions: string[]; onChange: (exts: string[]) => void }) => {
    const [input, setInput] = React.useState('');
    const [error, setError] = React.useState('');

    const addExt = () => {
        let ext = input.trim();
        if (!ext) return;
        if (!ext.startsWith('.')) ext = '.' + ext;
        if (!/^\.[a-zA-Z0-9]+$/.test(ext)) { setError('영문/숫자 확장자만 입력 가능합니다. (예: .jpg)'); return; }
        if (extensions.includes(ext)) { setError('이미 추가된 확장자입니다.'); return; }
        onChange([...extensions, ext]);
        setInput('');
        setError('');
    };

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-1">
                <input
                    type="text"
                    value={input}
                    onChange={e => { setInput(e.target.value); setError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExt(); } }}
                    placeholder=".jpg"
                    className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-slate-900"
                />
                <button type="button" onClick={addExt} disabled={!input.trim()} className="px-2 py-1 text-[10px] font-semibold bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-40 transition-all">추가</button>
            </div>
            {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
            {extensions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {extensions.map(ext => (
                        <span key={ext} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded font-mono border border-slate-200">
                            {ext}
                            <button type="button" onClick={() => onChange(extensions.filter(e => e !== ext))} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-2.5 h-2.5" /></button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * VideoField: 비디오 설정용 L3 컴포넌트
 */
export const VideoField = (props: FieldEditProps) => {
    const { values, onChange } = props;

    return (
        <FieldBase {...props} onChange={onChange} label={values.label} fieldKey={values.fieldKey} colSpan={values.colSpan} colSpanMode={props.colSpanMode} isPk={values.isPk}
                required={values.required}
        readonly={values.readonly}>
            <div className="space-y-3 pt-1 border-t border-slate-100 mt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">동영상 설정</p>

                {/* URL / 파일 업로드 탭 */}
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                        type="button"
                        onClick={() => onChange({
                            videoMode: 'url',
                            maxFileCount: undefined,
                            maxFileSizeMB: undefined,
                            maxTotalSizeMB: undefined,
                            fileTypeMode: undefined,
                            allowedExtensions: undefined
                        })}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${(values.videoMode ?? 'url') === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >URL (유튜브/Vimeo)</button>
                    <button
                        type="button"
                        onClick={() => onChange({
                            videoMode: 'file',
                            maxFileCount: 1,
                            maxFileSizeMB: 500,
                            maxTotalSizeMB: 500,
                            fileTypeMode: 'video',
                            allowedExtensions: []
                        })}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${values.videoMode === 'file' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >파일 직접 업로드</button>
                </div>

                {/* 파일 모드 상세 설정 */}
                {values.videoMode === 'file' && (
                    <div className="space-y-3 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-1">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] font-medium text-slate-500 mb-1 block">최대 파일 수</label>
                                <input
                                    type="number" min={1} max={20}
                                    value={values.maxFileCount ?? 1}
                                    onChange={e => onChange({ maxFileCount: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900 bg-white"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-500 mb-1 block">개당 최대 (MB)</label>
                                <input
                                    type="number" min={1}
                                    value={values.maxFileSizeMB ?? 500}
                                    onChange={e => {
                                        const v = Math.max(1, Number(e.target.value) || 1);
                                        const updates: Partial<typeof values> = { maxFileSizeMB: v };
                                        if ((values.maxTotalSizeMB ?? 500) < v) updates.maxTotalSizeMB = v;
                                        onChange(updates);
                                    }}
                                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900 bg-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-medium text-slate-500 mb-1 block">전체 최대 용량 (MB)</label>
                            <input
                                type="number" min={1}
                                value={values.maxTotalSizeMB ?? 500}
                                onChange={e => onChange({ maxTotalSizeMB: Math.max(Number(e.target.value) || 1, values.maxFileSizeMB ?? 500) })}
                                className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900 bg-white"
                            />
                        </div>

                        {/* 허용 파일 유형 */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-medium text-slate-500 block">허용 형식</label>
                            <div className="flex items-center gap-2 flex-wrap">
                                {(['video', '', 'custom'] as const).map(mode => (
                                    <label key={mode} className="flex items-center gap-1.5 cursor-pointer group">
                                        <input
                                            type="radio"
                                            checked={(values.fileTypeMode ?? 'video') === mode}
                                            onChange={() => onChange({ fileTypeMode: mode, allowedExtensions: [] })}
                                            className="w-3.5 h-3.5 text-slate-900 cursor-pointer accent-slate-900"
                                        />
                                        <span className={`text-[11px] font-medium transition-colors ${(values.fileTypeMode ?? 'video') === mode ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                            {mode === 'video' ? '동영상(기본)' : mode === '' ? '전체' : '커스텀'}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {(values.fileTypeMode ?? 'video') === 'video' && (
                                <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed bg-white border border-slate-200 px-2 py-1 rounded">mp4, mov, avi, mkv, webm, wmv, flv, m4v</p>
                            )}
                        </div>

                        {values.fileTypeMode === 'custom' && (
                            <ExtensionTagInput
                                extensions={values.allowedExtensions || []}
                                onChange={exts => onChange({ allowedExtensions: exts })}
                            />
                        )}
                    </div>
                )}
            </div>
        </FieldBase>
    );
};
