package com.promptkalai

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Hands the window back to the app theme as soon as the activity exists.
   *
   * The activity LAUNCHES with BootTheme so the brand splash is the first thing
   * drawn instead of a white window. Left in place, that splash drawable stays
   * behind every screen for the life of the activity and shows through wherever
   * the UI is transparent. Swapping here keeps the splash for exactly as long
   * as it is useful — until there is something to draw over it.
   *
   * Before super.onCreate, which is where the window's decor is built.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme)
    super.onCreate(savedInstanceState)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "AIPromptGallery"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
