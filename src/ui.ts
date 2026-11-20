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
  if (html === last) return;
  // keep the scroll position of scrollable lists (data-scroll="name") across re-renders
  const pos = new Map([...panel.querySelectorAll<HTMLElement>('[data-scroll]')].map(el => [el.dataset.scroll, [el.scrollTop, el.scrollLeft]]));
  panel.innerHTML = html;
  last = html;
  for (const el of panel.querySelectorAll<HTMLElement>('[data-scroll]')) {
    const p = pos.get(el.dataset.scroll);
    if (p) [el.scrollTop, el.scrollLeft] = p;
  }
  updateBars();
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
panel.addEventListener('scroll', () => { press = null; updateBars(); }, true);
addEventListener('resize', updateBars);

/** Draws our own scrollbar next to each list (phones hide native scrollbars until you scroll). */
function updateBars() {
  for (const el of panel.querySelectorAll<HTMLElement>('[data-scroll]')) {
    const bar = el.nextElementSibling as HTMLElement | null;
    if (!bar?.classList.contains('sbar')) continue;
    const h = bar.classList.contains('h');
    const view = h ? el.clientWidth : el.clientHeight, full = h ? el.scrollWidth : el.scrollHeight, pos = h ? el.scrollLeft : el.scrollTop;
    bar.hidden = full <= view + 1;
    const size = Math.max(0.15, view / full), at = full > view ? (pos / (full - view)) * (1 - size) : 0;
    const thumb = bar.firstElementChild as HTMLElement;
    thumb.style[h ? 'width' : 'height'] = `${size * 100}%`;
    thumb.style[h ? 'left' : 'top'] = `${at * 100}%`;
  }
}

export const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
export const secs = (ms: number) => `${Math.max(0, Math.ceil(ms / 1000))}s`;
