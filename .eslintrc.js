module.exports = {
  extends: ['react-app', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  ignorePatterns: ['**/~partytown/**', 'public/**'],
  rules: {
    // 'no-useless-escape': 'warn', // ✖ 1 problem (0 errors, 1 warning) , 正则表达式中的
    // 'react/prop-types': 'warn',  //  ✖ 393 problems (0 errors, 393 warnings)
    // 'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // ✖ 143 problems (0 errors, 143 warnings)

    //* 代码质量相关
    'no-debugger': 'warn',
    'no-alert': 'warn',
    'consistent-return': 'off',
    // 'eqeqeq': ['error', 'always'],
    'no-empty': 'warn',
    'no-cond-assign': 'warn',
    'no-async-promise-executor': 'warn',
    'no-useless-escape': 'off',
    'no-prototype-builtins': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'no-empty-pattern': 'warn',

    //* 代码风格相关
    // 'quotes': ['error', 'single'], // 使用单引号
    // semi: ['error', 'always'], // 强制使用分号
    // indent: ['error', 2], // 两个空格缩进
    'prettier/prettier': 'off',

    //* React 相关
    'react/prop-types': 'off',
    'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx'] }],
    'react/jsx-props-no-spreading': 'off',
    'react/jsx-no-target-blank': 'off',
    'react/jsx-key': 'warn',
    'react/no-children-prop': 'warn',

    //* React Hooks 相关
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'off',

    //* 可维护性和最佳实践
    'no-magic-numbers': ['off', { ignore: [0, 1, -1] }],
    'max-lines': ['warn', { max: 1200, skipBlankLines: true, skipComments: true }],
  },
};
