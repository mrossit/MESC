import UIKit
import Capacitor

// The bottom tab-bar "liquid glass" is rendered in CSS on the web layer
// (-webkit-backdrop-filter: blur+saturate on .ios-glass-bar), which WebKit
// fully supports. A native UIVisualEffectView overlay was tried but cannot
// work in a hybrid WebView: placed behind the web content it has nothing to
// blur (renders transparent); placed in front it covers the tab buttons.
// So we keep the standard Capacitor controller with an opaque web view.
class AppViewController: CAPBridgeViewController {
}
