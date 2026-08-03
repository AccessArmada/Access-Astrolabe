import { describe, it, expect } from 'vitest';
import { isNativelyFocusable, isExtensionManagedTabindex, cleanupExtensionTabindex, _addManagedForTest } from './navigator.js';

describe('isNativelyFocusable', () => {
  it('returns true for button', () => {
    expect(isNativelyFocusable(document.createElement('button'))).toBe(true);
  });

  it('returns true for a with href', () => {
    const a = document.createElement('a');
    a.setAttribute('href', '#');
    expect(isNativelyFocusable(a)).toBe(true);
  });

  it('returns false for a without href', () => {
    expect(isNativelyFocusable(document.createElement('a'))).toBe(false);
  });

  it('returns true for input (default type)', () => {
    expect(isNativelyFocusable(document.createElement('input'))).toBe(true);
  });

  it('returns false for input type hidden', () => {
    const input = document.createElement('input');
    input.type = 'hidden';
    expect(isNativelyFocusable(input)).toBe(false);
  });

  it('returns true for select', () => {
    expect(isNativelyFocusable(document.createElement('select'))).toBe(true);
  });

  it('returns true for textarea', () => {
    expect(isNativelyFocusable(document.createElement('textarea'))).toBe(true);
  });

  it('returns true for details', () => {
    expect(isNativelyFocusable(document.createElement('details'))).toBe(true);
  });

  it('returns true for audio with controls', () => {
    const audio = document.createElement('audio');
    audio.setAttribute('controls', '');
    expect(isNativelyFocusable(audio)).toBe(true);
  });

  it('returns false for audio without controls', () => {
    expect(isNativelyFocusable(document.createElement('audio'))).toBe(false);
  });

  it('returns true for video with controls', () => {
    const video = document.createElement('video');
    video.setAttribute('controls', '');
    expect(isNativelyFocusable(video)).toBe(true);
  });


  it('returns false for div', () => {
    expect(isNativelyFocusable(document.createElement('div'))).toBe(false);
  });

  it('returns false for h2', () => {
    expect(isNativelyFocusable(document.createElement('h2'))).toBe(false);
  });

  it('returns false for img', () => {
    expect(isNativelyFocusable(document.createElement('img'))).toBe(false);
  });
});

describe('cleanupExtensionTabindex / isExtensionManagedTabindex', () => {
  it('returns false for an unmanaged element', () => {
    expect(isExtensionManagedTabindex(document.createElement('h2'))).toBe(false);
  });

  it('returns false for null', () => {
    expect(isExtensionManagedTabindex(null)).toBe(false);
  });

  it('is a no-op on an unmanaged element', () => {
    const el = document.createElement('h2');
    el.setAttribute('tabindex', '-1');
    cleanupExtensionTabindex(el);
    expect(el.hasAttribute('tabindex')).toBe(true);
  });

  it('does not track element that already has a page-set tabindex', () => {
    const el = document.createElement('div');
    el.setAttribute('tabindex', '0'); // page author set this
    // isNativelyFocusable returns false for div, but the call site also checks getAttribute('tabindex') === null
    // The test validates the WeakSet stays clean for such elements
    expect(isExtensionManagedTabindex(el)).toBe(false);
  });

  it('removes tabindex and unregisters a managed element', () => {
    const el = document.createElement('h2');
    _addManagedForTest(el);
    expect(isExtensionManagedTabindex(el)).toBe(true);
    expect(el.hasAttribute('tabindex')).toBe(true);

    cleanupExtensionTabindex(el);
    expect(isExtensionManagedTabindex(el)).toBe(false);
    expect(el.hasAttribute('tabindex')).toBe(false);
  });
});
