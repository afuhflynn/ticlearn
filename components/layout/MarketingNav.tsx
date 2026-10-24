"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { UserButton } from "../user/user-button";

const navLinks = [
  { href: "/#how", label: "How it works" },
  { href: "/#tools", label: "Study tools" },
  { href: "/#students", label: "For students" },
  { href: "/#faq", label: "FAQ" },
];

export function MarketingNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      {pathname === "/" ? (
        <div className="bg-primary px-3 py-2 text-center text-[11px] font-medium text-primary-foreground md:text-xs">
          Built for the way university students actually study.
        </div>
      ) : null}
      <div className="container flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
        <Link href="/" className="flex min-h-12 items-center gap-2">
          <Image
            src="/icons/favicon-32x32.png"
            alt="TiCLearn Logo"
            width={32}
            height={32}
            className="h-8 w-8 text-primary"
          />
          <span className="text-lg md:text-xl font-bold tracking-tight">
            TiCLearn
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === link.href
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {session?.user ? (
            <>
              <Button variant="ghost" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <UserButton user={session.user} />
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/sign-in">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up">Start studying</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="h-12 w-12">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 sm:w-80">
            <div className="flex flex-col gap-6 pt-6 px-4">
              <div className="w-full flex items-center justify-center">
                <Link
                  href="/"
                  className="flex min-h-12 items-center gap-2"
                  onClick={() => setIsOpen(false)}
                >
                  <Image
                    src="/icons/favicon-32x32.png"
                    alt="TiCLearn Logo"
                    width={32}
                    height={32}
                    className="h-8 w-8 text-primary"
                  />
                  <span className="text-lg font-bold">TiCLearn</span>
                </Link>
              </div>
              <nav className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      className="flex min-h-12 items-center text-base font-medium transition-colors hover:text-primary py-2 rounded-md hover:bg-muted"
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="flex flex-col gap-3 mt-2">
                {session?.user ? (
                  <UserButton user={session.user} />
                ) : (
                  <>
                    <Button variant="ghost" className="w-full h-11" asChild>
                      <Link href="/sign-in" onClick={() => setIsOpen(false)}>
                        Log in
                      </Link>
                    </Button>
                    <Button className="w-full h-11" asChild>
                      <Link href="/sign-up" onClick={() => setIsOpen(false)}>
                        Start studying
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
