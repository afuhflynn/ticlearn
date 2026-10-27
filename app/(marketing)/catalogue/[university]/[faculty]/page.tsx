import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata({
  title: "Courses by Faculty · TiCLearn",
  description: "Browse courses in a faculty at a Cameroonian university.",
  path: "/catalogue/[university]/[faculty]",
});

export const dynamic = "force-dynamic";

export default async function FacultyPage({
  params,
}: {
  params: Promise<{ university: string; faculty: string }>;
}) {
  const { university: universitySlug, faculty: facultySlug } = await params;

  const university = await prisma.university.findUnique({
    where: { slug: universitySlug },
  });

  if (!university) {
    notFound();
  }

  const faculty = await prisma.faculty.findUnique({
    where: {
      universityId_slug: { universityId: university.id, slug: facultySlug },
    },
    include: {
      university: true,
      courses: {
        select: {
          id: true,
          title: true,
          code: true,
          credits: true,
          description: true,
        },
        orderBy: [{ code: "asc" }, { title: "asc" }],
      },
    },
  });

  if (!faculty) {
    notFound();
  }

  return (
    <div className="container py-12 md:py-20">
      <div className="mx-auto max-w-4xl space-y-8">
        <section className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/catalogue"
            className="hover:text-primary transition-colors"
          >
            Catalogue
          </Link>
          <span className="mx-1">/</span>
          <span className="text-foreground font-medium">{faculty.name}</span>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">{faculty.name}</h2>
          <p className="text-lg text-muted-foreground">
            {university.name} · {faculty.courses.length} course
            {faculty.courses.length === 1 ? "" : "s"}
          </p>
        </section>

        {faculty.courses.length === 0 ? (
          <section className="rounded-xl border p-12 text-center text-muted-foreground">
            <p>No courses listed yet for this faculty.</p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {faculty.courses.map((course) => (
              <Card key={course.id}>
                <CardHeader className="grid grid-cols-1">
                  <CardTitle className="text-base font-semibold">
                    {course.title}
                  </CardTitle>
                  <div className="text-xs font-mono text-muted-foreground">
                    {course.code}
                  </div>
                </CardHeader>
                <CardContent>
                  {course.credits > 0 && (
                    <div className="mb-2 text-xs text-muted-foreground">
                      {course.credits} credit
                      {course.credits === 1 ? "" : "s"}
                    </div>
                  )}
                  {course.description && (
                    <CardDescription>{course.description}</CardDescription>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
