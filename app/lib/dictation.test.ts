import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DICTATION_HELP,
  DICTATION_NOTES,
  blockedMicHelp,
  formatDictationClock,
  insertDictation,
  normalizeAudioMediaType,
  pickRecorderMimeType,
  rmsLevel,
  shouldStartSpaceDictation,
  type SpaceGateInput,
} from './dictation';

test('insertDictation fills an empty input', () => {
  assert.deepEqual(insertDictation('', 0, 0, 'a goblin ambush'), {
    value: 'a goblin ambush',
    start: 0,
    end: 15,
  });
});

test('insertDictation adds a space after a word', () => {
  assert.deepEqual(insertDictation('Draw', 4, 4, 'a tavern'), {
    value: 'Draw a tavern',
    start: 5,
    end: 13,
  });
});

test('insertDictation pads only the side that needs it in the middle of text', () => {
  assert.equal(insertDictation('Draw tavern', 4, 4, 'a dwarven').value, 'Draw a dwarven tavern');
});

test('insertDictation adds no space before punctuation', () => {
  assert.equal(insertDictation('Add .', 4, 4, 'a door').value, 'Add a door.');
});

test('insertDictation replaces the selection', () => {
  assert.deepEqual(insertDictation('Draw a cave map', 7, 11, 'swamp'), {
    value: 'Draw a swamp map',
    start: 7,
    end: 12,
  });
});

test('insertDictation trims the transcript', () => {
  assert.equal(insertDictation('', 0, 0, '  hello  ').value, 'hello');
});

test('insertDictation with empty text leaves the value alone', () => {
  assert.deepEqual(insertDictation('keep', 2, 4, '   '), { value: 'keep', start: 2, end: 2 });
});

test('the no-microphone note is plain', () => {
  assert.equal(DICTATION_NOTES.noMic, 'No microphone found.');
});

test('dictation notes never mention services, quotas, rate limits, or models', () => {
  const help = [DICTATION_HELP.title, ...DICTATION_HELP.browsers, DICTATION_HELP.usage];
  for (const note of [...Object.values(DICTATION_NOTES), ...help]) {
    assert.doesNotMatch(
      note,
      /\b(services?|quotas?|rate|limits?|models?|gemini|servers?)\b/i,
      note,
    );
  }
});

const ready: SpaceGateInput = {
  key: ' ',
  repeat: false,
  isComposing: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  focus: 'chat-input',
  chatInputValue: '',
  modalOpen: false,
  chatReady: true,
  dictationAvailable: true,
};

test('Space starts dictation in an empty, focused chat input', () => {
  assert.equal(shouldStartSpaceDictation(ready), true);
});

test('Space starts dictation when the input holds only whitespace', () => {
  assert.equal(shouldStartSpaceDictation({ ...ready, chatInputValue: '  \n' }), true);
});

test('Space types a space when the focused input has text', () => {
  assert.equal(shouldStartSpaceDictation({ ...ready, chatInputValue: 'Draw' }), false);
});

test('Space starts dictation with nothing focused, even when the input has text', () => {
  assert.equal(
    shouldStartSpaceDictation({ ...ready, focus: 'none', chatInputValue: 'Draw' }),
    true,
  );
});

test('Space never starts dictation during IME composition', () => {
  assert.equal(shouldStartSpaceDictation({ ...ready, isComposing: true }), false);
});

test('Space gate rejects every other blocking condition', () => {
  const blocked: Partial<SpaceGateInput>[] = [
    { key: 'a' },
    { repeat: true },
    { altKey: true },
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { focus: 'other-control' },
    { focus: 'mic-button' },
    { modalOpen: true },
    { chatReady: false },
    { dictationAvailable: false },
  ];
  for (const change of blocked) {
    assert.equal(shouldStartSpaceDictation({ ...ready, ...change }), false, JSON.stringify(change));
  }
});

test('normalizeAudioMediaType strips codecs and case', () => {
  assert.equal(normalizeAudioMediaType('audio/webm;codecs=opus'), 'audio/webm');
  assert.equal(normalizeAudioMediaType('AUDIO/MP4'), 'audio/mp4');
  assert.equal(normalizeAudioMediaType('audio/ogg; codecs=opus'), 'audio/ogg');
});

test('normalizeAudioMediaType rejects other types', () => {
  assert.equal(normalizeAudioMediaType('video/webm'), null);
  assert.equal(normalizeAudioMediaType('text/plain'), null);
  assert.equal(normalizeAudioMediaType(''), null);
});

test('pickRecorderMimeType prefers Ogg Opus, then WebM, then MP4', () => {
  // Firefox supports both; its WebM recordings reach Gemini as silence
  assert.equal(
    pickRecorderMimeType(() => true),
    'audio/ogg;codecs=opus',
  );
  // Chrome can't record Ogg
  assert.equal(
    pickRecorderMimeType(t => t.startsWith('audio/webm')),
    'audio/webm;codecs=opus',
  );
  assert.equal(
    pickRecorderMimeType(t => t === 'audio/mp4'),
    'audio/mp4',
  );
  assert.equal(
    pickRecorderMimeType(() => false),
    undefined,
  );
});

test('rmsLevel', () => {
  assert.equal(rmsLevel(new Float32Array(0)), 0);
  assert.equal(rmsLevel(new Float32Array(8)), 0);
  assert.equal(rmsLevel(new Float32Array([0.5, -0.5])), 0.5);
});

test('formatDictationClock counts up, then down in the last 10 seconds', () => {
  assert.deepEqual(formatDictationClock(7_000), { label: '0:07', countdown: false });
  assert.deepEqual(formatDictationClock(49_999), { label: '0:49', countdown: false });
  assert.deepEqual(formatDictationClock(50_000), { label: '10s left', countdown: true });
  assert.deepEqual(formatDictationClock(59_500), { label: '1s left', countdown: true });
  assert.deepEqual(formatDictationClock(61_000), { label: '0s left', countdown: true });
});

test('blockedMicHelp names the steps for each browser', () => {
  const ua = {
    iosSafari:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    iosChrome:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1',
    firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
    edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0',
    android:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
    chrome:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
    safari:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  };
  assert.match(blockedMicHelp(ua.iosSafari), /aA/);
  assert.match(blockedMicHelp(ua.iosChrome), /iOS Settings/);
  assert.match(blockedMicHelp(ua.firefox), /crossed-out microphone/);
  assert.match(blockedMicHelp(ua.edge), /lock icon/);
  assert.match(blockedMicHelp(ua.android), /Permissions/);
  assert.match(blockedMicHelp(ua.chrome), /site settings icon/);
  assert.match(blockedMicHelp(ua.safari), /Settings for This Website/);
  assert.match(blockedMicHelp(''), /browser settings/);
});
