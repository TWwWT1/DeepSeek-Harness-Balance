# DeepSeek Harness Balance

**把余额、峰谷时段和消费记录放进 Harness 账号栏。**

面向 DeepSeek Harness 桌面版的原生插件。平时显示带峰谷图标的红绿圆角标签；鼠标悬停时显示余额，点击打开概览、记录和设置。

![界面示意：默认隐藏余额，悬停显示余额，峰谷使用不同图标和颜色；金额均为演示数据](docs/images/preview.svg)

版本 **1.1.4** · MIT License · 已验证 Windows 官方 Harness **0.2.1-rc.2**。

## 功能

- **紧凑账号栏**：波峰红色、波谷绿色，12px 标签配峰谷图标；金额默认隐藏，悬停显示，位置不跳动。支持深色主题。
- **官方余额**：支持 Harness 已登录账户、官方 API Key，以及自动选择来源；分别显示充值与赠送余额，支持 CNY / USD。
- **时段与倒计时**：按北京时间和内置 2026 年节假日表判断峰谷，显示下一次切换时间。
- **消费观测**：展示今日、近 7 天余额变化，单独记录余额增加，支持当天消费校正。
- **每轮估算**：按本机官方 DeepSeek Flash / Pro 的 token 用量及峰谷价格估算，支持最近轮次记录。
- **提醒与导出**：低余额提醒、每日预算、可选的每轮费用提示，以及 CSV 导出。

观测消费与 token 费用估算分别展示，均不能代替官方账单。已知限制见 [使用说明](docs/USAGE.md#已知限制)。

## 安装

### 1. 准备插件文件

从本仓库页面选择 **Code → Download ZIP**，解压到准备长期保留的目录。仓库已包含构建后的 `lib/`，直接安装不需要先构建。

文件夹名称可以不同，但选中的目录里应直接包含 `package.json`、`cordis.patch.yml` 和 `lib/`。

### 2. 安装到桌面配置

在终端中运行，替换示例路径：

```powershell
dsh plugin --profile desktop add "D:\Plugins\DeepSeek-Harness-Balance"
```

如果 `dsh` 不在命令路径中，可使用 Harness 安装目录里的启动器。以下路径仅为示例：

```powershell
& "D:\Apps\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add "D:\Plugins\DeepSeek-Harness-Balance"
```

正常退出并重新打开 Harness 后生效。请保留安装目录，本地安装可能以链接方式引用它。

### 3. 查询余额

登录 Harness 的 DeepSeek 账户，或在 Harness 模型设置中配置官方 `DEEPSEEK_API_KEY`。无需在插件中重复填写密钥。

侧边栏底部的峰谷标签就是入口。悬停查看金额，点击进入详情；点击外部或按 Escape 收起。键盘用户可通过 Tab 聚焦后按 Enter 打开。

## 常用设置

| 设置 | 默认值 / 行为 |
| --- | --- |
| 余额来源 | 自动选择：先账户，未登录时使用官方 API Key |
| 自动刷新 | 60 秒；可选 30 秒、300 秒或关闭 |
| 峰谷标签 | 开启；关闭后显示“余额”标签 |
| 金额字号 | 12px；可选 10–13px，峰谷标签固定 12px |
| 账号栏今日已观测 | 关闭；开启后也仅在悬停时显示 |
| 低余额阈值 | CNY 5 / USD 1，设为 0 可关闭对应阈值 |
| 每日预算 | 0，即关闭；CNY / USD 分别设置 |
| 每轮费用提示 | 默认关闭；开启后在窗口左下角临时提示 |

查询失败会显示错误；保留旧结果时会标注上次数据。切换来源、退出账户或连接重建时清除旧余额。

详细口径、记录保留时间和提醒限制见 [使用说明](docs/USAGE.md)。

## 兼容性与价格表

- 当前声明兼容 `>=0.2.1-rc.2 <0.2.2-0`；已在 Windows 官方桌面版 `0.2.1-rc.2` 加载验证。
- Harness 插件接口仍在变化，其他版本和操作系统尚未完成桌面端验证。
- 峰谷日历内置 **2026 年**；超出日历覆盖范围的工作日显示“时段待更新”。
- 模型价格表于 **2026-10-18** 核对，官方调价后需要更新插件。

依据：[DeepSeek 官方价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)、[2026 年节假日安排](https://zwfw.gansu.gov.cn/huixian/zczx/tzgg/art/2025/art_715c16a75e4d4c289c295e77772c7274.html)。

## 数据与隐私

密钥由 Harness 凭证服务管理，只在后台向 DeepSeek 官方接口发送。插件不额外保存密钥，不向第三方后台上报数据。

账本保存在 `$DSH_HOME/balance-card/ledger-v1.json`；未配置 `DSH_HOME` 时使用 `~/.dsh/balance-card/ledger-v1.json`。账本包含金额、时间、币种、模型、token 数、会话 ID 与不可逆账户指纹，不包含对话正文。设置保存在当前窗口的本地偏好中。

详见 [数据处理说明](docs/PRIVACY.md)。

## 开发

需要 Node.js **22 或以上**。构建和测试只使用 Node.js 内置能力，React / React DOM / Cordis 在运行时由 Harness 提供，无需先执行 `npm install`。

```powershell
npm run check
```

这会依次构建、检查客户端语法并运行测试。也可以分别运行：

```powershell
npm run build
npm test
```

`lib/` 随仓库提交，修改 `src/` 后请重新构建，并提交对应的 `lib/`。CI 会检查两者是否一致。

| 路径 | 内容 |
| --- | --- |
| `src/client.js` | 账号栏标签、详情界面、设置和提醒 |
| `src/host.js` | 官方余额查询、内部通信和会话事件 |
| `src/model.js` | 精确金额解析、合计和显示格式 |
| `src/pricing.js` | 峰谷日历、倒计时和费用估算 |
| `src/accounting.js` | 余额观测、校正、轮次聚合 |
| `src/store.js` | 本地账本、文件锁和原子写入 |
| `lib/` | 可直接加载的构建结果 |
| `tests/` | 使用模拟凭证和临时目录的离线测试 |

更多细节见 [开发与贡献说明](CONTRIBUTING.md)。首次上传仓库见 [上传 GitHub](docs/PUBLISHING.md)。

## 卸载

在 Harness 插件页移除，或运行：

```powershell
dsh plugin --profile desktop remove dsh-balance-card-local
```

然后正常退出并重新打开 Harness。卸载不主动删除本地账本。

## 致谢与许可

功能设计参考 [MeteorNOX / DeepSeek-Balance-Whale-Widget](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget) 的记账、峰谷和提醒思路。未包含该项目的角色、图片或音频资源。参考版本和许可全文见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

本项目采用 [MIT License](LICENSE)，为社区插件。Harness 接口参考：[客户端模块](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/client-modules.md)、[账户接口](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/api/account-controller/src/index.ts)、[DeepSeek 余额 API](https://api-docs.deepseek.com/zh-cn/api/get-user-balance/)。
