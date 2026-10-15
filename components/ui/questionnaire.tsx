"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface QuestionnaireProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Questionnaire({ className, children, ...props }: QuestionnaireProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      {children}
    </div>
  );
}
