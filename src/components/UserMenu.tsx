"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { logout } from "@/app/login/actions";
import { Badge } from "@/components/ui/badge";

interface UserMenuProps {
  name: string;
  role: "CREATOR" | "FAN";
  creatorProfileId?: string;
}

export function UserMenu({ name, role, creatorProfileId }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const profileHref =
    role === "CREATOR"
      ? creatorProfileId
        ? `/creators/${creatorProfileId}`
        : "/dashboard/creator/edit"
      : "/dashboard/fan/profile";
  const roleLabel = role === "CREATOR" ? "크리에이터" : "팬";
  const roleVariant = role === "CREATOR" ? "primary" : "secondary";

  return (
    <div ref={ref} className="relative hidden items-center gap-2 md:flex">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-2 rounded-[var(--radius-control)] px-2.5 transition-colors hover:bg-brand-subtle"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="max-w-32 truncate text-sm font-semibold text-text-default">{name}</span>
        <Badge variant={roleVariant}>{roleLabel}</Badge>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[180px] overflow-hidden rounded-[var(--radius-panel)] border border-border-strong bg-white p-2 shadow-[var(--elevation-layered)]"
        >
          <Link
            href={profileHref}
            role="menuitem"
            className="block rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-text-default transition-colors hover:bg-brand-subtle"
            onClick={() => setOpen(false)}
          >
            내 정보
          </Link>
          <Link
            href="/support"
            role="menuitem"
            className="block rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-text-default transition-colors hover:bg-brand-subtle"
            onClick={() => setOpen(false)}
          >
            고객센터
          </Link>
          <div className="my-2 border-t border-border-default" />
          <form action={logout}>
            <button
              type="submit"
              role="menuitem"
              className="w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-sm font-medium text-text-subtle transition-colors hover:bg-neutral-100"
            >
              로그아웃
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
