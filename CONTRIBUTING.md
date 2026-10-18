# 开发与贡献

## 本地检查

准备 Node.js 22 或以上，在项目根目录运行：

```powershell
npm run check
```

检查只使用 Node.js 内置工具。测试使用模拟凭证与临时账本，不读取真实账户、密钥或对话，也不会发送余额请求。

项目的 React、React DOM、Cordis 是 Harness 提供的运行时能力。无需通过 `npm install` 下载一套独立界面运行时。

## 代码结构与数据流

1. `cordis.patch.yml` 注册插件，`package.json` 声明入口和 Harness 兼容范围。
2. Host 的 `src/host.js` 读取 Harness 账户服务或凭证服务，查询官方余额。
3. `src/accounting.js` 汇总余额变化和官方模型 usage；`src/store.js` 将账本写入本地文件。
4. 客户端通过 Harness 内部 RPC 请求余额、账本摘要和校正结果。
5. `src/client.js` 使用 `sidebar.footer.action` 插槽显示标签，并通过 React Portal 打开详情。

账户/密钥的不可逆指纹用于区分账本，凭证本身不进入客户端响应或账本。金额采用十进制整数运算，避免直接使用浮点数累加。

## 修改与构建

编辑 `src/`，不要手动修改生成的 `lib/`。构建脚本会生成 Host 模块与 Harness 客户端模块：

```powershell
npm run build
```

将 `src/` 和对应的 `lib/` 一起提交。仓库保留构建结果，使其他人下载 ZIP 后可以直接安装。

测试文件放在 `tests/`，优先覆盖金额精度、账户隔离、峰谷边界、事件去重和存储行为。界面修改还应在兼容的 Harness 桌面版检查默认状态、悬停、打开/关闭详情和深色主题。

## 更新价格、节假日和兼容范围

- 单价、支持的模型名与节假日表在 `src/pricing.js`；先核对 DeepSeek 官方文档，再更新边界测试。
- 扩展 Harness 版本范围前，核对账户接口、连接协议、模块加载器和侧边栏插槽。
- 同步更新 README 的核对日期、兼容说明和 `CHANGELOG.md`。
- 保留 `THIRD_PARTY_NOTICES.md` 中的功能参考与许可。

## 提交改动

说明改动解决了什么问题、最终行为和验证方式。可以使用仓库的 Issue 模板反馈问题或建议；截图与日志请先移除个人信息和凭证。

CI 配置为在 Windows / Ubuntu 的 Node.js 22 环境构建并运行离线测试；首次上传后才能确认云端运行结果。流程配置参考 [checkout](https://github.com/actions/checkout) 和 [setup-node](https://github.com/actions/setup-node) 官方文档。
