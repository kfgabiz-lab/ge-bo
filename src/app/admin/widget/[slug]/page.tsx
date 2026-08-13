"use client";

import React, { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import PageLayout, { findMenuByUrl } from "@/components/layout/page-layout";
import { Loader2, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { useCodeStore } from "@/store/use-code-store";
import { usePageTitleStore } from "@/store/use-page-title-store";
import { useAuthStore } from "@/store/auth-store";
import { useNavMenusQuery } from "@/hooks/use-menu-queries";
import { PageGridRenderer } from "@/app/admin/templates/make/_shared/components/renderer";
import type { PageWidgetItem } from "@/app/admin/templates/make/_shared/components/renderer";
import { useWidgetPageState } from "@/app/admin/templates/make/_shared/hooks/useWidgetPageState";
import type { ConnectedType } from "@/app/admin/templates/make/_shared/hooks/useOutputMode";
import { useI18n } from "@/hooks/use-i18n";

interface WidgetConfig {
  widgetItems: PageWidgetItem[];
  pageTitle?: string;
  connectedType?: ConnectedType;
  entitySearch?: boolean;
}

export default function WidgetRendererPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  const { groups: codeGroups, fetchGroups } = useCodeStore();
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);
  const { t } = useI18n();

  const pathname = usePathname();
  const { data: navMenusData, isLoading: navMenusLoading } = useNavMenusQuery();
  const menuId = useMemo(() => findMenuByUrl(navMenusData || [], pathname || "")?.id ?? null, [navMenusData, pathname]);
  const isSystemAdmin = useAuthStore((s) => s.adminInfo?.isSystem ?? false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [widgetItems, setWidgetItems] = useState<PageWidgetItem[]>([]);
  const [connectedType, setConnectedType] = useState<ConnectedType | undefined>(undefined);
  const [entitySearch, setEntitySearch] = useState<boolean | undefined>(undefined);

  const { gridProps } = useWidgetPageState(widgetItems, slug, {
    connectedType,
    entitySearchEnabled: entitySearch,
    menuId,
  });

  useEffect(() => {
    if (navMenusLoading) return;
    if (menuId == null && !isSystemAdmin) {
      window.location.href = "/bo/admin/no-permission";
    }
  }, [navMenusLoading, menuId, isSystemAdmin]);

  useEffect(() => {
    fetchGroups();
    api
      .get(`/page-templates/by-slug/${slug}`, {
        params: { type: "PAGE" },
        headers: menuId != null ? { "X-Menu-Id": String(menuId) } : undefined,
      })
      .then((res) => {
        const config = JSON.parse(res.data.configJson) as WidgetConfig;
        const items = config.widgetItems || [];
        setWidgetItems(items);
        setConnectedType(config.connectedType || undefined);
        setEntitySearch(config.entitySearch);
        setPageTitle(config.pageTitle || "");
      })
      .catch(() => setError(t("common.error.page_load")))
      .finally(() => setLoading(false));
  }, [slug, fetchGroups]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-red-500">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <PageLayout mode="live">
      <PageGridRenderer mode="live" widgetItems={widgetItems} codeGroups={codeGroups} {...gridProps} />
    </PageLayout>
  );
}
