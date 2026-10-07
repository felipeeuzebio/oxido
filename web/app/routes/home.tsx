// The roadmap: where the student is on the path from white belt to black belt.
import { readCourse } from "@/features/content/content.server";
import { Roadmap } from "@/features/roadmap/Roadmap";
import type { Route } from "./+types/home";

// Runs once, when the page is pre-rendered.
export function loader() {
  return readCourse();
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Roadmap course={loaderData} />;
}
