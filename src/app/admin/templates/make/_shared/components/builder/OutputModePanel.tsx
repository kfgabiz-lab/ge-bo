'use client';

/**
 * 출력 모드 탭 + LayerPopup 설정 패널 공통 컴포넌트
 *
 * 상세페이지 | LayerPopup 탭과 팝업 설정(유형/제목/너비)을 담당한다.
 * quick-detail / widget 빌더에서 동일하게 사용한다.
 *
 * 사용법:
 *   const om = useOutputMode();
 *   <OutputModePanel
 *     outputMode={om.outputMode}
 *     layerType={om.layerType}
 *     layerTitle={om.layerTitle}
 *     layerWidth={om.layerWidth}
 *     onOutputModeChange={om.setOutputMode}
 *     onLayerTypeChange={om.setLayerType}
 *     onLayerTitleChange={om.setLayerTitle}
 *     onLayerWidthChange={om.setLayerWidth}
 *   />
 */

import { FileText, LayoutTemplate, PanelRight } from 'lucide-react';
import type { LayerType, LayerWidth } from '../../types';
import type { OutputMode } from '../../hooks/useOutputMode';
import { inputCls, selectCls } from '../../styles';
import { SelectArrow } from '../SelectArrow';

const LAYER_WIDTH_OPTIONS: { value: LayerWidth; label: string }[] = [
    { value: 'sm', label: 'Small — 380px' },
    { value: 'md', label: 'Medium — 672px' },
    { value: 'lg', label: 'Large — 768px' },
    { value: 'xl', label: 'XLarge — 896px' },
];

interface OutputModePanelProps {
    outputMode: OutputMode;
    /** page 모드 전용 제목 */
    pageTitle: string;
    layerType: LayerType;
    layerTitle: string;
    layerWidth: LayerWidth;
    onOutputModeChange: (v: OutputMode) => void;
    onPageTitleChange: (v: string) => void;
    onLayerTypeChange: (v: LayerType) => void;
    onLayerTitleChange: (v: string) => void;
    onLayerWidthChange: (v: LayerWidth) => void;
}

/**
 * 출력 모드 탭 + LayerPopup 설정 패널
 * 불러오기 드롭다운 바로 아래에 배치한다.
 */
export function OutputModePanel({
    outputMode, pageTitle, layerType, layerTitle, layerWidth,
    onOutputModeChange, onPageTitleChange, onLayerTypeChange, onLayerTitleChange, onLayerWidthChange,
}: OutputModePanelProps) {
    return (
        <>
            {/* 출력 모드 탭 */}
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/30 flex items-center gap-1">
                <button
                    onClick={() => onOutputModeChange('page')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md border transition-all ${
                        outputMode === 'page'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
                    }`}
                >
                    <FileText className="w-3 h-3" />상세페이지
                </button>
                <button
                    onClick={() => onOutputModeChange('layerpopup')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md border transition-all ${
                        outputMode === 'layerpopup'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                    }`}
                >
                    <LayoutTemplate className="w-3 h-3" />LayerPopup
                </button>
            </div>

            {/* 상세페이지 설정 — page 선택 시만 표시 */}
            {outputMode === 'page' && (
                <div className="border-b border-slate-100 bg-slate-50/30 px-3 py-3">
                    <label className="text-[10px] font-semibold text-slate-500 mb-1 block">페이지 제목</label>
                    <input
                        type="text"
                        value={pageTitle}
                        onChange={e => onPageTitleChange(e.target.value)}
                        placeholder="페이지 제목 입력"
                        className={inputCls}
                    />
                </div>
            )}

            {/* LayerPopup 설정 — layerpopup 선택 시만 표시 */}
            {outputMode === 'layerpopup' && (
                <div className="border-b border-slate-100 bg-blue-50/30 px-3 py-3 space-y-3">
                    {/* 팝업 유형 */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block">팝업 유형</label>
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
                            <button
                                onClick={() => onLayerTypeChange('center')}
                                className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded transition-all flex-1 justify-center ${
                                    layerType === 'center' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <LayoutTemplate className="w-3 h-3" />중앙 팝업
                            </button>
                            <button
                                onClick={() => onLayerTypeChange('right')}
                                className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded transition-all flex-1 justify-center ${
                                    layerType === 'right' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <PanelRight className="w-3 h-3" />우측 드로어
                            </button>
                        </div>
                    </div>

                    {/* 팝업 제목 */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-500 mb-1 block">팝업 제목</label>
                        <input
                            type="text"
                            value={layerTitle}
                            onChange={e => onLayerTitleChange(e.target.value)}
                            placeholder="팝업 제목 입력"
                            className={inputCls}
                        />
                    </div>

                    {/* 팝업 너비 — 중앙 팝업에서만 표시 */}
                    {layerType === 'center' && (
                        <div>
                            <label className="text-[10px] font-semibold text-slate-500 mb-1 block">팝업 너비</label>
                            <div className="relative">
                                <select
                                    value={layerWidth}
                                    onChange={e => onLayerWidthChange(e.target.value as LayerWidth)}
                                    className={selectCls}
                                >
                                    {LAYER_WIDTH_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                                <SelectArrow />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
