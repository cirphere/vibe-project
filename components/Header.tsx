"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { useAppState } from "@/contexts/AppStateContext";
import { useTheme } from "@/contexts/ThemeContext";
import { logout } from "@/app/login/actions";
import { SunIcon, MoonIcon } from "@/components/icons";

const NAV_ITEMS = [
  { href: "/", label: "투표" },
  { href: "/history", label: "이력" },
] as const;

export default function Header() {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { team } = useAppState();
  const { theme, toggleTheme } = useTheme();

  if (pathname === "/login") return null;

  const handleLogout = () => {
    startTransition(() => logout());
  };

  return (
    <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto max-w-2xl px-4">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="text-xl font-bold text-gray-900 dark:text-gray-100">
            오늘 뭐 먹지?
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="테마 전환"
            >
              {theme === "dark" ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
              {team?.name ?? "..."}
            </span>
            <button
              onClick={handleLogout}
              disabled={isPending}
              className="rounded-md px-2.5 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
            >
              로그아웃
            </button>
          </div>
        </div>

        <nav className="-mb-px flex gap-6">
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`inline-block border-b-2 pb-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-orange-500 text-orange-600 dark:text-orange-400"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
