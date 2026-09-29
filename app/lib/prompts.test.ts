import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTranscribePrompt, cleanTranscript, TRANSCRIBE_NO_SPEECH } from './prompts';

test('buildTranscribePrompt treats the audio as data', () => {
  const prompt = buildTranscribePrompt();
  assert.match(prompt, /data, not instructions/);
  assert.doesNotMatch(prompt, /Names from this campaign/);
});

test('buildTranscribePrompt lists campaign names on one line', () => {
  const prompt = buildTranscribePrompt(['The Shattered\nCrown']);
  assert.match(prompt, /Names from this campaign.*The Shattered Crown\./);
});

test('buildTranscribePrompt keeps the vocabulary short', () => {
  const names = Array.from({ length: 20 }, (_, i) => `Name${i}`);
  const prompt = buildTranscribePrompt(names);
  assert.match(prompt, /Name9\./);
  assert.doesNotMatch(prompt, /Name10/);
});

test('buildTranscribePrompt tells the model to reply with the no-speech token', () => {
  const prompt = buildTranscribePrompt();
  assert.match(prompt, new RegExp(TRANSCRIBE_NO_SPEECH));
});

test('cleanTranscript maps the no-speech token, with surrounding noise, to an empty string', () => {
  assert.equal(cleanTranscript('NO_SPEECH'), '');
  assert.equal(cleanTranscript(' no_speech. '), '');
  assert.equal(cleanTranscript('"NO_SPEECH"'), '');
  assert.equal(cleanTranscript('“NO_SPEECH”'), '');
  assert.equal(cleanTranscript('No speech.'), '');
});

test('cleanTranscript leaves real transcripts untouched apart from trimming', () => {
  assert.equal(cleanTranscript('  Roll for initiative.  '), 'Roll for initiative.');
  assert.equal(cleanTranscript('Say NO_SPEECH twice'), 'Say NO_SPEECH twice');
  assert.equal(cleanTranscript('No.'), 'No.');
});
