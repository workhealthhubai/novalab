import { reactConfig } from '@osgb/eslint-config/react';

export default [
  { ignores: ['dist/**', 'coverage/**', 'public/ocr/**', 'scripts/**'] },
  ...reactConfig,
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
  },
];
