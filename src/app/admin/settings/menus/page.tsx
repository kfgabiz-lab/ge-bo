"use client";

/**
 * 메뉴 관리 페이지
 * - 왼쪽: BO/FO 탭 + 메뉴 트리
 * - 오른쪽: 선택 메뉴 상세 편집 + 역할별 권한
 */

import { useQueryClient } from "@tanstack/react-query";
import { MenuTree } from "@/components/menus/menu-tree";
import { MenuDetail } from "@/components/menus/menu-detail";
import { MenuImportButton } from "@/components/menus/menu-import-modal";
import PageLayout from "@/components/layout/page-layout";
import { useAuthStore } from "@/store/auth-store";
import { useMenuStore } from "@/store/use-menu-store";

export default function MenusPage() {
  const adminInfo = useAuthStore((state) => state.adminInfo);
  const activeTab = useMenuStore((state) => state.activeTab);
  const queryClient = useQueryClient();

  const isSystemAdmin = adminInfo?.role === "SYSTEM_ADMIN";

  return (
    <PageLayout mode="live" noGrid>
      <div className="flex flex-col" style={{ height: "calc(100vh - 170px)" }}>
        {isSystemAdmin && activeTab === "BO" && (
          <div className="flex justify-end mb-3">
            <MenuImportButton onImported={() => queryClient.invalidateQueries({ queryKey: ["menus", "BO"] })} />
          </div>
        )}
        {/* 2단 레이아웃 — 뷰포트 높이에 맞춤 */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 min-h-0 overflow-hidden">
          <MenuTree />
          <MenuDetail />
        </div>
      </div>
    </PageLayout>
  );
}
