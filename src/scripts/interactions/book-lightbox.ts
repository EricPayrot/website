/**
 * Book page gallery — thumbnail grid + modal lightbox for `/book`.
 */
export function mountBookLightbox(root: HTMLElement): void {
  const dialog = root.querySelector<HTMLDialogElement>(".book-lightbox");
  const img = root.querySelector<HTMLImageElement>(".book-lightbox__img");
  const prevBtn = root.querySelector<HTMLButtonElement>(
    '[data-book-lightbox-action="prev"]',
  );
  const nextBtn = root.querySelector<HTMLButtonElement>(
    '[data-book-lightbox-action="next"]',
  );
  const closeBtn = root.querySelector<HTMLButtonElement>(
    '[data-book-lightbox-action="close"]',
  );

  if (!dialog || !img || !prevBtn || !nextBtn || !closeBtn) return;

  const tiles = root.querySelectorAll<HTMLButtonElement>(".book-grid__tile");
  if (tiles.length === 0) return;

  const pages = Array.from(tiles).map((tile) => ({
    fullSrc: tile.dataset.fullSrc ?? "",
    alt: tile.dataset.alt ?? "",
  }));

  let index = 0;

  function render(i: number): void {
    index = ((i % pages.length) + pages.length) % pages.length;
    const page = pages[index];
    img.src = page.fullSrc;
    img.alt = page.alt;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === pages.length - 1;
  }

  function open(i: number): void {
    render(i);
    if (!dialog.open) dialog.showModal();
    closeBtn.blur();
    dialog.focus();
  }

  function close(): void {
    if (dialog.open) dialog.close();
  }

  function step(delta: number): void {
    if (index + delta < 0 || index + delta >= pages.length) return;
    render(index + delta);
  }

  tiles.forEach((tile, i) => {
    tile.addEventListener("click", () => open(i));
  });

  prevBtn.addEventListener("click", () => step(-1));
  nextBtn.addEventListener("click", () => step(1));
  closeBtn.addEventListener("click", close);

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "Escape") {
      close();
    }
  });
}
