"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { NotFoundSpot } from "../components/illustrations";
import { useAppContext } from "../components/locale-provider";

export default function NotFoundPage() {
  const router = useRouter();
  const { locale, t } = useAppContext();
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    router.push(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 py-12">
      <div className="w-full rounded-3xl border border-border-subtle bg-surface-card px-6 py-12 text-center shadow-card sm:px-10">
        <div className="mx-auto w-56 sm:w-64">
          <NotFoundSpot />
        </div>

        <p className="mt-4 text-5xl font-extrabold tracking-tight text-brand-accent sm:text-6xl">
          404
        </p>

        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-primary sm:text-3xl">
          {t.notFoundTitle}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-secondary">
          {t.notFoundBody}
        </p>

        <form
          onSubmit={handleSearch}
          className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row"
        >
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={
              locale === "ur"
                ? "پروڈکٹ یا سروس تلاش کریں..."
                : "Search products or services..."
            }
            aria-label={t.searchPlaceholder}
            className="w-full flex-1 rounded-2xl border border-border-subtle bg-surface-muted px-4 py-3 text-sm text-ink-primary outline-none transition focus:border-brand-primary focus:bg-surface-card focus:ring-2 focus:ring-brand-primary/20"
          />
          <button
            type="submit"
            className="rounded-2xl bg-brand-accent px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-95"
          >
            {t.searchButton}
          </button>
        </form>

        <div className="mt-6 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-2xl bg-brand-primary px-6 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-brand-primary-hover"
          >
            {t.backToMarketplaceBtn}
          </Link>
        </div>
      </div>
    </div>
  );
}
