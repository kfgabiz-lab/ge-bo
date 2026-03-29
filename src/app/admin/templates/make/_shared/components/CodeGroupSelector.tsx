'use client';

import { CodeGroupDef } from '../types';

interface CodeGroupSelectorProps {
    /** 공통코드 그룹 목록 */
    codeGroups: CodeGroupDef[];
    /** 로딩 중 여부 */
    codeGroupsLoading: boolean;
    /** 현재 선택된 groupCode */
    value: string;
    /**
     * 코드 그룹 선택 변경 핸들러
     * @param groupCode 선택된 groupCode
     * @param options 선택된 그룹의 활성 옵션 목록 ("name:code" 형식)
     */
    onChange: (groupCode: string, options?: string[]) => void;
}

/**
 * 공통코드 그룹 선택 UI — 드롭다운 + 활성 항목 수 표시
 * @example
 * <CodeGroupSelector
 *   codeGroups={codeGroups} codeGroupsLoading={loading}
 *   value={selectedCode} onChange={(code, opts) => { setCode(code); setOptions(opts); }} />
 */
export const CodeGroupSelector = ({
    codeGroups, codeGroupsLoading, value, onChange,
}: CodeGroupSelectorProps) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-slate-500 block">코드 그룹</label>

        {codeGroupsLoading ? (
            <p className="text-[10px] text-slate-400 text-center py-2">불러오는 중...</p>
        ) : codeGroups.length === 0 ? (
            <p className="text-[10px] text-slate-400 text-center py-2">등록된 공통코드가 없습니다</p>
        ) : (
            <select
                value={value}
                onChange={e => {
                    const grp = codeGroups.find(g => g.groupCode === e.target.value);
                    /* 활성 항목을 "name:code" 형식으로 변환 */
                    const opts = grp?.details.filter(d => d.active).map(d => `${d.name}:${d.code}`);
                    onChange(e.target.value, opts);
                }}
                className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900 bg-white"
            >
                <option value="">그룹 선택</option>
                {codeGroups.map(g => (
                    <option key={g.groupCode} value={g.groupCode}>
                        {g.groupName} ({g.groupCode})
                    </option>
                ))}
            </select>
        )}

        {/* 선택된 그룹의 활성 항목 수 표시 */}
        {value && (
            <p className="text-[10px] text-slate-500">
                활성 항목: {codeGroups.find(g => g.groupCode === value)?.details.filter(d => d.active).length ?? 0}개
            </p>
        )}
    </div>
);
