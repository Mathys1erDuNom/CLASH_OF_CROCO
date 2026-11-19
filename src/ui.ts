// Side panel in plain DOM. Scenes register a render function and an action handler.
const panel = document.getElementById('panel')!;
let render: () => string = () => '';
let onAction: (act: string, arg: string) => void = () => {};
let last = '';

export function setPanel(r: () => string, a: (act: string, arg: string) => void) {
  render = r; onAction = a; last = ''; refresh();
}

/** Re-renders only when the HTML changed, so buttons are not rebuilt every frame. */
export function refresh() {
  const html = render();
  if (html !== last) { panel.innerHTML = html; last = html; }
}

// pointerdown (not click) so a re-render between press and release cannot swallow the action
panel.addEventListener('pointerdown', e => {
  const el = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
  if (el && !el.disabled) onAction(el.dataset.act!, el.dataset.arg ?? '');
});

export const secs = (ms: number) => `${Math.max(0, Math.ceil(ms / 1000))}s`;
