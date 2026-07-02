'use client';

import { useState } from 'react';

interface PrivacyReasonModalProps {
    /** 확인 버튼 클릭 시 호출 — reason: 입력된 사유 */
    onConfirm: (reason: string) => void;
    /** 취소/닫기 버튼 클릭 시 호출 */
    onCancel: () => void;
}

const MIN_LENGTH = 10;
const MAX_LENGTH = 50;

/**
 * 개인정보 다운로드 사유 입력 팝업
 * - 최소 10자 이상, 최대 50자
 * - 확인 시 onConfirm(reason) 호출
 */
export function PrivacyReasonModal({ onConfirm, onCancel }: PrivacyReasonModalProps) {
    const [reason, setReason] = useState('');
    const [error, setError]   = useState('');

    const handleConfirm = () => {
        if (reason.trim().length < MIN_LENGTH) {
            setError(`최소 ${MIN_LENGTH}자 이상 입력해주세요.`);
            return;
        }
        onConfirm(reason.trim());
    };

    const handleChange = (value: string) => {
        if (value.length > MAX_LENGTH) return;
        setReason(value);
        if (value.trim().length >= MIN_LENGTH) setError('');
    };

    return (
        /* 배경 오버레이 */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-[480px] rounded-lg bg-white shadow-xl">

                {/* 헤더 */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h2 className="text-base font-semibold text-slate-900">다운로드 사유</h2>
                    <button
                        onClick={onCancel}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label="닫기"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 본문 */}
                <div className="px-5 py-5 space-y-3">
                    <p className="text-sm text-slate-600">
                        개인정보를 다운로드 하는 경우 사유 확인 이 필요합니다.
                    </p>
                    <div>
                        <textarea
                            value={reason}
                            onChange={e => handleChange(e.target.value)}
                            placeholder={`최소 ${MIN_LENGTH}자 이상 입력`}
                            rows={3}
                            className={`w-full resize-none rounded border px-3 py-2 text-sm outline-none transition-colors
                                ${error
                                    ? 'border-red-400 focus:border-red-500'
                                    : 'border-slate-300 focus:border-slate-500'
                                }`}
                        />
                        <div className="flex items-center justify-between mt-1">
                            {error
                                ? <p className="text-xs text-red-500">{error}</p>
                                : <span />
                            }
                            <span className="text-xs text-slate-400 ml-auto">
                                {reason.length}/{MAX_LENGTH}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 푸터 */}
                <div className="flex items-center gap-2 border-t border-slate-200 px-5 py-4">
                    <button
                        onClick={onCancel}
                        className="rounded px-4 py-2 text-sm font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="rounded px-4 py-2 text-sm font-medium bg-slate-800 text-white hover:bg-slate-900 transition-colors"
                    >
                        확인
                    </button>
                </div>

            </div>
        </div>
    );
}
