// @ts-check
import { defineConfig, globalIgnores } from 'eslint/config'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import vueParser from 'vue-eslint-parser'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

import eslintConfigPrettier from 'eslint-config-prettier/flat'

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...vue.configs['flat/essential'],
    eslintConfigPrettier,

    defineConfig([globalIgnores([
        '**/node_modules',
        '**/*.md',
        '**/*.scss',
        '**/.vscode',
        '**/.idea',
        '**/dist',
        '**/public',
        '**/index.html',
        'src/assets',
        '**/.eslintrc.cjs',
        '**/config',
        'src-tauri/**/*',
        '**/commitlint.config.cjs',
        '**/auto-imports.d.ts',
    ]),

    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.jest,
            },

            parser: vueParser,
            ecmaVersion: 'latest',
            sourceType: 'module',

            parserOptions: {
                parser: tseslint.parser,
                jsxPragma: 'React',

                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
    },

    {
        rules: {
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-namespace': 'off',
            'vue/no-setup-props-destructure': 'off',
            'no-undef': 'off',
            'no-var': 'error',

            'no-multiple-empty-lines': ['warn', {
                max: 2,
            }],

            quotes: [1, 'single'],
            semi: ['error', 'never'],
            'vue/multi-word-component-names': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            'no-redeclare': 2,
            'eol-last': 'off',
            'vue/use-v-on-exact': 'off',
            // Note: you must disable the base rule as it can report incorrect errors
            // TODO 无法打开 no-unused-vars
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    'args': 'all',
                    'argsIgnorePattern': '^_',
                    'caughtErrors': 'all',
                    'caughtErrorsIgnorePattern': '^_',
                    'destructuredArrayIgnorePattern': '^_',
                    'varsIgnorePattern': '^_',
                    'ignoreRestSiblings': true
                }
            ],
            '@typescript-eslint/no-duplicate-enum-values': 'error'
        },
    }, {
        files: ['**/.eslintrc.{js,cjs}'],

        languageOptions: {
            globals: {
                ...globals.node,
            },

            ecmaVersion: 5,
            sourceType: 'commonjs',
        },
    }])
)
