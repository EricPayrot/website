import type { CollectionEntry } from "astro:content";

export type GalleryImageTileModel = {
  workSlug: string;
  workTitle: string;
  imageIndex: number;
  src: CollectionEntry<"works">["data"]["images"][number]["src"];
  alt: string;
};

export function sortPublishedWorks(
  works: CollectionEntry<"works">[],
): CollectionEntry<"works">[] {
  return [...works]
    .filter(({ data }) => !data.draft)
    .sort((a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0));
}

/** Flatten every image from the given works into viewer tiles (same shape as the /works grid). */
export function buildImageTiles(
  works: CollectionEntry<"works">[],
): GalleryImageTileModel[] {
  return works.flatMap((work) =>
    work.data.images.map((image, imageIndex) => ({
      workSlug: work.slug,
      workTitle: work.data.title,
      imageIndex,
      src: image.src,
      alt: image.alt,
    })),
  );
}
