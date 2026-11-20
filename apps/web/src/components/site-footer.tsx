"use client";

import { useAppContext } from "./locale-provider";

export function SiteFooter() {
  const { t } = useAppContext();

  return (
    <footer className="mt-16 border-t border-border-subtle bg-surface-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-xs text-ink-secondary sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="font-medium text-ink-primary">{t.privacyFooterNote}</p>
        <p>{t.footerBetaNote}</p>
      </div>
    </footer>
  );
}
