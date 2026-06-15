# 简单做

一个简洁、专注且支持本地文件备份的待办事项应用。

任务数据默认保存在浏览器缓存和本地 `data/` 目录中，不需要数据库，也不会上传到第三方服务。

## 功能

- 快速添加、完成、恢复和删除任务
- 为任务设置计划日期
- 日历模式查看特定日期的任务
- 按今天、昨天、前天等日期整理完成记录
- 小、标准、大、特大四档界面字号
- 自动保存任务到浏览器 `localStorage`
- 自动备份任务到本地 JSON 文件
- 桌面端和移动端响应式布局

## 快速开始

### Windows

确保电脑已经安装 [Node.js](https://nodejs.org/)，然后双击：

```text
start.bat
```

脚本会自动安装依赖、启动应用，并打开浏览器。

### 使用命令行

```bash
npm install
npm run dev
```

启动后访问：

```text
http://localhost:5173
```

## 数据存储

任务会同时保存到：

```text
浏览器 localStorage
data/tasks.json
data/tasks.backup.json
```

- `tasks.json`：当前任务数据
- `tasks.backup.json`：上一次保存的数据
- `data/` 已被 `.gitignore` 忽略，不会提交到公开仓库

首次添加或修改任务时，应用会自动创建 `data/` 目录。

请通过 `npm run dev`、`npm run preview` 或 `start.bat` 运行应用。直接双击打开 `index.html` 时，无法写入本地数据文件。

## 开发命令

```bash
# 启动开发服务
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 项目结构

```text
.
├── app.js           # 页面交互与任务逻辑
├── index.html       # 页面结构
├── styles.css       # 页面样式
├── vite.config.js   # Vite 配置与本地文件存储接口
├── start.bat        # Windows 快速启动脚本
├── package.json
└── data/            # 本地任务数据，不提交到公开仓库
```

## 隐私

应用不会主动发送任务内容到任何第三方服务。任务数据仅保存在运行应用的浏览器和本地项目目录中。

## License

MIT
