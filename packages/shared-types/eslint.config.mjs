import { baseConfig } from '@osgb/eslint-config/base';

export default [
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
  },
];
