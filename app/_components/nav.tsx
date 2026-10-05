"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/environments", label: "Environments" },
  { href: "/costs", label: "Costs" },
];

/** Highlights the current section. Wrap in <Suspense fallback={<NavLinks />}>: the pathname is
 * unknown while prerendering routes with dynamic params. */
export function Nav() {
  return <NavLinks pathname={usePathname()} />;
}

export function NavLinks({ pathname }: { pathname?: string }) {
  return (
    <nav className="flex gap-1 text-sm">
      {LINKS.map(({ href, label }) => {
        const active =
          pathname !== undefined &&
          (href === "/" ? pathname === "/" || pathname.startsWith("/projects") : pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              active ? "bg-surface-hover text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
