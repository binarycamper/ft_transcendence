module.exports = {
	env: {
		browser: true,
	},
	extends: [
		'eslint:recommended',
		'plugin:react/jsx-runtime',
		'plugin:react/recommended',
		'plugin:react-hooks/recommended',
		/* 'plugin:typescript-sort-keys/recommended', */
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
		'plugin:@typescript-eslint/recommended-type-checked',
		'plugin:@typescript-eslint/stylistic-type-checked',
	],
	ignorePatterns: ['.eslintrc.cjs', '/dist', 'vite.config.ts'],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaFeatures: { jsx: true },
		project: true,
		sourceType: 'module',
		tsconfigRootDir: __dirname,
	},
	plugins: ['@typescript-eslint', 'react', 'react-hooks', 'react-refresh', 'typescript-sort-keys'],
	root: false,
	rules: {
		'new-cap': ['warn'],
		'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
		'react/react-in-jsx-scope': 'off',
	},
	settings: {
		react: { version: 'detect' },
	},
};
