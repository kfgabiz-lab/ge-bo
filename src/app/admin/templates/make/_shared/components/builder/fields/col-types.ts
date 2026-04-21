/**
 * 컬럼 편집 컴포넌트 공통 타입 및 상수
 *
 * TableBuilder에서 사용하는 5개 컬럼 편집 컴포넌트가 공유하는 타입/상수.
 *
 * 사용법:
 *   import { ColEditProps, PRESET_COLORS, CUSTOM_ACTION_COLORS } from './col-types';
 */

import type { TableColumnConfig } from '../../../types';

/**
 * 컬럼 편집 컴포넌트 공통 props
 *
 * - edit 모드: values={col},       onChange={patch => updateColumn(col.id, patch)}
 * - add  모드: values={pendingCol}, onChange={patch => setPendingCol(prev => ({ ...prev!, ...patch }))}
 */
export interface ColEditProps {
    values: Partial<TableColumnConfig>;
    onChange: (patch: Partial<TableColumnConfig>) => void;
}

/** 배지 프리셋 색상 목록 */
export const PRESET_COLORS: { name: string; value: string }[] = [
    { name: '초록', value: 'emerald' }, { name: '파랑', value: 'blue' },
    { name: '노랑', value: 'amber' },   { name: '빨강', value: 'red' },
    { name: '보라', value: 'purple' },  { name: '회색', value: 'slate' },
    { name: '분홍', value: 'pink' },    { name: '하늘', value: 'sky' },
];

/** 커스텀 액션 버튼 색상 목록 */
export const CUSTOM_ACTION_COLORS: { value: string; label: string; cls: string }[] = [
    { value: 'slate',  label: '기본',  cls: 'bg-slate-500 hover:bg-slate-600 text-white' },
    { value: 'blue',   label: '파랑',  cls: 'bg-blue-500 hover:bg-blue-600 text-white' },
    { value: 'green',  label: '초록',  cls: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
    { value: 'red',    label: '빨강',  cls: 'bg-red-500 hover:bg-red-600 text-white' },
    { value: 'orange', label: '주황',  cls: 'bg-orange-500 hover:bg-orange-600 text-white' },
];
