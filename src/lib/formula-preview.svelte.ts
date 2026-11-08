import { getContext, setContext } from 'svelte';

const contextKey = Symbol('formula-previews');

class FormulaPreviews {
  active = $state<symbol | null>(null);

  setOpen(id: symbol, open: boolean) {
    if (open) this.active = id;
    // A delayed close from the previous link must not close the current preview.
    else if (this.active === id) this.active = null;
  }
}

export function provideFormulaPreviews() {
  return setContext(contextKey, new FormulaPreviews());
}

export function useFormulaPreviews() {
  return getContext<FormulaPreviews>(contextKey);
}
