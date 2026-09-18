import { registerRootComponent } from 'expo';

import App from './App';
// Paints the NUMI boot card into the page before any React code runs, so the web
// build never shows an empty rectangle while the bundle downloads.
import './src/services/boot';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
