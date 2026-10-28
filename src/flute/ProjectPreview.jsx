"use client";
import React from "react";
import { ProjectPreview } from "@webprodigies/flute/preview";
import { sceneModules } from "./catalog";
// Host-owned development flag: no process, Vite or Electron globals in this adapter.
export function FluteProjectPreview({ children, enabled, active, ...props }) {
  if (!enabled) return children;
  return <ProjectPreview {...props} projectId="15336dc9-a906-4f7d-9c9a-b0369e97ee21" enabled={enabled} active={active} sceneModules={sceneModules}>{children}</ProjectPreview>;
}
