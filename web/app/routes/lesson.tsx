// A class: its video and text lesson, pre-rendered from the compiled content.
//
// routes.ts registers this route only once there are lessons, so it uses React
// Router's generic types rather than the generated ./+types/lesson.
import { type LoaderFunctionArgs, type MetaFunction, useLoaderData } from "react-router";
import { readCourse, readLesson } from "@/features/content/content.server";
import { LessonView } from "@/features/lesson/LessonView";
import { lessonPlace } from "@/features/lesson/place";

export async function loader({ params }: LoaderFunctionArgs) {
  const lesson = await readLesson(params.phase ?? "", params.slug ?? "");
  return { lesson, place: lessonPlace(readCourse(), lesson) };
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: loaderData ? `${loaderData.lesson.title} · Oxidō` : "Oxidō" },
];

export default function LessonPage() {
  const { lesson, place } = useLoaderData<typeof loader>();
  return <LessonView lesson={lesson} place={place} />;
}
