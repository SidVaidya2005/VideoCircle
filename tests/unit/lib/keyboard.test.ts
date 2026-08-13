import { describe, expect, it } from 'vitest';

import { isPlainKeypress, isTypingElement, type KeyChord } from '@/lib/keyboard';

const BARE: KeyChord = {
  repeat: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
};

describe('isTypingElement', () => {
  it('claims nothing typed into a text field', () => {
    expect(isTypingElement('INPUT', false)).toBe(true);
    expect(isTypingElement('TEXTAREA', false)).toBe(true);
    expect(isTypingElement('SELECT', false)).toBe(true);
  });

  it('treats an editable region as typing even when the tag is not', () => {
    // True for a caret inside a nested child, which is why the hook reads
    // isContentEditable rather than the attribute.
    expect(isTypingElement('DIV', true)).toBe(true);
    expect(isTypingElement('SPAN', true)).toBe(true);
  });

  it('leaves ordinary elements alone', () => {
    for (const tag of ['DIV', 'BUTTON', 'MAIN', 'VIDEO', 'LI']) {
      expect(isTypingElement(tag, false)).toBe(false);
    }
  });

  it('does not care how the tag name is cased', () => {
    // Property access gives uppercase, but a caller reading an attribute or a
    // synthetic event may not.
    expect(isTypingElement('input', false)).toBe(true);
    expect(isTypingElement('TextArea', false)).toBe(true);
  });

  it('does not mistake a button for a text field', () => {
    // The control bar is buttons. If this ever returned true the shortcuts would
    // stop working the moment a control had focus — i.e. right after you clicked one.
    expect(isTypingElement('BUTTON', false)).toBe(false);
  });
});

describe('isPlainKeypress', () => {
  it('accepts a bare first press', () => {
    expect(isPlainKeypress(BARE)).toBe(true);
  });

  it('rejects every modifier, so browser chords keep working', () => {
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const) {
      expect(isPlainKeypress({ ...BARE, [modifier]: true })).toBe(false);
    }
  });

  it('rejects a held key', () => {
    // Each toggle re-acquires hardware; auto-repeat would do that dozens of
    // times a second.
    expect(isPlainKeypress({ ...BARE, repeat: true })).toBe(false);
  });
});
