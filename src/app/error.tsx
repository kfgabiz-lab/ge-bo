'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 루트 레벨 Error Boundary — 최후 폴백
 * - AdminLayout 바깥(전체 화면)에서 처리되지 않은 에러를 잡음
 * - 레이아웃 없이 전체 화면 에러 UI 표시
 */
export default function GlobalError({ error, reset }: ErrorProps) {
  const router = useRouter();

  /* 에러 발생 시 콘솔 기록 (운영 환경에서 모니터링 연동 지점) */
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-6 text-center p-8">
      {/* 에러 아이콘 */}
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-red-400"
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
        <h1 className="text-xl font-bold text-slate-900">예기치 않은 오류가 발생했습니다</h1>
        <p className="text-sm text-slate-500">
          {error.message || '시스템 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
        </p>
        {/* digest: 서버 에러 추적 식별자 (운영 로그와 매칭 시 사용) */}
        {error.digest && (
          <p className="text-xs text-slate-400 mt-2">오류 코드: {error.digest}</p>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          다시 시도
        </button>
        <button
          onClick={() => router.push('/admin/login')}
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          로그인으로 이동
        </button>
      </div>
    </div>
  );
}
