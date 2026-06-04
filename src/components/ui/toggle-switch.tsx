'use client';

/**
 * ToggleSwitch — 공통 토글 스위치 컴포넌트
 *
 * @example
 * <ToggleSwitch checked={isOn} onChange={setIsOn} />
 * <ToggleSwitch checked={isOn} onChange={setIsOn} disabled />
 */

interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

export function ToggleSwitch({ checked, onChange, disabled = false }: ToggleSwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center
                rounded-full border-2 border-transparent transition-colors duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2
                ${checked ? 'bg-slate-900' : 'bg-slate-200'}
                ${disabled ? 'cursor-not-allowed opacity-50' : ''}
            `}
        >
            <span
                className={`
                    inline-block h-4 w-4 rounded-full bg-white shadow-sm
                    transition-transform duration-200
                    ${checked ? 'translate-x-5' : 'translate-x-0'}
                `}
            />
        </button>
    );
}
