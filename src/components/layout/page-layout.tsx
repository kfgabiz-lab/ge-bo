"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ROW_HEIGHT } from "./grid-cell";
import { PageGridContainer } from "./page-grid-container";
import { useMenuStore, MenuItem } from "@/store/use-menu-store";
import { usePageTitleStore } from "@/store/use-page-title-store";
import { useI18n } from "@/hooks/use-i18n";

export function findMenuByUrl(menus: MenuItem[], pathname: string): MenuItem | null {
  for (const item of menus) {
    if (item.url === pathname) return item;
    if (item.children?.length) {
      const found = findMenuByUrl(item.children, pathname);
      if (found) return found;
    }
  }
  return null;
}

export function findMenuById(menus: MenuItem[], id: number): MenuItem | undefined {
  for (const item of menus) {
    if (item.id === id) return item;
    if (item.children?.length) {
      const found = findMenuById(item.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

interface PageLayoutProps {
  title?: string;
  description?: string;
  mode?: "preview" | "live";
  noGrid?: boolean;
  children: React.ReactNode;
}

export default function PageLayout({ title, description, mode = "live", noGrid = false, children }: PageLayoutProps) {
  const pathname = usePathname();
  const navMenus = useMenuStore((state) => state.navMenus);
  const { t } = useI18n();

  const pageTitle = usePageTitleStore((s) => s.pageTitle);

  const autoMenu = mode === "live" ? findMenuByUrl(navMenus, pathname || "") : null;
  const autoMenuName = autoMenu ? (autoMenu.nameMsgKey ? t(autoMenu.nameMsgKey) : autoMenu.name) : undefined;
  const autoMenuDesc = autoMenu
    ? autoMenu.descriptionMsgKey
      ? t(autoMenu.descriptionMsgKey)
      : autoMenu.description
    : undefined;
  const displayTitle = title ?? autoMenuName ?? (mode === "live" ? pageTitle : undefined);
  const displayDescription = description ?? autoMenuDesc;

  const [showGrid, setShowGrid] = useState(mode === "preview");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "g" || e.key === "G") setShowGrid((prev) => !prev);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const overlayStyle: React.CSSProperties = showGrid
    ? {
        backgroundImage: `
            linear-gradient(to right,  #e2e8f0 1px, transparent 1px),
            linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
        `,
        backgroundSize: `calc(100% / 12) ${ROW_HEIGHT}px`,
      }
    : {};

  const wrapCls = showGrid ? "border border-slate-200 rounded-lg bg-slate-50" : "";

  return (
    <div className="space-y-3">
      {displayTitle && (
        <div>
          <h1 className="text-lg font-bold text-slate-900">{displayTitle}</h1>
          {displayDescription && <p className="text-sm text-slate-500 mt-0.5">{displayDescription}</p>}
        </div>
      )}
      {noGrid ? (
        children
      ) : (
        <div className={wrapCls} style={overlayStyle}>
          <PageGridContainer>{children}</PageGridContainer>
        </div>
      )}
    </div>
  );
}
