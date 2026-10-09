// A lesson's text, pre-rendered from the compiled content (platform phase P1).
// The lesson page with the video, views and notes comes in P3.
//
// routes.ts registers this route only once there are lessons, so it uses React
// Router's generic types rather than the generated ./+types/lesson.
import { type LoaderFunctionArgs, type MetaFunction, useLoaderData } from "react-router";
import { readLesson } from "@/features/content/content.server";

export async function loader({ params }: LoaderFunctionArgs) {
  return readLesson(params.phase ?? "", params.slug ?? "");
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: loaderData ? `${loaderData.title} · Oxidō` : "Oxidō" },
];

export default function LessonPage() {
  const lesson = useLoaderData<typeof loader>();
  return (
    <div className="mx-auto my-12 flex max-w-3xl flex-col gap-6 px-4">
      <h1 className="text-3xl font-bold">{lesson.title}</h1>
      <article
        className="lesson flex flex-col gap-4"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: the content compiler's output; it escapes raw HTML in lessons (crates/oxido-content)
        dangerouslySetInnerHTML={{ __html: lesson.html }}
      />
    </div>
  );
}
