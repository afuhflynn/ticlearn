import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/seo";
import { SignInFormWrapper } from "./sign-in-form";

export const metadata: Metadata = publicPageMetadata({
  title: "Sign in to TiCLearn",
  description:
    "Sign in to continue your learning journey with TiCLearn. Access your notes, quizzes and Tip, your AI tutor.",
  path: "/sign-in",
});

export default function SignInPage() {
  return <SignInFormWrapper />;
}
