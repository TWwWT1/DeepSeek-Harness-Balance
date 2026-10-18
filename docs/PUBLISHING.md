# 上传 GitHub

建议仓库名称：`DeepSeek-Harness-Balance`。

建议仓库描述：

```text
DeepSeek Harness 桌面版余额插件：账号栏峰谷标签、悬停余额、消费观测、每轮估算与预算提醒。
```

建议 Topics：`deepseek`、`harness`、`plugin`、`balance`、`cost-tracking`。

## 使用网页上传

1. 在 GitHub 新建仓库，名称可使用上方建议；公开或私有由你选择。创建时不必额外生成 README、License 或 .gitignore，本项目已提供。
2. 解压发布 ZIP，进入其中的 `DeepSeek-Harness-Balance` 目录。
3. 将目录里的文件和子目录上传到仓库根目录，包括 `.github`、`.gitignore` 等以点开头的项目文件。不要只上传 ZIP 文件；README 应直接出现在仓库根目录。
4. 提交后查看 README 的演示图与链接。在 Actions 页面查看 `Check` 流程；首次上传前无法证明云端检查已经通过。

发布包不包含 `.git/`、账本、真实截图、账户数据或凭证。

## 使用 Git 上传

在项目根目录执行以下命令。若已经是 Git 仓库，可以跳过初始化；首次提交需要你已配置自己的 Git 作者身份。

```powershell
git init -b main
git add .
git commit -m "Initial release: Harness balance plugin v1.1.4"
```

把示例用户名和仓库名替换成你的实际地址，再运行：

```powershell
git remote add origin "https://github.com/YOUR_USERNAME/DeepSeek-Harness-Balance.git"
git push -u origin main
```

以上命令仅供你上传时使用，准备发布包不会自动创建远程仓库或推送代码。

## 后续版本

修改代码后运行 `npm run check`，提交 `src/` 和对应的 `lib/`，更新版本号及 `CHANGELOG.md`。确认检查通过后，可以创建对应版本的 GitHub Release。

GitHub 自动生成的 Source code ZIP 包含 `lib/`，可按 README 的目录安装方式使用。当前仓库未配置自动发布到 npm 或自动创建 Release 的流程。
