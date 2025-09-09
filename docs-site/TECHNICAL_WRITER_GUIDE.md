# Technical Writer Guide - ASI Chain Documentation

## 🎯 Overview
This guide shows you how to edit the ASI Chain documentation site. When you make changes on GitHub, the site automatically updates at https://13.251.66.61

## ✅ Quick Start

### 1. **Edit Documentation**
- Navigate to any `.md` file in the `docs/` folder on GitHub
- Click the ✏️ pencil icon to edit
- Make your changes in markdown
- Click "Commit changes" when done

### 2. **Automatic Deployment** 
- Your changes automatically deploy in ~3-5 minutes
- Check https://13.251.66.61 to see your updates live
- No technical setup required!

## 📁 File Structure

```
docs-site/
├── docs/                          # Main documentation
│   ├── intro.md                   # Homepage content
│   ├── getting-started/           # Getting started guides
│   ├── smart-contracts/           # Smart contract docs
│   ├── architecture/              # Architecture guides
│   ├── api/                       # API documentation
│   └── deployment/                # Deployment guides
├── blog/                          # Blog posts
├── static/img/                    # Images and media
└── docusaurus.config.ts           # Site configuration
```

## 📝 Common Editing Tasks

### **Edit Existing Page**
1. Navigate to file (e.g., `docs/intro.md`)
2. Click ✏️ pencil icon
3. Edit the markdown content
4. Add commit message describing changes
5. Click "Commit changes"

### **Add New Documentation Page**
1. Navigate to appropriate `docs/` subfolder
2. Click "Add file" → "Create new file" 
3. Name file: `my-new-page.md`
4. Add frontmatter and content:
```markdown
---
sidebar_position: 2
title: My New Page
---

# My New Page

Your content here...
```

### **Add New Blog Post**
1. Navigate to `blog/` folder
2. Create file: `2025-08-14-my-post.md`
3. Add frontmatter:
```markdown
---
slug: my-post
title: My Blog Post
authors: [web3guru888]
tags: [asi-chain, announcement]
---

Your blog content here...
```

### **Add Images**
1. Navigate to `static/img/` folder
2. Upload your image file
3. Reference in markdown: `![Description](/img/your-image.png)`

## 🎨 Markdown Features

### **Basic Formatting**
```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*
`inline code`

- Bullet point
1. Numbered list

[Link text](https://example.com)
```

### **Code Blocks**
```markdown
\```javascript
function example() {
  return "Hello ASI Chain";
}
\```
```

### **Admonitions (Callout Boxes)**
```markdown
:::tip
This is a helpful tip!
:::

:::warning
This is a warning!
:::

:::danger
This is important!
:::
```

### **Images with Animation**
```markdown
<div style={{textAlign: 'center', margin: '2rem 0'}}>
  <img src="/img/asi-blockchain-animation.svg" alt="Blockchain Animation" style={{maxWidth: '100%', height: 'auto'}} />
</div>
```

## 🔧 Site Configuration

### **Update Navigation Menu**
Edit `sidebars.ts` to change the left sidebar structure:
```javascript
module.exports = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: ['getting-started/installation', 'getting-started/connect-network'],
    },
  ],
};
```

### **Update Site Settings**
Edit `docusaurus.config.ts` for:
- Site title and tagline
- Navbar links
- Footer content
- SEO settings

## 🚀 Deployment Process

**What happens when you commit:**
1. ✅ GitHub Actions automatically builds the site
2. ✅ Deploys to server (13.251.66.61)
3. ✅ Site updates are live in ~3-5 minutes
4. ✅ Both HTTP and HTTPS work

**Check deployment status:**
- Go to repository → "Actions" tab
- See build/deploy progress
- Green ✅ = successful deployment

## 📱 Preview Changes Locally (Optional)

If you want to preview changes before publishing:

```bash
# Clone repository locally
git clone https://github.com/asi-alliance/asi-chain.git
cd asi-chain/docs-site

# Install dependencies
npm install

# Start development server
npm start

# Opens http://localhost:3000
```

## 🆘 Getting Help

### **Common Issues**
- **Build fails**: Check that markdown syntax is correct
- **Images not showing**: Ensure images are in `static/img/` folder
- **Links broken**: Use relative paths like `/docs/my-page`

### **Resources**
- [Docusaurus Documentation](https://docusaurus.io/docs)
- [Markdown Guide](https://www.markdownguide.org/)
- [GitHub Markdown Help](https://docs.github.com/en/get-started/writing-on-github)

### **Contact**
- Open GitHub issue for technical problems
- Tag @web3guru888 for urgent changes

## 🎉 Ready to Edit!

1. **Go to GitHub repository**
2. **Navigate to a `.md` file in `docs/`**
3. **Click the ✏️ pencil icon**
4. **Make your changes**
5. **Commit and watch it deploy automatically!**

The ASI Chain documentation site will update automatically within minutes of your changes. No technical knowledge required! 🚀