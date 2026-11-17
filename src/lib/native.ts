/**
 * Thin bridge between the web app and the Android app (Capacitor).
 * In a normal browser every function falls back to the web API.
 */
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

export async function openExternal(url: string): Promise<void> {
  if (isNative) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

/** Returns false if nothing could share and the caller should fall back to the clipboard. */
export async function shareText(title: string, text: string, url?: string): Promise<boolean> {
  if (isNative) {
    const { Share } = await import('@capacitor/share');
    await Share.share({ title, text, url, dialogTitle: 'Share this fact' });
    return true;
  }
  if (navigator.share) { await navigator.share({ title, text, url }); return true; }
  return false;
}

export function haptic(pattern: number | number[]): void {
  if (isNative) {
    void import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) =>
      Haptics.impact({ style: Array.isArray(pattern) ? ImpactStyle.Medium : ImpactStyle.Light })).catch(() => {});
    return;
  }
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
}

/** Saves a text file: a download in the browser, the share sheet (Drive, email, Files…) in the Android app. */
export async function saveTextFile(name: string, text: string): Promise<void> {
  if (isNative) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const { uri } = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: name, files: [uri], dialogTitle: 'Save your LearnGram backup' });
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/** Android hardware back button. Return true from the handler if it was handled. */
export function onBackButton(handler: () => boolean): () => void {
  if (!isNative) return () => {};
  let remove = () => {};
  void import('@capacitor/app').then(({ App }) =>
    App.addListener('backButton', () => { if (!handler()) void App.exitApp(); })).then((h) => { remove = () => void h.remove(); });
  return () => remove();
}
