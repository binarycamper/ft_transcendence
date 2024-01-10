module.exports = {
	env: {
		jest: true,
		node: true,
	},
	extends: [
		'eslint:recommended',
		/* 'plugin:typescript-sort-keys/recommended', */
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
		'plugin:@typescript-eslint/recommended-type-checked',
		'plugin:@typescript-eslint/stylistic-type-checked',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: './tsconfig.json',
		sourceType: 'module',
		tsconfigRootDir: __dirname,
	},
	ignorePatterns: ['.eslintrc.js', '/dist'],
	plugins: ['@typescript-eslint/eslint-plugin', 'typescript-sort-keys'],
	root: false,
	rules: {
		'@typescript-eslint/prefer-nullish-coalescing':
			'off' /* TODO: temporary 'off' until strict-mode compiler option enabled */,
		// '@typescript-eslint/explicit-function-return-type': 'off',
		// '@typescript-eslint/explicit-module-boundary-types': 'off',
		// '@typescript-eslint/interface-name-prefix': 'off',
		// '@typescript-eslint/no-explicit-any': 'off',
	},
};
