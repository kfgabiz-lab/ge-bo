'use client';

/**
 * ParamWithSaveField — 파라미터 입력 + 저장 체크박스 공통 컴포넌트
 *
 * 연결 타입(popup/path)이 설정된 경우 파라미터와 paramSave 여부를 함께 입력받는 UI.
 * CategoryBuilder 등록/수정 블록에서 공통으로 사용.
 *
 * 파라미터 형식: 쉼표 구분, dot notation 지원
 *   - "depth=4,name"            → depth 고정값 4, name은 row에서 동적 주입
 *   - "content1.field1=aaa"     → content1.field1 고정값 aaa
 *   - "content1.field2"         → field2를 row에서 동적 주입 (없으면 skip)
 *
 * paramSave 동작:
 *   - 미체크: 파라미터를 이동한 화면의 폼 필드에 값만 세팅
 *   - 체크: 값 세팅 + 해당 필드가 없으면 저장 버튼 클릭 시 해당 컨텐츠/상위에 저장
 *
 * 사용법:
 *   <ParamWithSaveField
 *     paramsValue={widget.createParams}
 *     paramSaveValue={widget.createParamSave}
 *     onParamsChange={val => onChange({ ...widget, createParams: val })}
 *     onParamSaveChange={val => onChange({ ...widget, createParamSave: val })}
 *   />
 */

import { LABEL_CLS, INPUT_CLS } from './fields/_FieldBase';

interface ParamWithSaveFieldProps {
    /** 현재 파라미터 문자열 값 */
    paramsValue?: string;
    /** 현재 저장 여부 */
    paramSaveValue?: boolean;
    /** 파라미터 변경 핸들러 — 빈 문자열이면 undefined 전달 */
    onParamsChange: (val: string | undefined) => void;
    /** 저장 변경 핸들러 — false면 undefined 전달 */
    onParamSaveChange: (val: boolean | undefined) => void;
}

export function ParamWithSaveField({
    paramsValue,
    paramSaveValue,
    onParamsChange,
    onParamSaveChange,
}: ParamWithSaveFieldProps) {
    return (
        <div className="mt-1.5 flex gap-2 items-end">
            <div className="flex-1">
                <label className={LABEL_CLS}>파라미터</label>
                <input
                    type="text"
                    value={paramsValue ?? ''}
                    onChange={e => onParamsChange(e.target.value || undefined)}
                    placeholder="depth=4,name (쉼표 구분, =없으면 row에서 동적 주입)"
                    className={INPUT_CLS}
                />
            </div>
            <label className="flex items-center gap-1.5 pb-1.5 cursor-pointer whitespace-nowrap">
                <input
                    type="checkbox"
                    checked={paramSaveValue ?? false}
                    onChange={e => onParamSaveChange(e.target.checked || undefined)}
                    className="w-3.5 h-3.5 rounded accent-slate-700"
                />
                <span className="text-xs text-slate-600">저장</span>
            </label>
        </div>
    );
}
