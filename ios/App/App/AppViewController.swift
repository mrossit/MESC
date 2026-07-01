import UIKit
import WebKit
import Capacitor

class AppViewController: CAPBridgeViewController {
    private let nativeContainerView = UIView()
    private var didInstallContainer = false

    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        let webView = super.webView(with: frame, configuration: configuration)
        configureTransparentWebView(webView)
        return webView
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        installContainerIfNeeded()
        bridge?.registerPluginInstance(NativeGlassPlugin())
    }

    private func configureTransparentWebView(_ webView: WKWebView) {
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
    }

    private func installContainerIfNeeded() {
        guard !didInstallContainer, let webView = webView else { return }
        didInstallContainer = true

        nativeContainerView.frame = webView.frame
        nativeContainerView.backgroundColor = .clear
        nativeContainerView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        view = nativeContainerView

        webView.translatesAutoresizingMaskIntoConstraints = false
        nativeContainerView.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: nativeContainerView.topAnchor),
            webView.leadingAnchor.constraint(equalTo: nativeContainerView.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: nativeContainerView.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: nativeContainerView.bottomAnchor)
        ])
    }
}

@objc(NativeGlassPlugin)
public class NativeGlassPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeGlassPlugin"
    public let jsName = "NativeGlass"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "showTabBarGlass", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hide", returnType: CAPPluginReturnPromise)
    ]

    private var effectView: UIVisualEffectView?
    private var heightConstraint: NSLayoutConstraint?
    private var requestedHeight: CGFloat = 60

    override public func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(updateHeightFromNotification),
            name: .capacitorViewWillTransition,
            object: nil
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc func showTabBarGlass(_ call: CAPPluginCall) {
        let height = max(CGFloat(call.getDouble("height", 60)), 1)

        DispatchQueue.main.async { [weak self] in
            self?.show(height: height)
            call.resolve()
        }
    }

    @objc func hide(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.hideGlass()
            call.resolve()
        }
    }

    private func show(height: CGFloat) {
        requestedHeight = height

        guard let rootView = bridge?.viewController?.view else { return }
        let glassView = effectView ?? makeEffectView()

        if glassView.superview == nil {
            glassView.translatesAutoresizingMaskIntoConstraints = false
            rootView.insertSubview(glassView, at: 0)

            let heightConstraint = glassView.heightAnchor.constraint(equalToConstant: height + rootView.safeAreaInsets.bottom)
            self.heightConstraint = heightConstraint

            NSLayoutConstraint.activate([
                glassView.leadingAnchor.constraint(equalTo: rootView.leadingAnchor),
                glassView.trailingAnchor.constraint(equalTo: rootView.trailingAnchor),
                glassView.bottomAnchor.constraint(equalTo: rootView.bottomAnchor),
                heightConstraint
            ])
        }

        glassView.effect = makeGlassEffect()
        updateHeight()
        rootView.layoutIfNeeded()
    }

    private func hideGlass() {
        effectView?.removeFromSuperview()
        effectView = nil
        heightConstraint = nil
    }

    private func makeEffectView() -> UIVisualEffectView {
        let glassView = UIVisualEffectView(effect: makeGlassEffect())
        glassView.isUserInteractionEnabled = false
        glassView.backgroundColor = .clear
        effectView = glassView
        return glassView
    }

    private func updateHeight() {
        guard let rootView = bridge?.viewController?.view else { return }
        heightConstraint?.constant = requestedHeight + rootView.safeAreaInsets.bottom
    }

    @objc private func updateHeightFromNotification() {
        DispatchQueue.main.async { [weak self] in
            self?.updateHeight()
        }
    }

    private func makeGlassEffect() -> UIVisualEffect {
        if #available(iOS 26.0, *),
           let glassEffectClass = NSClassFromString("UIGlassEffect") as? NSObject.Type {
            let newSelector = NSSelectorFromString("new")
            let glassEffectFactory = glassEffectClass as AnyObject
            if glassEffectFactory.responds(to: newSelector),
               let effect = glassEffectFactory.perform(newSelector)?.takeUnretainedValue() as? UIVisualEffect {
                return effect
            }
        }

        return UIBlurEffect(style: .systemChromeMaterial)
    }
}
