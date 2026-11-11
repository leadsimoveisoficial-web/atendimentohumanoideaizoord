/** Browsing never requests narration; it cancels any previously requested presentation. */
export function browseMenu(commands: { stop: () => void } | null, updateSelection: () => void) {
  commands?.stop();
  updateSelection();
}