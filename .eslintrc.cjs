module.exports = {
	// 运行环境
	env: {
		browser: true, // 浏览器
		es6: true, // es6语法
		jest: true,
	},
	parser: 'vue-eslint-parser',
	parserOptions: {
		ecmaVersion: 'latest',
		parser: '@typescript-eslint/parser',
		sourceType: 'module',
		jsxPragma: 'React',
		ecmaFeatures: {
			jsx: true,
		},
	},
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:vue/vue3-essential',
		'plugin:prettier/recommended',
	],
	overrides: [
		{
			env: {
				node: true,
			},
			files: ['.eslintrc.{js,cjs}'],
			parserOptions: {
				sourceType: 'script',
			},
		},
	],
	plugins: ['@typescript-eslint', 'vue'],
	rules: {
		'@typescript-eslint/no-non-null-assertion': 'off',
		/** 允许ts使用命名空间 */
		'@typescript-eslint/no-namespace': 'off',
		/**
		 * 使用新vue3.3的defineProps解构语法需要关闭这个校验
		 * eslint-plugin-vue新版本已废弃 vue/no-setup-props-destructure,如果新版本eslint-plugin-vue
		 * 需要改成vue/no-setup-props-reactivity-loss规则
		 * */
		'vue/no-setup-props-destructure': 'off',
		'no-undef': 'off',
		'no-var': 'error', // 不能使用var
		'no-multiple-empty-lines': ['warn', { max: 2 }], // 不允许多个空行
		quotes: [1, 'single'], //引号类型 `` "" ''
		semi: ['error', 'never'], // 不允许在末尾加分号
		'vue/multi-word-component-names': 'off', //关闭组件命名规则
		'@typescript-eslint/no-explicit-any': 'off', // 关闭any校验
		'no-redeclare': 2, //禁止重复声明变量
		'eol-last': 'off', // 关闭行尾符（linebreak-style）的校验
	},
}
