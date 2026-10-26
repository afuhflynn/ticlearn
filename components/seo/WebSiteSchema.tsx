import { websiteSchemaData } from "@/lib/seo";

export function WebSiteSchema() {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is serialized from trusted local schema data.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchemaData()) }}
    />
  );
}
