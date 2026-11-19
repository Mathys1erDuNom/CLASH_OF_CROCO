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

// A tap fires on release only if the finger barely moved, so dragging to scroll a list never triggers a button.
// The action is read at press time, so a re-render between press and release cannot swallow it.
let press: { act: string; arg: string; x: number; y: number } | null = null;
panel.addEventListener('pointerdown', e => {
  const el = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
  press = el && !el.disabled ? { act: el.dataset.act!, arg: el.dataset.arg ?? '', x: e.clientX, y: e.clientY } : null;
});
panel.addEventListener('pointerup', e => {
  if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 10) onAction(press.act, press.arg);
  press = null;
});
panel.addEventListener('pointercancel', () => { press = null; }); // the browser took over to scroll
panel.addEventListener('scroll', () => { press = null; }, true);

export const secs = (ms: number) => `${Math.max(0, Math.ceil(ms / 1000))}s`;
