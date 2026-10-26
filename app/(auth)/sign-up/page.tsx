import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/seo";
import { SignUpFormWrapper } from "./sign-up-form";

export const metadata: Metadata = publicPageMetadata({
  title: "Create a TiCLearn account",
  description:
    "Sign up for TiCLearn to upload your lecture notes, generate quizzes, and learn with Tip, the AI tutor built for Cameroonian university students.",
  path: "/sign-up",
});

export default function SignUpPage() {
  return <SignUpFormWrapper />;
}
