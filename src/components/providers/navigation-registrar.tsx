"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNavigationStore } from "@/store/use-navigation-store";

export function NavigationRegistrar() {
  const router = useRouter();

  useEffect(() => {
    useNavigationStore.getState().register((path) => router.replace(path));
  }, [router]);

  return null;
}
