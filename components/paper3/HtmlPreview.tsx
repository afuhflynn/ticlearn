"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, RefreshCw } from "lucide-react";

interface HtmlPreviewProps {
  html: string;
  className?: string;
  height?: string;
  showToggle?: boolean;
  defaultOpen?: boolean;
}

export function HtmlPreview({
  html,
  className,
  height = "400px",
  showToggle = true,
  defaultOpen = false,
}: HtmlPreviewProps) {
  const [isVisible, setIsVisible] = useState(defaultOpen);
  const [refreshKey, setRefreshKey] = useState(0);

  const blobUrl = useMemo(() => {
    if (!html || html.trim().length === 0) return null;

    const wrappedHtml = html.includes("<!DOCTYPE") || html.includes("<html")
      ? html
      : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 16px;
      margin: 0;
      background: #fff;
    }
  </style>
</head>
<body>
${html}
</body>
</html>`;

    const blob = new Blob([wrappedHtml], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [html, refreshKey]);

  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  if (!html || html.trim().length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20",
          className,
        )}
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">
          Enter your HTML code to see the preview
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showToggle && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVisible(!isVisible)}
            className="gap-2"
          >
            {isVisible ? (
              <>
                <EyeOff className="h-4 w-4" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Show Preview
              </>
            )}
          </Button>
          {isVisible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
          )}
        </div>
      )}

      {isVisible && (
        <div
          className="overflow-hidden rounded-lg border bg-white"
          style={{ height }}
        >
          <iframe
            key={refreshKey}
            src={blobUrl || undefined}
            title="HTML Preview"
            className="size-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms"
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}

export default HtmlPreview;