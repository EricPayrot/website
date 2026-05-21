/**
 * Starter pattern for an isolated interaction: mount once, return destroy() for cleanup.
 * Copy this file when adding an effect; keep one visual concern per module.
 */
import type { Destroyable, InteractionModule } from "./types";

const init: InteractionModule = {
  mount(root: HTMLElement): Destroyable {
    const onClick = () => {
      root.classList.toggle("is-active");
    };

    root.addEventListener("click", onClick);

    return {
      destroy() {
        root.removeEventListener("click", onClick);
      },
    };
  },
};

export default init;
