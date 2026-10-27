import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { publicPageMetadata } from "@/lib/seo";

/**
 * Public catalogue index, from spec 0023 AC-2.
 * Lists every university and its faculties, responsive navigation to the
 * faculty detail page. Server rendered, public read access.
 */
export const metadata = publicPageMetadata({
  title: "Course and Faculty Catalogue · TiCLearn",
  description:
    "Browse courses and faculties by Cameroonian university before you sign up. University of Yaounde I, Buea, Douala, Dschang, Bamenda and Maroua.",
  path: "/catalogue",
});

export default async function CataloguePage() {
  const universities = await prisma.university.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      faculties: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  return (
    <div className="container py-12 md:py-20">
      <div className="mx-auto max-w-5xl space-y-12">
        <section className="space-y-4">
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            Browse courses by university
          </h2>
          <p className="text-lg text-muted-foreground">
            Pick your university, then your faculty, to see the courses
            available on TiCLearn. All pages are public and indexed by search
            engines.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {universities.map((university) => (
            <Card
              key={university.id}
              className="hover:border-primary/50 transition-border"
            >
              <CardHeader>
                <CardTitle>{university.name}</CardTitle>
                <CardDescription>{university.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {university.faculties.map((faculty) => (
                  <Link
                    key={faculty.id}
                    href={`/catalogue/${university.slug}/${faculty.slug}`}
                    className="block rounded-lg border p-3 hover:bg-accent hover:border-accent transition-all"
                  >
                    {faculty.name}
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
