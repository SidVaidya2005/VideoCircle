/** Elements where a bare letter key is text, not a command. */
const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** The parts of a `KeyboardEvent` that decide whether it is a bare keypress. */
export interface KeyChord {
  repeat: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

/**
 * Whether a keystroke landed somewhere the user is typing.
 *
 * Takes the element's facts rather than the element, so the decision is testable
 * under Node — the unit suite has no DOM by design. The hook does the narrowing
 * and passes what it read.
 *
 * `isContentEditable` rather than the attribute: it is true for a caret inside a
 * nested child of an editable region, which the attribute alone would miss.
 */
export function isTypingElement(tagName: string, isContentEditable: boolean): boolean {
  return TYPING_TAGS.has(tagName.toUpperCase()) || isContentEditable;
}

/**
 * Whether this is a bare, first-press keystroke — the only kind a single-letter
 * shortcut may claim.
 *
 * Modifiers disqualify it so the browser's own chords keep working: `d` toggles
 * the microphone, but Cmd-D must stay a bookmark. Repeats disqualify it because
 * holding a key would otherwise toggle a device dozens of times a second, and
 * each toggle re-acquires hardware.
 */
export function isPlainKeypress(chord: KeyChord): boolean {
  return !chord.repeat && !chord.altKey && !chord.ctrlKey && !chord.metaKey && !chord.shiftKey;
}
