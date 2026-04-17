import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TiCLearn - AI-Powered Study Platform",
    short_name: "TiCLearn",
    description:
      "Transform your notes into quizzes, prepare for GCE exams, compete on leaderboards, and chat with TiC our AI tutor. The ultimate study companion for Cameroonian students.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FEFEFE",
    theme_color: "#7C3AED",
    categories: ["education", "productivity"],
    lang: "en",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
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
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Leaderboard",
        description: "See top performers",
        url: "/leaderboard",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Chat with TiC",
        description: "Ask AI for help",
        url: "/chat",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
