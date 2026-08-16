# Android Native Compose Foundation

## Decision

The previous Android target was a Capacitor `BridgeActivity` that embedded the legacy web interface. It was not equivalent to the SwiftUI iOS client and surfaced a WebView startup error on a paired Android test device.

The Android app now starts through `ComponentActivity` and Jetpack Compose. The package identifier remains `app.saojudastadeu.mesc`, so an Android device receives the native client as an in-place update.

## Current Native Scope

- encrypted session storage and mobile API login/refresh;
- native Mission screen with presence confirmation;
- native schedule list using the published community schedule;
- native formation overview;
- native profile summary and logout;
- native notification permission request and biometric capability detection;
- liturgical wine, gold and ivory visual foundation with translucent glass surfaces.

The client talks only to `/api/mobile/v1` and keeps the community, device and idempotency headers used by iOS.

## Remaining Parity Work

- biometric unlock with the renewable mobile session stored in Android Keystore;
- push token registration and server-side device linkage;
- questionnaire answers, substitutions and notification center;
- formation lesson reader, completion and coordinator studio;
- profile editing, photo capture and account deletion;
- calendar month view, official export and coordinator schedule management.

## Local Validation

With JDK 21 and the Android SDK configured:

```bash
cd android
./gradlew :app:assembleDebug
./gradlew :app:lintDebug
```

The first Compose candidate is Android build `5.4.7 (50465)`.
