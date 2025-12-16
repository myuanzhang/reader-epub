# Reader-EPUB

一个基于Node.js的EPUB杂志生成工具，支持通过Markdown文件创建结构化的EPUB 3.0格式电子书。

## 功能特性

- 📁 **结构化内容管理**：通过目录组织文章和栏目
- 📝 **Markdown支持**：使用Markdown编写文章内容，支持YAML Frontmatter元数据
- 🖼️ **图片处理**：自动处理文章中的图片，支持多种图片格式
- 📖 **EPUB 3.0兼容**：生成符合EPUB 3.0标准的电子书
- 🔧 **自定义配置**：通过配置文件自定义杂志元数据
- 📦 **一键生成**：简单命令即可生成EPUB文件

## 项目结构

```
reader-epub/
├── content/                  # 内容目录
│   ├── columns/              # 栏目目录
│   │   ├── 专题/            # 专题栏目
│   │   │   └── 导弹医生.md  # 文章
│   │   ├── 文苑/            # 文苑栏目
│   │   │   └── 拉漂.md      # 文章
│   │   └── ...              # 其他栏目
│   ├── images/              # 图片资源
│   ├── copyright.md         # 版权信息
│   ├── foreword.md          # 前言
│   └── metadata.json        # 杂志元数据
├── src/                     # 源码目录
│   └── build-epub.js        # EPUB生成脚本
├── dist/                    # 输出目录
├── .gitignore               # Git忽略文件
├── package.json             # 项目配置
└── README.md                # 项目说明
```

## 安装

1. 克隆仓库
   ```bash
   git clone <repository-url>
   cd reader-epub
   ```

2. 安装依赖
   ```bash
   npm install
   ```

## 使用方法

### 1. 配置杂志元数据

编辑 `content/metadata.json` 文件，设置杂志的基本信息：

```json
{
  "title": "杂志名称",
  "creator": "作者",
  "publisher": "出版社",
  "description": "杂志描述",
  "date": "2024-01-01",
  "language": "zh-CN",
  "cover": "images/cover.jpg"
}
```

### 2. 添加文章

在 `content/columns/` 目录下创建栏目文件夹，然后在每个栏目下添加Markdown格式的文章。

文章格式示例：

```markdown
---
title: 文章标题
author: 作者名
image: images/文章图片.jpg
---

# 章节标题

文章内容...
```

### 3. 生成EPUB

使用以下命令生成EPUB文件：

```bash
# 构建并打包EPUB
npm run package
```

生成的EPUB文件将位于 `dist/magazine.epub`。

## 命令说明

- `npm run build`: 构建EPUB文件（生成临时文件）
- `npm run package`: 构建并打包EPUB文件（生成最终的.epub文件）

## 自定义配置

### 添加图片

将图片文件放在 `content/images/` 目录下，或放在文章所在的栏目目录中。在文章中使用相对路径引用图片：

```markdown
![图片描述](images/图片名称.jpg)
```

### 修改封面

将封面图片放在 `content/images/` 目录下，然后在 `content/metadata.json` 中设置 `cover` 字段为图片路径。

## 注意事项

1. 确保所有图片文件都存在于正确的位置
2. 文章的YAML Frontmatter格式必须正确
3. 生成的EPUB文件可能需要在不同的阅读器中测试兼容性

## 许可证

MIT License
