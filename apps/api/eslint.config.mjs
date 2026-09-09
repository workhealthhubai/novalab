import { nestConfig } from '@osgb/eslint-config/nest';

export default [
  { ignores: ['src/generated/**', 'dist/**', 'coverage/**'] },
  ...nestConfig,
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
  },
];
