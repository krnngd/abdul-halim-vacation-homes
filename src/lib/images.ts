import type { ImageMetadata } from 'astro';

/*
 * Original images stay untouched in /assets/images. Astro reads them at build
 * time and emits optimised WebP variants. The unconfirmed portrait is excluded
 * so it can never reach the build output.
 */
const modules = import.meta.glob<{ default: ImageMetadata }>(
  ['/assets/images/*.{png,jpg}', '!/assets/images/leadership-portrait.png'],
  { eager: true },
);

const CANDIDATE_WIDTHS = [360, 480, 640, 800, 1024, 1200] as const;

export function getImage(name: string): ImageMetadata {
  const entry = modules[`/assets/images/${name}`];
  if (!entry) {
    throw new Error(`Image "${name}" is not in assets/images (or is excluded from the build).`);
  }
  return entry.default;
}

/** Responsive widths that never exceed the source's natural width. */
export function widthsFor(image: ImageMetadata, max = image.width): number[] {
  const limit = Math.min(max, image.width);
  const widths = CANDIDATE_WIDTHS.filter((width) => width < limit);
  return [...widths, limit];
}
