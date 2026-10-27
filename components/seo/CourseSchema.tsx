import { courseSchemaData } from "@/lib/seo";

type CourseSchemaProps = {
  courseTitle: string;
  courseCode: string;
  providerName: string;
  providerUrl: string;
  description?: string;
};

export function CourseSchema({
  courseTitle,
  courseCode,
  providerName,
  providerUrl,
  description,
}: CourseSchemaProps) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is serialized from trusted local schema data.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(
          courseSchemaData({
            courseTitle,
            courseCode,
            providerName,
            providerUrl,
            description,
          }),
        ),
      }}
    />
  );
}
