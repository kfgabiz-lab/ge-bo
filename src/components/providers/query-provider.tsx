'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
    // 항상 useState를 사용하여 초기 렌더링 시에만 생성되도록 보장 (Next.js 권장 방식)
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // 기본값 설정: 필요에 따라 조정 가능 (ex: 1분간 캐시 신선도 유지)
                        staleTime: 60 * 1000,
                        retry: 1,
                        refetchOnWindowFocus: false, // 창 클릭할 때마다 강제 리패칭 방지 (성능 향상)
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
