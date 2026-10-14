import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TiCLearn - AI-Powered Study Platform",
    short_name: "TiCLearn",
    description:
      "Upload your lecture notes, turn them into quizzes, and learn with Tip. Built for university students in Cameroon.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FFFFFF",
    theme_color: "#8B5CF6",
    categories: ["education", "productivity"],
    lang: "en",
    icons: [
      {
        src: "/icons/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Start Quiz",
        description: "Start a new quiz from your notes",
        url: "/upload",
        icons: [{ src: "/icons/android-chrome-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Leaderboard",
        description: "See top performers",
        url: "/leaderboard",
        icons: [{ src: "/icons/android-chrome-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Chat with Tip",
        description: "Ask AI for help",
        url: "/chat",
        icons: [{ src: "/icons/android-chrome-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
