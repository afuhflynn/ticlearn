import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ["10.202.255.83"],
  serverExternalPackages: ["tesseract.js"],
};

export default nextConfig;
