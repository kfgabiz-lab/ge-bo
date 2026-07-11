'use client';

/**
 * EntityBuildButton — "Slug Entity로 빌드" 공통 버튼
 *
 * 기존 OutputModePanel의 인라인 "빌드" 버튼 마크업을 그대로 컴포넌트화한 것이다.
 * Form 전용(페이지 공유 빌드)뿐 아니라 Search/Table 위젯의 "이 위젯만 빌드" 버튼에도 동일하게 재사용한다.
 *
 * 사용법:
 *   <EntityBuildButton
 *     onClick={() => onChange(buildSearchFromEntity(widget, slugEntityFields ?? []))}
 *     disabled={!slugEntityFields?.length}
 *     title="Slug Entity 필드로 검색 필드 자동 구성"
 *   />
 */

interface EntityBuildButtonProps {
    /** 버튼 클릭 시 실행할 빌드 함수 */
    onClick: () => void;
    /** 비활성화 여부 — entity 미선택 등으로 빌드 대상이 없을 때 true */
    disabled?: boolean;
    /** 버튼 텍스트 (기본값: '빌드') */
    label?: string;
    /** 마우스 오버 시 표시할 설명 */
    title?: string;
}

export function EntityBuildButton({ onClick, disabled = false, label = '빌드', title }: EntityBuildButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`shrink-0 px-2 py-1.5 text-[11px] font-semibold rounded border transition-all ${
                disabled
                    ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                    : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-700'
            }`}
        >
            {label}
        </button>
    );
}
