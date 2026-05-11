"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import { Skeleton } from "../ui/skeleton";
import { UserButton } from "../user/user-button";
import Image from "next/image";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

export function MarketingNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, isPending } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 md:h-8 md:w-8 text-primary" />
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
          <Button variant="ghost" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 sm:w-80">
            <div className="flex flex-col gap-6 pt-6 px-4">
              <Link
                href="/"
                className="flex items-center gap-2"
                onClick={() => setIsOpen(false)}
              >
                <Image
                  src="/icons/favicon-32x32.png"
                  alt="TiCLearn Logo"
                  className="h-8 w-8 text-primary"
                />
                <span className="text-lg font-bold">TiCLearn</span>
              </Link>
              <nav className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      className="text-base font-medium transition-colors hover:text-primary py-2 rounded-md hover:bg-muted"
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="flex flex-col gap-3 mt-2">
                {isPending ? (
                  <>
                    <Skeleton className="w-full h-10 rounded-full" />
                    <Skeleton className="w-full h-10 rounded-full" />
                  </>
                ) : session?.user ? (
                  <UserButton user={session.user} />
                ) : (
                  <>
                    <Button variant="ghost" className="w-full h-11" asChild>
                      <Link href="/sign-in" onClick={() => setIsOpen(false)}>
                        Sign In
                      </Link>
                    </Button>
                    <Button className="w-full h-11" asChild>
                      <Link href="/sign-up" onClick={() => setIsOpen(false)}>
                        Get Started
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
