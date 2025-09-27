import { type ReactNode } from "react";
import { useRouter } from "next/router";
import { Navigation } from "./Navigation";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const router = useRouter();
  
  // Don't show navigation on auth page
  if (router.pathname === "/auth") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      <Navigation key="main-navigation" />
      {/* Main content area - padding top for mobile header, no margin left on desktop */}
      <main className="flex-1 lg:ml-0 pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
} 