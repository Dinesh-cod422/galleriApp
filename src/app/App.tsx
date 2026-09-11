import React from 'react';

import { KitchenSinkScreen } from '../dev/KitchenSinkScreen';
import { AppProviders } from './providers/AppProviders';

/**
 * Phase 1: the foundation is the deliverable, so the app renders the design
 * system's Kitchen Sink. Phase 3 replaces the child with <RootNavigator />.
 */
const App = (): React.JSX.Element => (
  <AppProviders>
    <KitchenSinkScreen />
  </AppProviders>
);

export default App;
