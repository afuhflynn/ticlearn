import React from "react";
import { notFound } from "next/navigation";
import FluteStudio from "../../src/flute/Studio";
export default function FlutePage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <><meta name="flute-project" content="15336dc9-a906-4f7d-9c9a-b0369e97ee21" /><FluteStudio /></>;
}
