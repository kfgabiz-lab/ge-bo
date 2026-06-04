'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * admin 영역 Error Boundary
 * - Sidebar/Header 레이아웃은 유지된 채 컨텐츠 영역에 에러 UI 표시
 * - reset() 으로 해당 세그먼트만 재시도 가능
 */
export default function AdminError({ error, reset }: ErrorProps) {
  /* 에러 발생 시 콘솔 기록 (운영 환경에서 모니터링 연동 지점) */
  useEffect(() => {
    console.error('[AdminError]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      {/* 에러 아이콘 */}
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      {/* 에러 메시지 */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900">페이지를 불러오는 중 오류가 발생했습니다</h2>
        <p className="text-sm text-slate-500">
          {error.message || '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
        </p>
        {/* digest: 서버 에러 추적 식별자 (운영 로그와 매칭 시 사용) */}
        {error.digest && (
          <p className="text-xs text-slate-400 mt-2">오류 코드: {error.digest}</p>
        )}
      </div>

      {/* 재시도 버튼 */}
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        다시 시도
      </button>
    </div>
  );
}
