module.exports = {
  types: [
    {
      value: ':sparkles: feat',
      name: '✨  feat:     新功能'
    },
    {
      value: ':sunflower: update',
      name: '🌻 update:   更新'
    },
    {
      value: ':bug: fix',
      name: '🐛 fix:      修复bug'
    },
    {
      value: ':package: build',
      name: '📦️build:    打包'
    },
    {
      value: ':zap: perf',
      name: '⚡️ perf:     性能优化'
    },
    {
      value: ':tada: release',
      name: '🎉 release:  发布正式版'
    },
    {
      value: ':medal: version',
      name: '🎖️version:  发布新版本'
    },
    {
      value: ':lipstick: style',
      name: '💄 style:    代码的样式美化'
    },
    {
      value: ':recycle: refactor',
      name: '♻️ refactor: 重构'
    },
    {
      value: ':pencil2: docs',
      name: '✏️ docs:     文档变更'
    },
    {
      value: ':white_check_mark: test',
      name: '✅  test:     测试'
    },
    {
      value: ':rewind: revert',
      name: '⏪️ revert:   回退'
    },
    {
      value: ':rocket: chore',
      name: '🚀 chore:    构建/工程依赖/工具'
    },
    {
      value: ':construction_worker: ci',
      name: '👷 ci:       CI相关的变化'
    }
  ],
  // 每一步的提示信息
  messages: {
    type: '请选择提交类型',
    scope: '请选择文件修改范围',
    subject: '请输入commit标题(必填)',
    body: '请输入commit描述, 可通过&换行(选填)',
    // breaking: '列出任何BREAKING CHANGES(破坏性修改)(可选)',
    // footer: '请输入要关闭的issue(可选)',
    confirmCommit: '确定提交此 commit 吗？'
  },
  // 配置scope可选项，mono项目可按子项目维度划分，非mono项目可按功能or业务模块划分
  scopes: ['custom', 'system', 'style', 'setting'],
  // commit描述的换行符
  breaklineChar: '&',
  skipQuestions: ['breaking', 'footer'],
  // 标题首字母大写
  upperCaseSubject: true,
  // 标题必填
  requiredSubject: true
}
