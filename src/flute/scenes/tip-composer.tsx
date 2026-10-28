"use client";

import { Surface } from "@webprodigies/flute";
import { ChatLanding } from "@/components/chat/chat-landing";

/**
 * The real Tip chat landing on a fixed-size sheet.
 *
 * The component is the page's own `ChatLanding`, unchanged: the greeting, the
 * composer, the capability line and the four starter rows all run their real
 * code and read the signed-in student's session and allowance. The sheet is
 * sized to the column plus its margins so the camera has a definite surface
 * to travel along; `bg-background` is the page's own paint, not new paint.
 */
const SHEET_WIDTH = 1184;
const SHEET_HEIGHT = 480;

export default function TipComposerScene() {
  return (
    <Surface
      id="page"
      style={{
        position: "absolute",
        inset: 0,
        margin: "auto",
        width: SHEET_WIDTH,
        height: SHEET_HEIGHT,
      }}
      transform={{ x: 0, y: 0, z: 0 }}
    >
      <div className="h-full w-full overflow-hidden bg-background font-sans text-foreground">
        <ChatLanding />
      </div>
    </Surface>
  );
}
