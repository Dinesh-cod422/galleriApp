module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.tsx', '.android.tsx', '.tsx', '.ios.ts', '.android.ts', '.ts', '.json'],
        alias: {
          '@app': './src/app',
          '@core': './src/core',
          '@ds': './src/design-system',
          '@features': './src/features',
          '@infra': './src/infrastructure',
          '@assets': './src/assets',
        },
      },
    ],
    // MUST stay last: the worklets plugin (Reanimated 4) rewrites worklet
    // functions and needs to see the fully-transformed output.
    'react-native-worklets/plugin',
  ],
};
