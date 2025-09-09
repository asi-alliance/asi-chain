# ASI Chain Brand Guidelines

## Overview

This document outlines the visual identity and brand standards for ASI Chain as part of the Artificial Superintelligence Alliance ecosystem. These guidelines ensure consistent representation across all materials and platforms.

## Brand Identity

### Core Principles

- **Decentralized Intelligence**: Representing distributed AI infrastructure
- **Technical Excellence**: Professional, cutting-edge technology
- **Open Collaboration**: Community-driven development
- **Trust & Security**: Reliable blockchain foundation

## Logo Usage

### Primary Logo

The ASI logo consists of a central dot surrounded by four connected nodes, symbolizing:
- Decentralized network architecture
- Interconnected intelligence
- The four founding members (Fetch.ai, SingularityNET, Ocean Protocol, CUDOS)

### Logo Variations

```
asi-logo-black.png    - Black logo on white/light backgrounds
asi-logo-white.svg    - White logo on dark backgrounds  
asi-logo-green.png    - Green variant for special uses
asi-logo-gradient.svg - Gradient version for hero sections
```

### Clear Space

Maintain minimum clear space equal to 0.5× the logo height on all sides.

### Minimum Size

- Digital: 24px height minimum
- Print: 10mm height minimum

### Usage Rules

✅ **DO**
- Use official logo files
- Maintain aspect ratio
- Ensure adequate contrast
- Use on solid backgrounds when possible

❌ **DON'T**
- Rotate or skew the logo
- Change logo colors arbitrarily
- Add effects (shadows, outlines)
- Place on busy backgrounds

## Color System

### Primary Colors

```css
:root {
  /* ASI Brand Colors */
  --asi-green: #A8E6A3;        /* Primary brand color - mint green */
  --asi-green-light: #C4F0C1;  /* Lighter variant */
  --asi-green-dark: #7FD67A;   /* Darker variant */
  --asi-black: #1A1A1A;        /* Logo black, text */
  --asi-white: #ffffff;        /* Backgrounds, reverse text */
  --asi-gray-light: #f5f5f5;   /* Light backgrounds */
  --asi-gray: #808080;         /* Secondary text */
  
  /* Secondary Palette */
  --asi-accent-1: #4A4A4A;     /* Dark gray for headers */
  --asi-accent-2: #E8F5E8;     /* Very light green tint */
  --asi-accent-3: #333333;     /* Dark text */
  
  /* Semantic Colors */
  --asi-success: #7FD67A;      /* Success states (ASI green dark) */
  --asi-warning: #FFA500;      /* Warnings */
  --asi-error: #FF6B6B;        /* Errors */
  --asi-info: #A8E6A3;         /* Information (ASI green) */
}
```

### Gradients

```css
/* Primary gradient for hero sections */
.asi-gradient-primary {
  background: linear-gradient(135deg, #7FD67A 0%, #C4F0C1 100%);
}

/* Subtle gradient for backgrounds */
.asi-gradient-subtle {
  background: linear-gradient(180deg, #ffffff 0%, #E8F5E8 100%);
}

/* Mesh gradient for special sections */
.asi-gradient-mesh {
  background: 
    radial-gradient(at 40% 20%, #A8E6A3 0%, transparent 50%),
    radial-gradient(at 80% 0%, #C4F0C1 0%, transparent 50%),
    radial-gradient(at 0% 50%, #7FD67A 0%, transparent 50%);
}
```

## Typography

### Font Stack

```css
/* Primary font family */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             Roboto, 'Helvetica Neue', Arial, sans-serif;

/* Monospace for code */
font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, 
             'Liberation Mono', Menlo, monospace;
```

### Type Scale

| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| H1 | 56-64px | 800 | 1.05 | -0.02em |
| H2 | 40-48px | 700 | 1.1 | -0.01em |
| H3 | 32px | 600 | 1.15 | -0.005em |
| H4 | 24px | 600 | 1.2 | 0 |
| Body | 16-18px | 400 | 1.6 | 0 |
| Small | 14px | 400 | 1.5 | 0 |
| Code | 14px | 400 | 1.4 | 0 |

