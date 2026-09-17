import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore
// RCTLinkingManager ships inside React-Core, whose Swift module is `React`
// (imported above). There is no separate React-RCTLinking pod in this
// project, so importing one by name fails the build outright.

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Must run before React Native starts, so any Firebase module the JS
    // bundle touches on first render finds a configured default app.
    FirebaseApp.configure()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)
    /*
     * The colour behind React, for the moments React is not drawing.
     *
     * A UIWindow with no backgroundColor renders black, which shows through
     * during native stack transitions and on rubber-band overscroll — a black
     * seam around a light-mode screen, and the exact counterpart of the white
     * flash that `android:windowBackground` fixes on the other platform.
     *
     * A dynamic UIColor rather than a fixed one so it re-resolves when the
     * system appearance changes, without the app restarting. The two values
     * are `bg.canvas` from src/design-system/theme/colors.ts and must track it.
     */
    window?.backgroundColor = UIColor { traits in
      traits.userInterfaceStyle == .dark
        ? UIColor(red: 0x08 / 255.0, green: 0x08 / 255.0, blue: 0x0C / 255.0, alpha: 1)
        : UIColor(red: 0xF7 / 255.0, green: 0xF7 / 255.0, blue: 0xFA / 255.0, alpha: 1)
    }

    factory.startReactNative(
      withModuleName: "AIPromptGallery",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  // MARK: - Deep links

  /*
   * Custom scheme: promptkalai://prompt/<id>
   *
   * iOS hands the URL to the app here, and RCTLinkingManager forwards it to
   * JS where React Navigation's `linking` config maps it to a screen. Without
   * this method the scheme is registered in Info.plist but nothing ever
   * receives what it opens.
   */
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    RCTLinkingManager.application(app, open: url, options: options)
  }

  /*
   * Universal Links: https://notesapp-ed63a.web.app/prompt/<id>
   *
   * Arrives as a user activity rather than a URL, and only once the site serves
   * /.well-known/apple-app-site-association AND the app carries the matching
   * associated-domains entitlement. Until then iOS opens Safari instead, which
   * is the intended fallback.
   */
  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    RCTLinkingManager.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    )
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
