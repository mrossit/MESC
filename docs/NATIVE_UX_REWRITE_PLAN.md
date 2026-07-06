# MESC Native UX Rewrite Plan

> **Status em 2026-07-06:** este plano foi superado pela decisao
> `docs/NATIVE_FRONTEND_REWRITE_DECISION_2026-07-06.md`.
> O caminho final do MVP deixa de ser aprimorar a UI Capacitor/WebView e passa
> a ser reconstruir o frontend mobile como cliente nativo SwiftUI/UIKit no iOS
> e Kotlin/Jetpack Compose no Android. Este documento permanece como historico
> dos sintomas e criterios levantados durante os testes.

## Objective

Replace the remaining PWA-like frontend behavior with a native-first app experience while preserving the backend, mobile API contracts, data model, and TestFlight delivery flow.

## Principles

- Keep Liquid Glass for functional layers: navigation, tab bars, sidebars, transient controls, modals, and active control states.
- Use stable iOS-style materials for content cards so schedules, formation material, questionnaires, and profile data stay legible.
- Avoid horizontal scrolling for primary navigation on phone screens.
- Prefer device integrations through native platform APIs. Capacitor bridges are
  acceptable only enquanto o app WebView existir como baseline temporario.
- Keep every screen usable before visual flourish: readable text, clear states, touch targets, safe areas, and predictable navigation.

## Native Capability Tracks

1. Notifications
   - Use UserNotifications/APNs on iOS and FCM on Android in the final native clients.
   - Request permission only after an explicit user action.
   - Store APNs/FCM tokens in the mobile device registry.
   - Surface a clear build/provisioning error when APNs entitlement is missing.
   - Re-enable Release entitlements only after Apple Developer Push capability and distribution profile are valid.

2. Biometry
   - Use LocalAuthentication on iOS and BiometricPrompt on Android.
   - Prevent biometric loops on expired sessions.
   - Keep manual login as the fallback for expired or revoked credentials.

3. Device Services
   - Add native modules only when the PRD workflow needs them.
   - Candidate modules: Camera for profile/document capture, Geolocation for pastoral visits when approved, Haptics for confirmations, Share/Files for scale export.

4. App Shell
   - Header, bottom tab bar, side menu, dialogs, tabs, switches, and control rows should feel like native surfaces.
   - Respect safe areas, Dynamic Island/notch, dark mode, reduced transparency, and increased contrast.

5. Screen Rewrite Order
   - Settings and device permissions.
   - Mission home.
   - Schedules: calendar, list, export, confirmation.
   - Formation: minister learning flow plus coordinator studio for lessons, content, quizzes, and video sections.
   - Substitutions.
   - Profile and account.
   - Coordinator workflows.

## Release Gate

Each TestFlight candidate must pass:

- Native compiler/type check for the active client.
- Focused unit/integration tests for touched flows.
- Platform build for the active client.
- Visual pass on iPhone viewport for safe areas, no horizontal overflow, touch targets, and dark mode.
- App Store Connect processing state `VALID`.
