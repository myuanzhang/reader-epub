import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import crypto from 'crypto'

const root = process.cwd()
const contentDir = path.join(root, 'content')
const distDir = path.join(root, 'dist')
const workDir = path.join(distDir, 'epub-build')
const oebpsDir = path.join(workDir, 'OEBPS')
const textDir = path.join(oebpsDir, 'text')
const imgDir = path.join(oebpsDir, 'images')
const cssDir = path.join(oebpsDir, 'styles')

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'))
}

function readMD(p) {
  return fs.readFileSync(p, 'utf-8')
}

function write(p, s) {
  fs.writeFileSync(p, s)
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function xhtmlWrap(title, body, cssHref = 'styles/style.css') {
  return `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-CN" lang="zh-CN">\n<head>\n<meta charset="utf-8"/>\n<title>${esc(title)}</title>\n<link rel="stylesheet" type="text/css" href="../${cssHref}"/>\n</head>\n<body>\n${body}\n</body>\n</html>`
}

function buildCss() {
  const css = `body{font-family: system-ui, -apple-system, 'SF Pro Text','PingFang SC','Microsoft YaHei',sans-serif;line-height:1.8;margin:1rem 1.25rem;word-wrap:break-word}h1,h2,h3{margin:0 0 .75rem 0;page-break-after:avoid}p{margin:.75rem 0;text-indent:0 !important}img{max-width:100%;height:auto;display:block;margin:1rem auto}figure{margin:1rem 0;text-align:center;page-break-inside:avoid}figcaption{color:#666;font-size:.9rem;margin-top:.5rem}.article-title{font-size:1.8rem;font-weight:600;text-align:left;margin-bottom:.5rem;border-left:.25rem solid #0a8f39;padding-left:.5rem}.article-author{font-size:1rem;color:#555;text-align:right;margin:.25rem 0 1rem 0}.article-image{display:block;margin:0 auto 1rem auto}.toc h1{font-size:1.4rem;margin-bottom:.5rem}.toc .column{border-bottom:1px solid #eee;margin:1rem 0;padding-bottom:.5rem}.toc .column-title{font-size:1.1rem;font-weight:600;margin-bottom:.5rem;color:#333}.toc ul{list-style:none;padding-left:1rem;margin:.5rem 0}.toc li{margin:.25rem 0}.toc a{color:#0a6dce;text-decoration:none}.toc a:visited{color:#5d5d8a}`
  write(path.join(cssDir, 'style.css'), css)
}

function slugify(s) {
  let base = s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
  // Ensure ID starts with a letter and has no redundant hyphens
  base = base.replace(/^-+/, '').replace(/-+$/, '')
  const needAugment = !/^[a-z]/.test(base) || base.length < 4
  if (!needAugment) return base
  const source = base.startsWith('column-') ? s.replace(/^column-/, '') : s
  // Use MD5 hash of complete UTF-8 string to ensure uniqueness
  const hash = crypto.createHash('md5').update(source, 'utf8').digest('hex').slice(0, 16)
  if (base && /^[a-z]/.test(base)) return `${base}${hash}`
  return `p-${hash}`
}

function mdToHtml(md) {
  const mdParser = new MarkdownIt({ html: true, xhtmlOut: true, breaks: true, linkify: true })
  return mdParser.render(md)
}

function collectColumns() {
  const columnsDir = path.join(contentDir, 'columns')
  const names = fs.readdirSync(columnsDir).filter(n => fs.statSync(path.join(columnsDir, n)).isDirectory())
  const columns = []
  for (const name of names) {
    const dir = path.join(columnsDir, name)
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort((a, b) => {
      const isIntro = (f) => f.toLowerCase().startsWith('intro') || f.toLowerCase().startsWith('overview') || /^\d{2}-/.test(f)
      const ai = isIntro(a), bi = isIntro(b)
      if (ai && !bi) return -1
      if (!ai && bi) return 1
      return a.localeCompare(b)
    })
    const articles = []
    for (const f of files) {
      const raw = readMD(path.join(dir, f))
      const { data, content } = matter(raw)
      const id = slugify(`${name}-${data.title || f}`)
      const isIntro = (f) => f.toLowerCase().startsWith('intro') || f.toLowerCase().startsWith('overview') || /^\d{2}-/.test(f)
      articles.push({ id, column: name, title: data.title || f.replace(/\.md$/, ''), author: data.author || '', image: data.image || '', md: content, srcDir: dir, isIntro: isIntro(f) })
    }
    columns.push({ name, articles })
  }
  return columns
}

function writeArticleXhtml(a) {
  const titleEl = `<h1 class="article-title">${esc(a.title)}</h1>`
  const authorEl = a.author ? `<div class="article-author">${esc(a.author)}</div>` : ''
  const imageEl = a.image ? `<figure><img class="article-image" src="../images/${path.basename(a.image)}" alt="${esc(a.title)}"/></figure>` : ''
  const bodyEl = mdToHtml(a.md)
  const html = xhtmlWrap(a.title, `${titleEl}${authorEl}${imageEl}${bodyEl}`)
  write(path.join(textDir, `${a.id}.xhtml`), html)
}

function buildCover(metadata) {
  const body = metadata.coverImage ? `<figure><img class="article-image" src="images/${path.basename(metadata.coverImage)}" alt="${esc(metadata.title)}"/></figure>` : `<h1 class="article-title">${esc(metadata.title)}</h1>`
  write(path.join(oebpsDir, 'cover.xhtml'), xhtmlWrap('封面', body, 'styles/style.css'))
}

function buildSimplePage(name, mdPath) {
  const md = readMD(mdPath)
  const file = `${slugify(name)}.xhtml`
  const html = xhtmlWrap(name, `<h1 class=\"article-title\">${esc(name)}</h1>${mdToHtml(md)}`)
  write(path.join(textDir, file), html)
  return { title: name, file }
}

function buildMagazineToc(columns, pages) {
  let body = `<div class="toc"><h1>目录</h1>`
  if (pages && pages.length > 0) {
    body += `<div class="column"><div class="column-title">前言</div><ul>`
    for (const p of pages) {
      body += `<li><a href="${p.file}">${esc(p.title)}</a></li>`
    }
    body += `</ul></div>`
  }
  for (const c of columns) {
    body += `<div class="column"><div class="column-title">${esc(c.name)}</div><ul>`
    for (const a of c.articles) {
      body += `<li><a href="${a.id}.xhtml">${esc(a.title)}</a></li>`
    }
    body += `</ul></div>`
  }
  body += `</div>`
  const html = xhtmlWrap('目录', body)
  write(path.join(textDir, 'magazine-toc.xhtml'), html)
}

/* no column pages */

function buildNav(metadata, columns, pages) {
  let nav = `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="zh-CN" lang="zh-CN">\n<head>\n<meta charset="utf-8"/>\n<title>${esc(metadata.title)}</title>\n</head>\n<body>\n<nav epub:type="toc" id="toc">\n<h1>目录</h1>\n<ol>`
  // Removed "扉页" (Cover) from TOC to resolve "two covers" confusion
  if (pages && pages.length > 0) {
    for (const p of pages) {
      nav += `<li><a href="text/${p.file}">${esc(p.title)}</a></li>`
    }
  }
  for (const c of columns) {
    if (c.articles.length === 0) continue
    const intro = c.articles.find(a => a.isIntro)
    const others = c.articles.filter(a => !a.isIntro)

    const firstArticle = intro || c.articles[0]
    const remainingArticles = intro ? others : c.articles.slice(1)

    nav += `<li><a href="text/${firstArticle.id}.xhtml">${esc(c.name)}</a>`
    if (remainingArticles.length > 0) {
      nav += `<ol>`
      for (const a of remainingArticles) {
        nav += `<li><a href="text/${a.id}.xhtml">${esc(a.title)}</a></li>`
      }
      nav += `</ol>`
    }
    nav += `</li>`
  }
  nav += `</ol>\n</nav>\n</body>\n</html>`
  write(path.join(oebpsDir, 'nav.xhtml'), nav)
}

function buildOpf(metadata, columns, pages) {
  let manifestItems = []
  manifestItems.push(`<item id="style" href="styles/style.css" media-type="text/css"/>`)
  if (metadata.coverImage) {
    const coverBase = path.basename(metadata.coverImage)
    manifestItems.push(`<item id="cover-image" href="images/${coverBase}" media-type="${imageMimeType(coverBase)}" properties="cover-image"/>`)
  }
  manifestItems.push(`<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`)
  manifestItems.push(`<item id="magazine-toc" href="text/magazine-toc.xhtml" media-type="application/xhtml+xml"/>`)
  for (const p of pages) {
    manifestItems.push(`<item id="${slugify(p.file.replace(/\.xhtml$/, ''))}" href="text/${p.file}" media-type="application/xhtml+xml"/>`)
  }
  const imgAdded = new Set()
  for (const c of columns) {
    for (const a of c.articles) {
      manifestItems.push(`<item id="${a.id}" href="text/${a.id}.xhtml" media-type="application/xhtml+xml"/>`)
      if (a.image) {
        const base = path.basename(a.image)
        if (!imgAdded.has(base)) {
          manifestItems.push(`<item id="img-${slugify(base.replace(/\.[^.]+$/, ''))}" href="images/${base}" media-type="${imageMimeType(base)}"/>`)
          imgAdded.add(base)
        }
      }
    }
  }
  manifestItems.push(`<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`)

  let spineItems = []
  // Spine starts with Foreword. Cover is handled by metadata/manifest property to resolve "double cover"
  for (const p of pages) spineItems.push(`<itemref idref="${slugify(p.file.replace(/\.xhtml$/, ''))}"/>`)
  for (const c of columns) {
    for (const a of c.articles) spineItems.push(`<itemref idref="${a.id}"/>`)
  }

  const opf = `<?xml version="1.0" encoding="utf-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">\n  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n    <dc:identifier id="book-id">${esc(metadata.id || 'magazine')}</dc:identifier>\n    <dc:title>${esc(metadata.title)}</dc:title>\n    <dc:language>zh-CN</dc:language>\n    <dc:creator>${esc(metadata.creator || '')}</dc:creator>\n    <meta property="dcterms:modified">${new Date().toISOString()}</meta>\n  </metadata>\n  <manifest>\n    ${manifestItems.join('\n    ')}\n  </manifest>\n  <spine>\n    ${spineItems.join('\n    ')}\n  </spine>\n</package>`
  write(path.join(oebpsDir, 'content.opf'), opf)
}

function buildContainer() {
  const container = `<?xml version="1.0"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n  <rootfiles>\n    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n  </rootfiles>\n</container>`
  ensureDir(path.join(workDir, 'META-INF'))
  write(path.join(workDir, 'META-INF', 'container.xml'), container)
}

function copyImages(metadata, columns) {
  if (metadata.coverImage) {
    fs.copyFileSync(path.join(contentDir, metadata.coverImage), path.join(oebpsDir, 'images', path.basename(metadata.coverImage)))
  }
  for (const c of columns) {
    for (const a of c.articles) {
      if (a.image) {
        const src = a.image.includes('/') ? path.join(contentDir, a.image) : path.join(a.srcDir, a.image)
        fs.copyFileSync(src, path.join(imgDir, path.basename(a.image)))
      }
    }
  }
}

function imageMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase()
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    case '.webp':
      return 'image/webp'
    case '.svg':
      return 'image/svg+xml'
    default:
      return 'image/*'
  }
}

function main() {
  ensureDir(distDir)
  if (fs.existsSync(workDir)) fs.rmSync(workDir, { recursive: true, force: true })
  ensureDir(workDir)
  ensureDir(oebpsDir)
  ensureDir(textDir)
  ensureDir(imgDir)
  ensureDir(cssDir)

  const metadata = readJSON(path.join(contentDir, 'metadata.json'))
  buildCss()
  buildCover(metadata)

  const forewordPage = buildSimplePage('卷首语', path.join(contentDir, 'foreword.md'))

  const columns = collectColumns()
  for (const c of columns) {
    for (const a of c.articles) writeArticleXhtml(a)
  }
  buildMagazineToc(columns, [forewordPage])
  buildNav(metadata, columns, [forewordPage])
  copyImages(metadata, columns)
  buildOpf(metadata, columns, [forewordPage])

  write(path.join(workDir, 'mimetype'), 'application/epub+zip')
  buildContainer()
  console.log('OK: EPUB structure ready at', workDir)
}

main()
