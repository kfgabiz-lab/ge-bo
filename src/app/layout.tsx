import type { Metadata } from "next";
import "./globals.css";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { NavigationRegistrar } from "@/components/providers/navigation-registrar";
import { TRUSTED_TYPES_DEFAULT_POLICY_SCRIPT } from "@/lib/trustedTypesPolicy";

export const metadata: Metadata = {
  title: "Global Backoffice",
  description: "Corporate Admin Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* 실험: next/script의 beforeInteractive는 self.__next_s 큐에 쌓였다가
            Next.js 런타임 청크가 처리해줘야 실행되는데, 그 청크 자체가 async라서
            먼저 실행돼버려 실패함(TT-DEBUG 로그가 전혀 안 찍힘 확인됨).
            대신 진짜 파싱 시점에 동기 실행되는 raw <script>를 <head> 맨 앞에 직접 렌더링. */}
        <script
          id="trusted-types-default-policy"
          dangerouslySetInnerHTML={{ __html: TRUSTED_TYPES_DEFAULT_POLICY_SCRIPT }}
        />
      </head>
      <body className="antialiased bg-[var(--background)] text-[var(--foreground)] min-h-screen">
        <QueryProvider>
          <NavigationRegistrar />
          <Toaster position="top-center" richColors />
          <AdminLayout>{children}</AdminLayout>
        </QueryProvider>
      </body>
    </html>
  );
}
