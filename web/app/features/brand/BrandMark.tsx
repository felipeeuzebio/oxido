const base = import.meta.env.BASE_URL;

/**
 * The logo, linking home. It stands alone: the name Oxidō is the page title,
 * not a wordmark next to the logo, so the image carries the name for screen
 * readers. On the Forge (dark) theme a faint light rim keeps the black hood
 * from disappearing into the charcoal (docs/design.md, "Logo").
 */
export function BrandMark() {
  return (
    <a href={base} className="inline-flex rounded-md">
      <img
        src={`${base}logo.svg`}
        alt="Oxidō"
        width={55}
        height={40}
        className="h-10 w-auto dark:drop-shadow-[0_0_1px_var(--color-muted-foreground)]"
      />
    </a>
  );
}
