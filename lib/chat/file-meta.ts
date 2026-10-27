import type { LucideIcon } from "lucide-react";
import {
  BracesIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  PaperclipIcon,
} from "lucide-react";

export type ChatFileMeta = {
  /** The short name printed on the card and the preview sheet. */
  label: string;
  Icon: LucideIcon;
  /** Icon tile classes, read from the attachment tokens in app/globals.css. */
  tile: string;
};

/**
 * One row per family the chat accepts, so every document draws the same kind
 * of tile and each one keeps its own colour. Images are not on this list;
 * they draw a thumbnail instead.
 */
export function chatFileMetaFor(mediaType: string): ChatFileMeta {
  if (mediaType === "application/pdf") {
    return {
      label: "PDF",
      Icon: FileTextIcon,
      tile: "bg-att-pdf-soft text-att-pdf",
    };
  }
  if (
    mediaType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return {
      label: "DOCX",
      Icon: FileTextIcon,
      tile: "bg-att-word-soft text-att-word",
    };
  }
  if (mediaType === "text/csv") {
    return {
      label: "CSV",
      Icon: FileSpreadsheetIcon,
      tile: "bg-att-sheet-soft text-att-sheet",
    };
  }
  if (mediaType === "application/json") {
    return {
      label: "JSON",
      Icon: BracesIcon,
      tile: "bg-att-code-soft text-att-code",
    };
  }
  if (mediaType.startsWith("text/")) {
    return {
      label: "TXT",
      Icon: FileTextIcon,
      tile: "bg-att-plain-soft text-att-plain",
    };
  }
  return {
    label: "File",
    Icon: PaperclipIcon,
    tile: "bg-muted text-muted-foreground",
  };
}
