import { describe, expect, it } from 'vitest';

import { parseRoomCodeInput } from '@/lib/parse-room-code';

const CODE = 'abc-defg-hjk';

describe('parseRoomCodeInput', () => {
  it('accepts a bare code', () => {
    expect(parseRoomCodeInput(CODE)).toEqual({ code: CODE, fragment: '' });
  });

  it('trims surrounding whitespace', () => {
    expect(parseRoomCodeInput(`  ${CODE}\n`)).toEqual({ code: CODE, fragment: '' });
  });

  it('lowercases a capitalised code', () => {
    expect(parseRoomCodeInput('ABC-DEFG-HJK')).toEqual({ code: CODE, fragment: '' });
  });

  it('pulls the code out of a full share link', () => {
    expect(parseRoomCodeInput(`https://videocircle.example/room/${CODE}`)).toEqual({
      code: CODE,
      fragment: '',
    });
  });

  it('accepts a link from an origin that is not ours', () => {
    expect(parseRoomCodeInput(`http://localhost:3000/room/${CODE}`)?.code).toBe(CODE);
  });

  it('drops a query string', () => {
    expect(parseRoomCodeInput(`https://videocircle.example/room/${CODE}?utm_source=x`)).toEqual({
      code: CODE,
      fragment: '',
    });
  });

  it('survives a trailing slash', () => {
    expect(parseRoomCodeInput(`https://videocircle.example/room/${CODE}/`)?.code).toBe(CODE);
  });

  it('finds a code that is not the last segment', () => {
    expect(parseRoomCodeInput(`https://videocircle.example/en/room/${CODE}/lobby`)?.code).toBe(
      CODE,
    );
  });

  describe('the fragment', () => {
    it('is carried through with its leading hash', () => {
      expect(parseRoomCodeInput(`https://videocircle.example/room/${CODE}#k=SECRET`)).toEqual({
        code: CODE,
        fragment: '#k=SECRET',
      });
    });

    // The key is base64url and case-sensitive. Normalising the code must never
    // reach it, or the key silently decodes to the wrong bytes.
    it('keeps its case while the code is lowercased', () => {
      expect(
        parseRoomCodeInput(`HTTPS://VIDEOCIRCLE.EXAMPLE/ROOM/ABC-DEFG-HJK#k=aBcD_-19`),
      ).toEqual({ code: CODE, fragment: '#k=aBcD_-19' });
    });

    it('survives on a bare code', () => {
      expect(parseRoomCodeInput(`${CODE}#k=SECRET`)).toEqual({ code: CODE, fragment: '#k=SECRET' });
    });

    it('is carried even when it is not a chat key, since it is opaque here', () => {
      expect(parseRoomCodeInput(`${CODE}#anything`)?.fragment).toBe('#anything');
    });

    it('is preserved ahead of a query string that follows the code', () => {
      expect(parseRoomCodeInput(`https://x.example/room/${CODE}?a=1#k=SECRET`)).toEqual({
        code: CODE,
        fragment: '#k=SECRET',
      });
    });
  });

  describe('rejects', () => {
    it.each([
      ['empty', ''],
      ['whitespace only', '   '],
      ['a code with a forbidden character', 'abc-defg-hij'],
      ['a truncated code', 'abc-defg'],
      ['prose', 'lets hop on a call'],
      ['a link with no code in it', 'https://videocircle.example/history'],
      ['a fragment but no code', '#k=SECRET'],
    ])('%s', (_label, raw) => {
      expect(parseRoomCodeInput(raw)).toBeNull();
    });
  });
});
