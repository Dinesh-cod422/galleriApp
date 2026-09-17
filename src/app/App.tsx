import React from 'react';

import { AppProviders } from './providers/AppProviders';
import { RootNavigator } from './navigation/RootNavigator';
import { AnimatedSplash } from './splash/AnimatedSplash';

/**
 * The splash wraps the navigator rather than replacing it: the app mounts and
 * begins fetching immediately, underneath the curtain, so the animation costs
 * no startup time.
 */
const App = (): React.JSX.Element => (
  <AppProviders>
    <AnimatedSplash>
      <RootNavigator />
    </AnimatedSplash>
  </AppProviders>
);

export default App;
