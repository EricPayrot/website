/**
 * Book flip gallery — vanilla JS for `/book` only.
 * Spreads: index 0 = cover on the right only; onward = pairs (left, right) from sequential page images.
 */
export type BookPage = {
  src: string;
  alt: string;
  pageNumber: number;
};

const FLIP_MS = 650;

/** Skip redundant network/decode passes for repeats (e.g. flipping back-and-forth). */
const warmedImageSrc = new Set<string>();

function preloadImage(src: string): Promise<void> {
  if (!src.trim()) return Promise.resolve();
  if (warmedImageSrc.has(src)) return Promise.resolve();

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      warmedImageSrc.add(src);
      const finish = (): void => {
        resolve();
      };
      if (typeof img.decode === "function") {
        void img.decode().then(finish).catch(finish);
      } else {
        finish();
      }
    };
    img.onerror = () => {
      resolve();
    };
    img.src = src;
  });
}

export function mountBookFlip(
  root: HTMLElement,
  pages: BookPage[],
): { destroy: () => void } {
  if (pages.length === 0) {
    root.innerHTML =
      '<p class="book-flip__empty">No book page images configured yet.</p>';
    return { destroy: () => {} };
  }

  let spreadIndex = 0;
  let animating = false;
  let midTimer: ReturnType<typeof setTimeout> | undefined;
  let endTimer: ReturnType<typeof setTimeout> | undefined;

  root.innerHTML = "";
  root.classList.add("book-flip-root");

  const reduceMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const live = document.createElement("div");
  live.className = "book-flip__live";
  live.setAttribute("aria-live", "polite");

  const stage = document.createElement("div");
  stage.className = "book-flip__stage";

  const toolbar = document.createElement("div");
  toolbar.className = "book-flip__toolbar";

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "book-flip__btn";
  prevBtn.textContent = "Previous spread";
  prevBtn.setAttribute(
    "aria-label",
    "Previous spread — or click the left page",
  );

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "book-flip__btn";
  nextBtn.textContent = "Next spread";
  nextBtn.setAttribute(
    "aria-label",
    "Next spread — or click the right page",
  );

  toolbar.append(prevBtn, nextBtn);

  const spread = document.createElement("div");
  spread.className = "book-flip__spread";

  stage.append(spread);

  root.append(live, toolbar, stage);

  function srcsForSpreadIndex(idx: number): string[] {
    const srcs: string[] = [];
    const L = idx === 0 ? null : pages[2 * idx - 1];
    const R = idx === 0 ? pages[0] : pages[2 * idx];
    if (L) srcs.push(L.src);
    if (R) srcs.push(R.src);
    return [...new Set(srcs)];
  }

  async function preloadSpreadIndex(idx: number): Promise<void> {
    await Promise.all(srcsForSpreadIndex(idx).map((s) => preloadImage(s)));
  }

  function maxSpreadIndex(): number {
    const n = pages.length;
    if (n <= 1) return 0;
    return Math.ceil((n - 1) / 2);
  }

  function getLeftPage(idx: number): BookPage | null {
    if (idx === 0) return null;
    return pages[2 * idx - 1] ?? null;
  }

  function getRightPage(idx: number): BookPage | null {
    if (idx === 0) return pages[0] ?? null;
    return pages[2 * idx] ?? null;
  }

  function canGoForward(): boolean {
    return spreadIndex < maxSpreadIndex();
  }

  function canGoBack(): boolean {
    return spreadIndex > 0;
  }

  function innerSpreadHtml(): string {
    const left = getLeftPage(spreadIndex);
    const right = getRightPage(spreadIndex);
    const leftHtml = left
      ? innerPageSheet(left, "interior-left")
      : blankPageHtml();
    const rightLayout =
      spreadIndex === 0 && right ? "cover" : ("interior-right" as const);
    const rightHtml = right
      ? innerPageSheet(right, rightLayout)
      : blankPageHtml();
    const leftA11y =
      left && canGoBack() ? ' aria-label="Turn page back"' : "";
    const rightA11y =
      right && canGoForward() ? ' aria-label="Turn page forward"' : "";

    return `
      <div class="book-flip__half book-flip__half--left ${left ? "book-flip__half--active" : "book-flip__half--inactive"} ${left && canGoBack() ? "book-flip__half--clickable" : ""}" data-side="left" role="button" tabindex="${left && canGoBack() ? "0" : "-1"}"${leftA11y}>
        ${leftHtml}
      </div>
      <div class="book-flip__gutter" aria-hidden="true"></div>
      <div class="book-flip__half book-flip__half--right ${right ? "book-flip__half--active" : "book-flip__half--inactive"} ${right && canGoForward() ? "book-flip__half--clickable" : ""}" data-side="right" role="button" tabindex="${right && canGoForward() ? "0" : "-1"}"${rightA11y}>
        ${rightHtml}
      </div>
    `;
  }

  function blankPageHtml(): string {
    return `<div class="book-flip__sheet book-flip__sheet--blank" aria-hidden="true"><div class="book-flip__page-face book-flip__page-face--blank"></div></div>`;
  }

  function innerPageSheet(
    p: BookPage,
    layout: "cover" | "interior-left" | "interior-right",
  ): string {
    const safeSrc = escapeAttr(p.src);
    const safeAlt = escapeAttr(p.alt);
    const frameClass =
      layout === "cover"
        ? "book-flip__frame book-flip__frame--cover"
        : layout === "interior-left"
          ? "book-flip__frame book-flip__frame--interior-left"
          : "book-flip__frame book-flip__frame--interior-right";
    const numClass =
      layout === "cover"
        ? "book-flip__num book-flip__num--cover"
        : "book-flip__num";
    return `
      <div class="book-flip__sheet">
        <div class="book-flip__page-face">
          <div class="${frameClass}">
            <div class="book-flip__img-wrap">
              <img src="${safeSrc}" alt="${safeAlt}" width="456" height="604" loading="eager" decoding="async" draggable="false" fetchpriority="low" />
            </div>
          </div>
          <span class="${numClass}" aria-hidden="true">${p.pageNumber}</span>
        </div>
      </div>`;
  }

  function escapeAttr(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function announce(): void {
    const left = getLeftPage(spreadIndex);
    const right = getRightPage(spreadIndex);
    const parts: string[] = [];
    if (left) parts.push(`Left page ${left.pageNumber}`);
    else parts.push("Cover spread");
    if (right) parts.push(`Right page ${right.pageNumber}`);
    live.textContent = parts.join(". ") + ".";
  }

  function renderSpread(): void {
    spread.innerHTML = innerSpreadHtml() ?? "";
    prevBtn.disabled = !canGoBack();
    nextBtn.disabled = !canGoForward();
    announce();
    void preloadSpreadIndex(spreadIndex + 1);
    if (spreadIndex > 0) void preloadSpreadIndex(spreadIndex - 1);
  }

  function clearTimers(): void {
    if (midTimer) clearTimeout(midTimer);
    if (endTimer) clearTimeout(endTimer);
    midTimer = undefined;
    endTimer = undefined;
  }

  function restoreSpreadChromeAfterFlip(): void {
    animating = false;
    stage.querySelector(".book-flip__leaf")?.remove();
    spread.querySelectorAll(".book-flip__half[data-side]").forEach((node) => {
      (node as HTMLElement).style.removeProperty("visibility");
    });
    prevBtn.disabled = !canGoBack();
    nextBtn.disabled = !canGoForward();
    announce();
  }

  /** Mid-flip already replaced innerHTML; avoid a full re-render here (fixes end-of-turn image flash). */
  function finishAnim(): void {
    restoreSpreadChromeAfterFlip();
  }

  async function beginForwardFlip(): Promise<void> {
    if (!canGoForward() || animating) return;

    if (reduceMotion) {
      spreadIndex += 1;
      renderSpread();
      return;
    }

    animating = true;
    try {
      await preloadSpreadIndex(spreadIndex + 1);
      const rh = spread.querySelector(
        ".book-flip__half--right",
      ) as HTMLElement | null;
      if (!rh || !canGoForward()) {
        animating = false;
        return;
      }

      clearTimers();

      const rect = rh.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();

      const leaf = document.createElement("div");
      leaf.className = "book-flip__leaf book-flip__leaf--forward";
      leaf.style.top = `${rect.top - stageRect.top}px`;
      leaf.style.left = `${rect.left - stageRect.left}px`;
      leaf.style.width = `${rect.width}px`;
      leaf.style.height = `${rect.height}px`;
      leaf.innerHTML = `<div class="book-flip__leaf-inner">${rh.innerHTML}</div>`;

      rh.style.visibility = "hidden";
      stage.appendChild(leaf);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          leaf.classList.add("book-flip__leaf--rotating");
        });
      });

      const halfTime = FLIP_MS * 0.48;
      midTimer = window.setTimeout(() => {
        spreadIndex += 1;
        spread.innerHTML = innerSpreadHtml() ?? "";
        const newRight = spread.querySelector(
          ".book-flip__half--right",
        ) as HTMLElement | null;
        if (newRight) newRight.style.visibility = "hidden";
      }, halfTime);

      endTimer = window.setTimeout(() => {
        finishAnim();
      }, FLIP_MS);
    } catch {
      animating = false;
    }
  }

  async function beginBackwardFlip(): Promise<void> {
    if (!canGoBack() || animating) return;

    if (reduceMotion) {
      spreadIndex -= 1;
      renderSpread();
      return;
    }

    animating = true;
    try {
      await preloadSpreadIndex(spreadIndex - 1);
      const lh = spread.querySelector(
        ".book-flip__half--left",
      ) as HTMLElement | null;
      if (!lh?.classList.contains("book-flip__half--active") || !canGoBack()) {
        animating = false;
        return;
      }

      clearTimers();

      const rect = lh.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();

      const leaf = document.createElement("div");
      leaf.className = "book-flip__leaf book-flip__leaf--backward";
      leaf.style.top = `${rect.top - stageRect.top}px`;
      leaf.style.left = `${rect.left - stageRect.left}px`;
      leaf.style.width = `${rect.width}px`;
      leaf.style.height = `${rect.height}px`;
      leaf.innerHTML = `<div class="book-flip__leaf-inner">${lh.innerHTML}</div>`;

      lh.style.visibility = "hidden";
      stage.appendChild(leaf);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          leaf.classList.add("book-flip__leaf--rotating");
        });
      });

      const halfTime = FLIP_MS * 0.48;
      midTimer = window.setTimeout(() => {
        spreadIndex -= 1;
        spread.innerHTML = innerSpreadHtml() ?? "";
        const newLeft = spread.querySelector(
          ".book-flip__half--left",
        ) as HTMLElement | null;
        if (newLeft) newLeft.style.visibility = "hidden";
      }, halfTime);

      endTimer = window.setTimeout(() => {
        finishAnim();
      }, FLIP_MS);
    } catch {
      animating = false;
    }
  }

  function handleSpreadActivate(ev: Event): void {
    if (animating) return;
    const raw = ev.target;
    if (!raw || !(raw instanceof HTMLElement)) return;
    const half = raw.closest(".book-flip__half[data-side]");
    if (!half || ev.defaultPrevented) return;
    const side = half.getAttribute("data-side");
    if (side === "right" && canGoForward()) {
      ev.preventDefault();
      void beginForwardFlip();
    }
    if (side === "left" && canGoBack()) {
      ev.preventDefault();
      void beginBackwardFlip();
    }
  }

  function handleSpreadHalfKeydown(ev: KeyboardEvent): void {
    if (animating) return;
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const raw = ev.target;
    if (!raw || !(raw instanceof HTMLElement)) return;
    if (!raw.closest(".book-flip__half[data-side]")) return;
    handleSpreadActivate(ev);
  }

  spread.addEventListener("click", handleSpreadActivate);
  spread.addEventListener("keydown", handleSpreadHalfKeydown);

  prevBtn.addEventListener("click", () => {
    void beginBackwardFlip();
  });

  nextBtn.addEventListener("click", () => {
    void beginForwardFlip();
  });

  renderSpread();

  const onKeyDoc = (e: KeyboardEvent) => {
    if (animating) return;
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;
    if (e.key === "ArrowRight" && canGoForward()) void beginForwardFlip();
    if (e.key === "ArrowLeft" && canGoBack()) void beginBackwardFlip();
  };

  document.addEventListener("keydown", onKeyDoc);

  return {
    destroy: () => {
      clearTimers();
      spread.removeEventListener("click", handleSpreadActivate);
      spread.removeEventListener("keydown", handleSpreadHalfKeydown);
      document.removeEventListener("keydown", onKeyDoc);
      root.innerHTML = "";
      root.classList.remove("book-flip-root");
    },
  };
}
