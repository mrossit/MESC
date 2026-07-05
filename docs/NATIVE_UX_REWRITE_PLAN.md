# MESC Native UX Rewrite Plan

## Objective

Replace the remaining PWA-like frontend behavior with a native-first app experience while preserving the backend, mobile API contracts, data model, and TestFlight delivery flow.

## Principles

- Keep Liquid Glass for functional layers: navigation, tab bars, sidebars, transient controls, modals, and active control states.
- Use stable iOS-style materials for content cards so schedules, formation material, questionnaires, and profile data stay legible.
- Avoid horizontal scrolling for primary navigation on phone screens.
- Prefer device integrations through Capacitor bridges instead of browser APIs in native builds.
- Keep every screen usable before visual flourish: readable text, clear states, touch targets, safe areas, and predictable navigation.

## Native Capability Tracks

1. Notifications
   - Use Capacitor Push Notifications in native builds.
   - Request permission only after an explicit user action.
   - Store APNs/FCM tokens in the mobile device registry.
   - Surface a clear build/provisioning error when APNs entitlement is missing.
   - Re-enable Release entitlements only after Apple Developer Push capability and distribution profile are valid.

2. Biometry
   - Keep Capgo Native Biometric for Face ID/Touch ID.
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
   - Formation.
   - Substitutions.
   - Profile and account.
   - Coordinator workflows.

## Release Gate

Each TestFlight candidate must pass:

- TypeScript check.
- Focused unit/integration tests for touched flows.
- `build:mobile` and `cap sync ios`.
- Visual pass on iPhone viewport for safe areas, no horizontal overflow, touch targets, and dark mode.
- App Store Connect processing state `VALID`.
