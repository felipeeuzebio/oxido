/**
 * Text from course.toml, where code is set off with backticks the way Markdown
 * does it: "a `db > ` prompt". Each code span gets the inline code chip.
 */
export function CodeText({ text }: { text: string }) {
  let at = 0;
  return text.split("`").map((part, i) => {
    const key = at;
    at += part.length + 1;
    return i % 2 === 1 ? (
      <code
        key={key}
        className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-[0.875em] whitespace-pre"
      >
        {part}
      </code>
    ) : (
      part
    );
  });
}