## Visual Elements

### Icons

Use consistent icon style:
- Stroke width: 2px
- Corner radius: 2px
- Size: 24x24px base
- Style: Outlined, not filled

### Badges

```markdown
![Status](https://img.shields.io/badge/Status-Active-2e90fa)
![Version](https://img.shields.io/badge/Version-0.1.0--alpha-1f6afe)
![License](https://img.shields.io/badge/License-Apache%202.0-0e0e10)
```

### Code Blocks

Use syntax highlighting with ASI theme:

```javascript
// ASI Blue accents for keywords
const asiChain = {
  consensus: 'CBC Casper',
  blockTime: 30,
  validators: 4
};
```

## UI Components

### Buttons

```css
/* Primary button */
.btn-primary {
  background: linear-gradient(135deg, #1f6afe, #2e90fa);
  color: white;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
}

/* Secondary button */
.btn-secondary {
  background: transparent;
  color: #2e90fa;
  border: 2px solid #2e90fa;
  border-radius: 8px;
  padding: 10px 22px;
}
```

### Cards

```css
.card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 24px;
}

.card-dark {
  background: #0e0e10;
  border: 1px solid #2e2e30;
  color: #ffffff;
}
```

## Animation Guidelines

### Transitions

- Duration: 200-300ms for micro-interactions
- Easing: cubic-bezier(0.4, 0, 0.2, 1)
- Properties: transform, opacity preferred

### Loading States

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

## Documentation Style

### README Structure

1. **Hero Section**: Logo + tagline with gradient background
2. **Quick Links**: Badge row with key metrics
3. **Overview**: Clear value proposition
4. **Features**: Icon-led feature grid
5. **Getting Started**: Step-by-step guide
6. **Documentation**: Organized links
7. **Community**: Contribution guidelines

### Markdown Formatting

```markdown
# Main Heading <!-- ASI blue gradient if possible -->

## Section Heading

### Subsection

**Bold text** for emphasis
*Italic* for secondary emphasis
`inline code` for technical terms

> Blockquotes for important notes

- Bullet points for lists
1. Numbered lists for steps
```

## Digital Assets

### Social Media

- Twitter/X: 1200x675px (16:9)
- GitHub: 1280x640px (2:1)  
- Blog: 1920x1080px (16:9)

### Presentations

- Slides: 16:9 ratio
- Background: White or gradient mesh
- Accent: ASI blue for highlights

## Voice & Tone

### Writing Principles

- **Clear**: Technical but accessible
- **Confident**: Authoritative without arrogance
- **Collaborative**: Inclusive and welcoming
- **Precise**: Accurate technical details

### Terminology

✅ **Preferred**
- ASI Chain (not ASI-Chain or asi chain)
- Artificial Superintelligence Alliance (first mention)
- ASI Alliance (subsequent mentions)
- Validator (not Validater)
- Smart contracts (not smartcontracts)

❌ **Avoid**
- Marketing hyperbole
- Unsubstantiated claims
- Competitor disparagement
- Technical jargon without explanation

## File Naming

### Convention

```
asi-[description]-[variant].[ext]

Examples:
asi-logo-black.svg
asi-chain-architecture.png
asi-banner-hero.jpg
asi-demo-wallet.gif
```

## Legal

### Copyright Notice

```
Copyright 2025 Artificial Superintelligence Alliance
Part of the ASI Alliance ecosystem (https://superintelligence.io)
```

### Trademark

ASI, ASI Chain, and the ASI logo are trademarks of the Artificial Superintelligence Alliance.

## Resources

### Asset Downloads

All brand assets available in `/media` directory:
- Logos (SVG, PNG)
- Icons (SVG)
- Color palettes (ASE, CLR)
- Templates (Figma, Sketch)

### Tools

- Color picker: Use exact hex values
- Logo generator: Contact design team
- Badge maker: shields.io with ASI colors

## Contact

For brand questions or asset requests:
- GitHub Issues with `branding` label
- ASI Alliance design team

---

**Version**: 1.0.0  
**Last Updated**: August 2025  
**Maintained by**: ASI Chain Team