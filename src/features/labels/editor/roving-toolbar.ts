/**
 * The roving tabindex a `role="toolbar"` promises.
 *
 * A toolbar is one Tab stop: Tab enters it on the button last used and leaves
 * it on the next thing after it, and the arrow keys move between its buttons.
 * Without this every button is its own stop, and the Editor actions alone are
 * eight presses of Tab to get past -- which is what assistive technology was
 * told a toolbar would spare the user.
 *
 * Only Left, Right, Home and End belong to the toolbar. Up and Down are left to
 * bubble on purpose: these toolbars wrap onto several rows on a narrow screen,
 * so "down" names no button reliably, and the editor already gives those keys
 * a meaning -- nudging the selection -- that stays available wherever focus is.
 *
 * Disabled buttons are skipped rather than made focusable. A native `disabled`
 * button cannot take focus at all, so the stop has to move off one that
 * becomes disabled under it, and `syncRovingTabindex` is what moves it.
 */

/** The buttons a toolbar's arrow keys visit, nested groups included, in order. */
function items(toolbar: HTMLElement): HTMLButtonElement[] {
  return [...toolbar.querySelectorAll<HTMLButtonElement>('button')].filter(
    (button) => !button.disabled
  );
}

/** Make `current` the toolbar's one Tab stop. */
function rove(toolbar: HTMLElement, current: HTMLButtonElement): void {
  for (const button of toolbar.querySelectorAll<HTMLButtonElement>('button')) {
    button.tabIndex = button === current ? 0 : -1;
  }
}

/**
 * Give the toolbar exactly one Tab stop.
 *
 * Called after every render, because a render is what disables the button
 * that held the stop -- Delete, once nothing is selected; Undo, once there is
 * nothing to undo -- and a toolbar whose only stop is disabled cannot be
 * reached by Tab at all. The stop stays where the user left it whenever it
 * still can.
 */
export function syncRovingTabindex(toolbar: HTMLElement): void {
  const enabled = items(toolbar);
  const held = enabled.find((button) => button.getAttribute('tabindex') === '0');
  const current = held ?? enabled[0];
  if (current) rove(toolbar, current);
}

/** Moves the stop to whichever button took focus, by Tab, arrow or pointer. */
export function onToolbarFocusIn(event: FocusEvent): void {
  const toolbar = event.currentTarget as HTMLElement;
  const target = event.target;
  if (target instanceof HTMLButtonElement && !target.disabled && toolbar.contains(target)) {
    rove(toolbar, target);
  }
}

/** Left and Right step through the toolbar, wrapping; Home and End jump to its ends. */
export function onToolbarKeyDown(event: KeyboardEvent): void {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const toolbar = event.currentTarget as HTMLElement;
  const enabled = items(toolbar);
  if (enabled.length === 0) return;
  const from = enabled.indexOf(event.target as HTMLButtonElement);
  if (from === -1) return;

  let to: number;
  switch (event.key) {
    case 'ArrowRight':
      to = (from + 1) % enabled.length;
      break;
    case 'ArrowLeft':
      to = (from - 1 + enabled.length) % enabled.length;
      break;
    case 'Home':
      to = 0;
      break;
    case 'End':
      to = enabled.length - 1;
      break;
    default:
      return;
  }
  // Stopped here, not merely prevented: the editor's own keydown handler on
  // `.layout` reads these same arrows as a nudge of the selection.
  event.preventDefault();
  event.stopPropagation();
  rove(toolbar, enabled[to]);
  enabled[to].focus();
}
