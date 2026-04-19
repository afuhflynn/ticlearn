import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/dashboard/",
        "/chat/",
        "/settings/",
        "/quizzes/",
        "/upload/",
        "/progress/",
        "/community/",
        "/leaderboard/",
        "/gce-exams/",
        "/feedback/",
        "/affiliate/",
        "/subscription/",
      ],
    },
    sitemap: "https://ticlearn.ticsummit.org/sitemap.xml",
  };
}