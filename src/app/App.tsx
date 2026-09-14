import React from 'react';

import { AppProviders } from './providers/AppProviders';
import { RootNavigator } from './navigation/RootNavigator';

const App = (): React.JSX.Element => (
  <AppProviders>
    <RootNavigator />
  </AppProviders>
);

export default App;
