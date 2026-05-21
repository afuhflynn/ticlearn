"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type SignInPromptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callbackUrl: string;
  title?: string;
  description?: string;
};

export function SignInPromptDialog({
  open,
  onOpenChange,
  callbackUrl,
  title = "Sign in to continue",
  description = "Create a free account or sign in to take mocks, ask TiC, and track your progress on the leaderboard.",
}: SignInPromptDialogProps) {
  const encoded = encodeURIComponent(callbackUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild className="w-full">
            <Link href={`/sign-in?callbackUrl=${encoded}`}>Sign in</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href={`/sign-up?callbackUrl=${encoded}`}>
              Create free account
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
