/** Shared contract for client-side interaction modules (keeps islands small and disposable). */
export type Destroyable = {
  destroy: () => void;
};

export type InteractionModule = {
  mount: (root: HTMLElement) => Destroyable;
};
