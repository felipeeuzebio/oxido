// Placeholder home. The roadmap view replaces this in platform phase P2
// (see docs/roadmap-platform.md).

export const meta = () => [{ title: "Oxidō" }];

export default function Home() {
  return (
    <main className="mx-auto my-12 flex max-w-2xl flex-col gap-4 px-4">
      <h1 className="text-3xl font-bold">Oxidō</h1>
      <p>A project-based Rust course: build a small SQL database from white belt to black belt.</p>
      <p className="text-muted-foreground">The roadmap view lands in platform phase P2.</p>
    </main>
  );
}
