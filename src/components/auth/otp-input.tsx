"use client";

import { useRef, KeyboardEvent, ClipboardEvent } from "react";

interface OtpInputProps {
    length: number;
    value: string;
    onChange: (val: string) => void;
    // Enter 키 입력 시 실행할 콜백 (선택) — 부모의 제출 핸들러 연결용
    onEnter?: () => void;
}

/** 6자리 OTP 입력 컴포넌트 — 각 칸 자동 포커스 이동, 붙여넣기 지원 */
export default function OtpInput({ length, value, onChange, onEnter }: OtpInputProps) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const digits = value.padEnd(length, "").split("").slice(0, length);

    const update = (idx: number, char: string) => {
        const next = digits.slice();
        next[idx] = char;
        onChange(next.join("").trimEnd());
    };

    const handleChange = (idx: number, raw: string) => {
        const char = raw.replace(/\D/g, "").slice(-1);
        update(idx, char);
        if (char && idx < length - 1) {
            inputRefs.current[idx + 1]?.focus();
        }
    };

    const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !digits[idx] && idx > 0) {
            update(idx - 1, "");
            inputRefs.current[idx - 1]?.focus();
        }
        // Enter 키 입력 시 부모의 제출 핸들러 실행
        if (e.key === "Enter") {
            onEnter?.();
        }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
        onChange(pasted);
        // 마지막 입력 칸으로 포커스
        const lastIdx = Math.min(pasted.length, length - 1);
        inputRefs.current[lastIdx]?.focus();
    };

    return (
        <div className="flex gap-2 justify-center">
            {Array.from({ length }).map((_, idx) => (
                <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digits[idx] || ""}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    className="w-11 h-12 text-center text-lg font-semibold border border-[#e2e4e9] rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-[#4361ee]/20 focus:border-[#4361ee]
                               transition-all bg-white"
                />
            ))}
        </div>
    );
}
