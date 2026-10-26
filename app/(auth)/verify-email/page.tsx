import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/seo";
import { VerifyEmailFormWrapper } from "./verify-email-form";

export const metadata: Metadata = publicPageMetadata({
  title: "Verify your email · TiCLearn",
  description:
    "Enter the verification code we sent to your email to finish creating your TiCLearn account.",
  path: "/verify-email",
});

export default function VerifyEmailPage() {
  return <VerifyEmailFormWrapper />;
}
