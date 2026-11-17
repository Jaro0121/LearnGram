# Releasing LearnGram

Everything is built by GitHub Actions — you can do a release from your phone.

## Web app (automatic)

Every push to `main` runs the unit tests, the end-to-end test and deploys to GitHub Pages
(**Settings → Pages → Source: GitHub Actions** must be set once). Installed copies update themselves on next launch.

## Android app

Every push to `main` builds the Android app; download it from the workflow run's **Artifacts** section.

### Publish a release (APK on the Releases page)

1. Bump `"version"` in `package.json` (e.g. `1.0.1`) and add a line to `CHANGELOG.md`. The Android version code is derived from it.
2. On GitHub: **Releases → Draft a new release** → tag `v1.0.1` → **Publish release**.
3. The **Android app** workflow attaches the APK (and AAB if signed) to the release a few minutes later.

### Signing (needed for Google Play and for seamless updates)

Without a signing key the workflow builds a **debug** APK. It installs fine, but each CI run uses a different debug
key, so Android will refuse to *update* over it — users have to uninstall first. For a real release, create one key once
and keep it safe forever (losing it means you can never update the app):

```bash
keytool -genkeypair -v -keystore learngram.jks -alias learngram -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 learngram.jks > learngram.jks.b64     # macOS: base64 -i learngram.jks
```

Add these repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | contents of `learngram.jks.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | `learngram` |
| `ANDROID_KEY_PASSWORD` | key password |

From then on the workflow produces a signed `LearnGram-x.y.z.apk` and `LearnGram-x.y.z.aab`.

### Google Play checklist

- Developer account (one-time $25), upload the signed `.aab`.
- App name: **LearnGram** · Category: **Education** · Content rating: Everyone.
- Privacy policy URL: `https://jaro0121.github.io/LearnGram/privacy.html`
- Data safety form: *No data collected, no data shared* (everything stays on the device).
- Screenshots: `public/screenshots/*.png` · Feature graphic: make a 1024×500 version of `public/og.png`.
- Short description: *Swipe through facts like a video feed — and actually remember them.*

## iPhone

The web app installs on iPhone via Safari → Share → Add to Home Screen. A native App Store build needs a Mac with
Xcode (`npm i @capacitor/ios && npx cap add ios`) and an Apple Developer account ($99/year).
