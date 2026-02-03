# LinkedEye FinSpot - Enterprise Design System Redesign
## Modern UI/UX Design System v6.0

---

## Executive Summary

This document presents a comprehensive design system redesign for the LinkedEye FinSpot Enterprise ITSM Platform. Based on analysis of the current codebase, the existing foundation is solid but can be elevated to a truly premium, modern enterprise experience.

**Current State Assessment:**
- Strong foundation with Tailwind CSS + React
- Good color palette with light/dark mode support
- Functional component library (15+ custom components)
- Decent accessibility groundwork
- Room for improvement in visual polish, micro-interactions, and consistency

---

## 1. Modern UI Theme Recommendations

### 1.1 Design Philosophy: "Elevated Enterprise"

**Core Principles:**
1. **Clarity First** - Information density without visual clutter
2. **Purposeful Motion** - Meaningful animations that guide users
3. **Depth & Dimension** - Subtle layering with modern shadows
4. **Premium Feel** - Refined details that convey quality
5. **Accessible Luxury** - Beautiful yet inclusive design

### 1.2 Theme Direction Options

#### Option A: "Obsidian Pro" (Recommended)
A sophisticated dark-first theme with subtle blue accents and glass morphism elements.

```
Primary Aesthetic: Deep navy gradients, floating cards, subtle glow effects
Target Feel: Premium SaaS like Linear, Raycast, or Vercel Dashboard
Best For: Modern tech-forward enterprise, 24/7 operations centers
```

#### Option B: "Arctic Light"
A clean, bright theme with sharp contrasts and bold primary accents.

```
Primary Aesthetic: Pure whites, crisp shadows, vibrant accent pops
Target Feel: Clean like Notion, Figma, or Stripe Dashboard
Best For: Traditional enterprise, daytime-heavy usage
```

#### Option C: "Adaptive Harmony" (Hybrid)
Intelligent theme that adapts based on time, user preference, and context.

```
Primary Aesthetic: Seamless light/dark transitions with context-aware theming
Target Feel: Apple-level polish with system integration
Best For: Mixed usage patterns, accessibility-focused organizations
```

---

## 2. Complete Color Palette

### 2.1 Primary Brand Colors

```css
/* LinkedEye Primary Blue - Core Brand Identity */
--brand-50: #eff6ff;
--brand-100: #dbeafe;
--brand-200: #bfdbfe;
--brand-300: #93c5fd;
--brand-400: #60a5fa;
--brand-500: #3b82f6;  /* Primary action */
--brand-600: #2563eb;  /* Primary hover */
--brand-700: #1d4ed8;  /* Primary active */
--brand-800: #1e40af;
--brand-900: #1e3a8a;
--brand-950: #172554;
```

### 2.2 Neutral Palette (Light Mode)

```css
/* Light Mode Neutrals - Warmer undertones for reduced eye strain */
--neutral-0: #ffffff;
--neutral-25: #fcfcfd;
--neutral-50: #f9fafb;
--neutral-100: #f3f4f6;
--neutral-200: #e5e7eb;
--neutral-300: #d1d5db;
--neutral-400: #9ca3af;
--neutral-500: #6b7280;
--neutral-600: #4b5563;
--neutral-700: #374151;
--neutral-800: #1f2937;
--neutral-900: #111827;
--neutral-950: #030712;
```

### 2.3 Neutral Palette (Dark Mode)

```css
/* Dark Mode Neutrals - Deep navy base for premium feel */
--dark-0: #0a0f1a;      /* Deepest background */
--dark-25: #0d1424;
--dark-50: #111827;     /* Main background */
--dark-100: #1a2234;    /* Elevated surfaces */
--dark-200: #243044;    /* Card backgrounds */
--dark-300: #2e3d54;    /* Borders, dividers */
--dark-400: #475569;    /* Muted text */
--dark-500: #64748b;    /* Secondary text */
--dark-600: #94a3b8;    /* Primary text */
--dark-700: #cbd5e1;    /* Emphasized text */
--dark-800: #e2e8f0;    /* Strong emphasis */
--dark-900: #f1f5f9;    /* Maximum contrast */
--dark-950: #f8fafc;    /* Pure light elements */
```

### 2.4 Semantic Colors

```css
/* Success - Emerald Green */
--success-50: #ecfdf5;
--success-100: #d1fae5;
--success-200: #a7f3d0;
--success-300: #6ee7b7;
--success-400: #34d399;
--success-500: #10b981;  /* Default success */
--success-600: #059669;  /* Hover */
--success-700: #047857;

/* Warning - Amber */
--warning-50: #fffbeb;
--warning-100: #fef3c7;
--warning-200: #fde68a;
--warning-300: #fcd34d;
--warning-400: #fbbf24;
--warning-500: #f59e0b;  /* Default warning */
--warning-600: #d97706;  /* Hover */
--warning-700: #b45309;

/* Error/Danger - Rose Red */
--danger-50: #fff1f2;
--danger-100: #ffe4e6;
--danger-200: #fecdd3;
--danger-300: #fda4af;
--danger-400: #fb7185;
--danger-500: #f43f5e;   /* Default danger */
--danger-600: #e11d48;   /* Hover */
--danger-700: #be123c;

/* Critical - Deep Red (for P1 incidents) */
--critical-500: #dc2626;
--critical-600: #b91c1c;
--critical-glow: rgba(220, 38, 38, 0.35);

/* Info - Sky Blue */
--info-50: #f0f9ff;
--info-100: #e0f2fe;
--info-200: #bae6fd;
--info-300: #7dd3fc;
--info-400: #38bdf8;
--info-500: #0ea5e9;     /* Default info */
--info-600: #0284c7;     /* Hover */
--info-700: #0369a1;
```

### 2.5 Accent Colors (Feature Differentiation)

```css
/* Violet - AI/Intelligence Features */
--accent-violet: #8b5cf6;
--accent-violet-glow: rgba(139, 92, 246, 0.25);

/* Cyan - Network/Infrastructure */
--accent-cyan: #06b6d4;
--accent-cyan-glow: rgba(6, 182, 212, 0.25);

/* Rose - Alerts/Urgent Actions */
--accent-rose: #f43f5e;
--accent-rose-glow: rgba(244, 63, 94, 0.25);

/* Amber - Operations/Schedules */
--accent-amber: #f59e0b;
--accent-amber-glow: rgba(245, 158, 11, 0.25);

/* Teal - Analytics/Reports */
--accent-teal: #14b8a6;
--accent-teal-glow: rgba(20, 184, 166, 0.25);
```

---

## 3. Typography System

### 3.1 Font Stack Recommendations

**Option A: Inter (Recommended)**
Modern, highly legible, excellent for UI. Free and open-source.

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Option B: Plus Jakarta Sans**
Geometric with personality, premium feel. Free and open-source.

```css
--font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
```

**Monospace (Recommended):**
```css
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
```

### 3.2 Type Scale

```css
/* Base: 16px */
--text-xs: 0.75rem;      /* 12px - Captions, labels */
--text-sm: 0.875rem;     /* 14px - Secondary text, metadata */
--text-base: 1rem;       /* 16px - Body text */
--text-lg: 1.125rem;     /* 18px - Emphasized body */
--text-xl: 1.25rem;      /* 20px - Section headers */
--text-2xl: 1.5rem;      /* 24px - Page titles */
--text-3xl: 1.875rem;    /* 30px - Hero text */
--text-4xl: 2.25rem;     /* 36px - Display */
--text-5xl: 3rem;        /* 48px - Large display */

/* Line Heights */
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;

/* Letter Spacing */
--tracking-tighter: -0.05em;
--tracking-tight: -0.025em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
--tracking-wider: 0.05em;
```

### 3.3 Font Weight Scale

```css
--font-light: 300;
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
```

### 3.4 Typography Usage Guidelines

| Element | Size | Weight | Tracking | Color |
|---------|------|--------|----------|-------|
| Display Heading | 3xl-5xl | bold | tight | primary |
| Page Title | 2xl | semibold | tight | primary |
| Section Header | xl | semibold | tight | primary |
| Card Title | lg | semibold | normal | primary |
| Body Text | base | regular | normal | primary |
| Secondary Text | sm | regular | normal | secondary |
| Caption/Label | xs | medium | wide | tertiary |
| Button Text | sm | semibold | normal | varies |
| Input Text | sm | regular | normal | primary |
| Badge Text | xs | semibold | normal | varies |

---

## 4. Button Styles

### 4.1 Button Variants

```tsx
// Primary - Main actions
primary: {
  base: 'bg-brand-600 text-white',
  hover: 'hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-500/25',
  active: 'active:bg-brand-800 active:scale-[0.98]',
  focus: 'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
}

// Secondary - Supporting actions
secondary: {
  light: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
  dark: 'bg-dark-200 text-dark-700 hover:bg-dark-300',
}

// Ghost - Minimal emphasis
ghost: {
  light: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
  dark: 'text-dark-500 hover:bg-dark-200 hover:text-dark-700',
}

// Outline - Medium emphasis
outline: {
  light: 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400',
  dark: 'border border-dark-300 text-dark-600 hover:bg-dark-200 hover:border-dark-400',
}

// Danger - Destructive actions
danger: {
  solid: 'bg-danger-500 text-white hover:bg-danger-600',
  outline: 'border border-danger-300 text-danger-600 hover:bg-danger-50',
  ghost: 'text-danger-600 hover:bg-danger-50',
}

// Success - Positive confirmations
success: {
  solid: 'bg-success-500 text-white hover:bg-success-600',
}

// Gradient - Premium CTAs
gradient: {
  primary: 'bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:from-brand-700 hover:to-brand-600',
  premium: 'bg-gradient-to-r from-violet-600 to-brand-600 text-white',
}
```

### 4.2 Button Sizes

```css
/* Size Tokens */
--btn-xs: px-2.5 py-1 text-xs rounded-md gap-1;
--btn-sm: px-3 py-1.5 text-sm rounded-lg gap-1.5;
--btn-md: px-4 py-2 text-sm rounded-lg gap-2;
--btn-lg: px-5 py-2.5 text-base rounded-lg gap-2;
--btn-xl: px-6 py-3 text-base rounded-xl gap-2.5;

/* Icon-only variants */
--btn-icon-sm: w-8 h-8 rounded-lg;
--btn-icon-md: w-10 h-10 rounded-lg;
--btn-icon-lg: w-12 h-12 rounded-xl;
```

### 4.3 Button States & Micro-interactions

```css
/* Transition timing */
button {
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover elevation */
button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Active press */
button:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

/* Loading state */
button[data-loading] {
  position: relative;
  color: transparent;
  pointer-events: none;
}

button[data-loading]::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
```

---

## 5. Form Elements

### 5.1 Input Fields

```css
/* Base Input */
.input-base {
  @apply w-full px-3 py-2.5 text-sm rounded-lg border transition-all duration-200;
  @apply bg-white dark:bg-dark-100;
  @apply border-neutral-300 dark:border-dark-300;
  @apply text-neutral-900 dark:text-dark-700;
  @apply placeholder:text-neutral-400 dark:placeholder:text-dark-400;
  @apply focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20;
  @apply disabled:bg-neutral-100 dark:disabled:bg-dark-200 disabled:cursor-not-allowed;
}

/* Input with icon */
.input-with-icon-left {
  @apply pl-10;
}

.input-with-icon-right {
  @apply pr-10;
}

/* Error state */
.input-error {
  @apply border-danger-500 focus:border-danger-500 focus:ring-danger-500/20;
  @apply bg-danger-50/50 dark:bg-danger-900/10;
}

/* Success state */
.input-success {
  @apply border-success-500 focus:border-success-500 focus:ring-success-500/20;
}
```

### 5.2 Select/Dropdown

```css
/* Custom Select */
.select {
  @apply relative w-full;
}

.select-trigger {
  @apply w-full px-3 py-2.5 text-sm rounded-lg border;
  @apply bg-white dark:bg-dark-100;
  @apply border-neutral-300 dark:border-dark-300;
  @apply flex items-center justify-between gap-2;
  @apply cursor-pointer transition-all duration-200;
  @apply hover:border-neutral-400 dark:hover:border-dark-400;
  @apply focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20;
}

.select-content {
  @apply absolute z-50 w-full mt-1 py-1 rounded-lg;
  @apply bg-white dark:bg-dark-100;
  @apply border border-neutral-200 dark:border-dark-300;
  @apply shadow-lg dark:shadow-dark-50;
  @apply animate-in fade-in-0 zoom-in-95;
}

.select-item {
  @apply px-3 py-2 text-sm cursor-pointer;
  @apply text-neutral-700 dark:text-dark-600;
  @apply hover:bg-neutral-100 dark:hover:bg-dark-200;
  @apply focus:bg-neutral-100 dark:focus:bg-dark-200;
  @apply flex items-center gap-2;
}

.select-item[data-selected] {
  @apply bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400;
}
```

### 5.3 Checkbox & Radio

```css
/* Modern Checkbox */
.checkbox {
  @apply w-5 h-5 rounded border-2;
  @apply border-neutral-300 dark:border-dark-400;
  @apply text-brand-600 dark:text-brand-500;
  @apply focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2;
  @apply transition-all duration-150;
  @apply cursor-pointer;
}

.checkbox:checked {
  @apply bg-brand-600 border-brand-600;
  @apply dark:bg-brand-500 dark:border-brand-500;
}

/* Animated checkmark */
.checkbox:checked::after {
  animation: checkmark 0.2s ease-out forwards;
}

@keyframes checkmark {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* Radio Button */
.radio {
  @apply w-5 h-5 rounded-full border-2;
  @apply border-neutral-300 dark:border-dark-400;
  @apply text-brand-600;
  @apply focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2;
  @apply transition-all duration-150;
}

.radio:checked {
  @apply border-brand-600 bg-brand-600;
  @apply dark:border-brand-500 dark:bg-brand-500;
}
```

### 5.4 Toggle/Switch

```css
/* Modern Toggle Switch */
.toggle {
  @apply relative w-11 h-6 rounded-full cursor-pointer transition-all duration-200;
  @apply bg-neutral-300 dark:bg-dark-300;
}

.toggle:checked {
  @apply bg-brand-600 dark:bg-brand-500;
}

.toggle::after {
  @apply content-[''] absolute w-5 h-5 rounded-full;
  @apply bg-white shadow-sm;
  @apply top-0.5 left-0.5;
  @apply transition-transform duration-200;
}

.toggle:checked::after {
  @apply translate-x-5;
}

/* With status indicator */
.toggle[data-status="on"]::before {
  @apply content-[''] absolute w-1.5 h-1.5 rounded-full;
  @apply bg-success-400 animate-pulse;
  @apply top-2 left-2;
}
```

---

## 6. Layout Components

### 6.1 Card System

```css
/* Base Card */
.card {
  @apply relative rounded-xl overflow-hidden;
  @apply bg-white dark:bg-dark-100;
  @apply border border-neutral-200 dark:border-dark-300;
  @apply shadow-sm dark:shadow-none;
  @apply transition-all duration-200;
}

.card:hover {
  @apply shadow-md dark:shadow-none;
  @apply border-neutral-300 dark:border-dark-400;
}

/* Elevated Card */
.card-elevated {
  @apply shadow-lg dark:shadow-2xl dark:shadow-black/20;
  @apply border-0;
}

/* Glass Card */
.card-glass {
  @apply backdrop-blur-xl;
  @apply bg-white/80 dark:bg-dark-100/80;
  @apply border border-white/20 dark:border-white/10;
  @apply shadow-lg shadow-black/5;
}

/* Interactive Card */
.card-interactive {
  @apply cursor-pointer;
  @apply hover:scale-[1.02] hover:shadow-xl;
  @apply active:scale-[0.99];
  @apply transition-all duration-200;
}

/* Card with Gradient Border */
.card-gradient-border {
  @apply relative;
  @apply before:absolute before:inset-0 before:rounded-xl before:p-[1px];
  @apply before:bg-gradient-to-br before:from-brand-500 before:to-violet-500;
  @apply before:-z-10;
}
```

### 6.2 Card Sections

```css
/* Card Header */
.card-header {
  @apply px-5 py-4;
  @apply border-b border-neutral-200 dark:border-dark-300;
  @apply flex items-center justify-between gap-4;
}

.card-title {
  @apply text-base font-semibold;
  @apply text-neutral-900 dark:text-dark-800;
}

.card-subtitle {
  @apply text-sm text-neutral-500 dark:text-dark-500;
}

/* Card Body */
.card-body {
  @apply p-5;
}

.card-body-dense {
  @apply p-4;
}

.card-body-spacious {
  @apply p-6;
}

/* Card Footer */
.card-footer {
  @apply px-5 py-4;
  @apply bg-neutral-50 dark:bg-dark-200;
  @apply border-t border-neutral-200 dark:border-dark-300;
  @apply flex items-center justify-end gap-3;
}
```

### 6.3 Sidebar Layout

```css
/* Modern Sidebar */
.sidebar {
  @apply fixed left-0 top-0 h-full z-50;
  @apply flex flex-col;
  @apply transition-all duration-300 ease-out;

  /* Gradient background */
  background: linear-gradient(
    180deg,
    var(--sidebar-top, #0f1c3f) 0%,
    var(--sidebar-bottom, #1e3a5f) 100%
  );

  /* Subtle glow effect */
  box-shadow:
    4px 0 24px rgba(0, 0, 0, 0.15),
    inset -1px 0 0 rgba(255, 255, 255, 0.05);
}

.sidebar[data-collapsed="true"] {
  @apply w-[72px];
}

.sidebar[data-collapsed="false"] {
  @apply w-[260px];
}

/* Sidebar Navigation Item */
.nav-item {
  @apply relative flex items-center gap-3 px-3 py-2.5;
  @apply rounded-lg transition-all duration-200;
  @apply text-white/70 hover:text-white;
  @apply hover:bg-white/10;
}

.nav-item[data-active="true"] {
  @apply text-white;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
}
```

### 6.4 Header/Topbar

```css
/* Modern Header */
.header {
  @apply fixed top-0 right-0 h-14 z-40;
  @apply flex items-center justify-between px-6 gap-4;
  @apply bg-white dark:bg-dark-50;
  @apply border-b border-neutral-200 dark:border-dark-300;
  @apply transition-all duration-300;

  /* Adjust for sidebar */
  left: var(--sidebar-width, 260px);
}

.header[data-sidebar-collapsed="true"] {
  left: 72px;
}

/* Header search */
.header-search {
  @apply relative flex-1 max-w-md;
}

.header-search-input {
  @apply w-full pl-10 pr-4 py-2 text-sm rounded-lg;
  @apply bg-neutral-100 dark:bg-dark-100;
  @apply border border-transparent;
  @apply focus:bg-white dark:focus:bg-dark-200;
  @apply focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20;
  @apply transition-all duration-200;
}
```

### 6.5 Page Layout

```css
/* Main Content Area */
.main-content {
  @apply min-h-screen;
  @apply pt-14; /* Header height */
  @apply transition-all duration-300;

  /* Adjust for sidebar */
  margin-left: var(--sidebar-width, 260px);
  padding: 24px;
}

.main-content[data-sidebar-collapsed="true"] {
  margin-left: 72px;
}

/* Page Header */
.page-header {
  @apply mb-6;
}

.page-title {
  @apply text-2xl font-semibold text-neutral-900 dark:text-dark-800;
  @apply tracking-tight;
}

.page-description {
  @apply mt-1 text-sm text-neutral-500 dark:text-dark-500;
}

/* Page Actions */
.page-actions {
  @apply flex items-center gap-3;
}

/* Content Grid */
.content-grid {
  @apply grid gap-6;
  @apply grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4;
}
```

---

## 7. Shadow System

### 7.1 Elevation Scale

```css
/* Light Mode Shadows */
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
--shadow-inner: inset 0 2px 4px rgba(0, 0, 0, 0.06);

/* Dark Mode Shadows - More subtle, uses glow */
--shadow-dark-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
--shadow-dark-md: 0 4px 16px rgba(0, 0, 0, 0.4);
--shadow-dark-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
--shadow-dark-xl: 0 16px 48px rgba(0, 0, 0, 0.6);
```

### 7.2 Glow Effects

```css
/* Colored Glows */
--glow-brand: 0 0 20px rgba(59, 130, 246, 0.3);
--glow-brand-strong: 0 0 40px rgba(59, 130, 246, 0.5);
--glow-success: 0 0 20px rgba(16, 185, 129, 0.3);
--glow-warning: 0 0 20px rgba(245, 158, 11, 0.3);
--glow-danger: 0 0 20px rgba(244, 63, 94, 0.3);
--glow-violet: 0 0 20px rgba(139, 92, 246, 0.3);

/* Neon Effects (for dark mode emphasis) */
--neon-brand: 0 0 8px rgba(59, 130, 246, 0.6), 0 0 24px rgba(59, 130, 246, 0.4);
--neon-critical: 0 0 8px rgba(220, 38, 38, 0.6), 0 0 24px rgba(220, 38, 38, 0.4);
```

### 7.3 Card Shadows

```css
/* Card-specific shadows */
--shadow-card: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-card-hover: 0 10px 40px -10px rgba(0, 0, 0, 0.15);
--shadow-card-float: 0 20px 60px -15px rgba(0, 0, 0, 0.2);

/* Dropdown shadows */
--shadow-dropdown: 0 10px 40px -5px rgba(0, 0, 0, 0.15);
--shadow-modal: 0 25px 80px -20px rgba(0, 0, 0, 0.25);
```

---

## 8. Border Radius System

```css
/* Border Radius Scale */
--radius-none: 0;
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-2xl: 16px;
--radius-3xl: 24px;
--radius-full: 9999px;

/* Component-specific radii */
--radius-button: var(--radius-lg);
--radius-input: var(--radius-lg);
--radius-card: var(--radius-xl);
--radius-modal: var(--radius-2xl);
--radius-badge: var(--radius-full);
--radius-avatar: var(--radius-full);
```

---

## 9. Spacing & Layout

### 9.1 Spacing Scale

```css
/* Base unit: 4px */
--space-0: 0;
--space-px: 1px;
--space-0.5: 2px;
--space-1: 4px;
--space-1.5: 6px;
--space-2: 8px;
--space-2.5: 10px;
--space-3: 12px;
--space-3.5: 14px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-7: 28px;
--space-8: 32px;
--space-9: 36px;
--space-10: 40px;
--space-11: 44px;
--space-12: 48px;
--space-14: 56px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
--space-28: 112px;
--space-32: 128px;
```

### 9.2 Layout Dimensions

```css
/* Fixed dimensions */
--sidebar-width: 260px;
--sidebar-collapsed-width: 72px;
--header-height: 56px;
--footer-height: 48px;

/* Container widths */
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;
--container-max: 1680px;

/* Card widths */
--card-sm: 320px;
--card-md: 400px;
--card-lg: 500px;
```

---

## 10. Animation & Motion

### 10.1 Timing Functions

```css
/* Easing curves */
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.68, -0.6, 0.32, 1.6);
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-expo-out: cubic-bezier(0.16, 1, 0.3, 1);
```

### 10.2 Duration Scale

```css
--duration-instant: 0ms;
--duration-fast: 100ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--duration-slower: 500ms;
--duration-slowest: 700ms;
```

### 10.3 Animation Keyframes

```css
/* Fade animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scale animations */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes scaleInBounce {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  60% {
    opacity: 1;
    transform: scale(1.03);
  }
  100% {
    transform: scale(1);
  }
}

/* Slide animations */
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Pulse/Glow */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 8px currentColor; }
  50% { box-shadow: 0 0 20px currentColor; }
}

/* Shimmer (loading) */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Spin */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Float */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
```

### 10.4 Animation Classes

```css
/* Entrance animations */
.animate-fade-in { animation: fadeIn 200ms var(--ease-out) forwards; }
.animate-fade-in-up { animation: fadeInUp 300ms var(--ease-expo-out) forwards; }
.animate-fade-in-down { animation: fadeInDown 300ms var(--ease-expo-out) forwards; }
.animate-scale-in { animation: scaleIn 200ms var(--ease-expo-out) forwards; }
.animate-scale-in-bounce { animation: scaleInBounce 400ms var(--ease-out) forwards; }
.animate-slide-in-right { animation: slideInRight 300ms var(--ease-expo-out) forwards; }
.animate-slide-in-left { animation: slideInLeft 300ms var(--ease-expo-out) forwards; }

/* Continuous animations */
.animate-pulse { animation: pulse 2s var(--ease-in-out) infinite; }
.animate-pulse-glow { animation: pulseGlow 2s var(--ease-in-out) infinite; }
.animate-spin { animation: spin 1s linear infinite; }
.animate-float { animation: float 3s var(--ease-in-out) infinite; }

/* Loading shimmer */
.animate-shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 11. Accessibility Guidelines

### 11.1 Color Contrast Requirements

| Context | Minimum Ratio | WCAG Level |
|---------|--------------|------------|
| Body text | 4.5:1 | AA |
| Large text (18px+) | 3:1 | AA |
| UI components | 3:1 | AA |
| Focus indicators | 3:1 | AA |
| Non-text elements | 3:1 | AA |

### 11.2 Focus States

```css
/* Universal focus style */
:focus-visible {
  outline: 2px solid var(--color-brand-500);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Skip link for keyboard navigation */
.skip-link {
  @apply sr-only focus:not-sr-only;
  @apply fixed top-4 left-4 z-[9999];
  @apply px-4 py-2 rounded-lg;
  @apply bg-brand-600 text-white font-medium;
  @apply focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2;
}

/* Focus-within for compound components */
.input-group:focus-within {
  @apply ring-2 ring-brand-500/20;
}
```

### 11.3 ARIA Patterns

```tsx
// Button with loading state
<button
  aria-busy={isLoading}
  aria-disabled={isDisabled}
  aria-label={ariaLabel}
>
  {isLoading ? <Spinner /> : children}
</button>

// Form field with error
<input
  aria-invalid={hasError}
  aria-describedby={errorId}
  aria-required={isRequired}
/>
{hasError && <span id={errorId} role="alert">{errorMessage}</span>}

// Navigation landmark
<nav aria-label="Main navigation">
  <ul role="menubar">
    <li role="none">
      <a role="menuitem" href="/dashboard">Dashboard</a>
    </li>
  </ul>
</nav>

// Modal dialog
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Modal Title</h2>
  <p id="modal-description">Modal content...</p>
</div>
```

### 11.4 Keyboard Navigation

- **Tab**: Move focus forward
- **Shift + Tab**: Move focus backward
- **Enter/Space**: Activate buttons/links
- **Arrow keys**: Navigate within menus, tabs, grids
- **Escape**: Close modals, dropdowns, dismiss
- **Home/End**: Jump to first/last item in lists

---

## 12. Responsive Design

### 12.1 Breakpoint System

```css
/* Mobile-first breakpoints */
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet portrait */
--breakpoint-lg: 1024px;  /* Tablet landscape / Small desktop */
--breakpoint-xl: 1280px;  /* Desktop */
--breakpoint-2xl: 1536px; /* Large desktop */
```

### 12.2 Responsive Patterns

```css
/* Sidebar behavior */
@media (max-width: 1023px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar[data-open="true"] {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
  }
}

/* Card grid responsive */
.card-grid {
  @apply grid gap-4;
  @apply grid-cols-1;
  @apply sm:grid-cols-2;
  @apply lg:grid-cols-3;
  @apply xl:grid-cols-4;
}

/* Table responsive */
@media (max-width: 767px) {
  .table-responsive {
    @apply block overflow-x-auto;
    @apply -mx-4 px-4;
  }

  .table-card-view {
    @apply block;
  }

  .table-card-view tr {
    @apply block mb-4 rounded-lg border p-4;
  }

  .table-card-view td {
    @apply block;
    @apply before:content-[attr(data-label)] before:font-medium before:block;
  }
}
```

### 12.3 Touch Targets

```css
/* Minimum touch target size: 44x44px */
.touch-target {
  @apply min-w-[44px] min-h-[44px];
  @apply flex items-center justify-center;
}

/* Mobile button sizing */
@media (max-width: 639px) {
  .btn {
    @apply min-h-[44px] px-4;
  }

  .btn-icon {
    @apply w-11 h-11;
  }
}
```

---

## 13. Component-Specific Improvements

### 13.1 Badge System

```css
/* Badge base */
.badge {
  @apply inline-flex items-center gap-1 px-2 py-0.5;
  @apply text-xs font-medium rounded-full;
  @apply whitespace-nowrap;
}

/* Badge variants */
.badge-default { @apply bg-neutral-100 text-neutral-700 dark:bg-dark-200 dark:text-dark-600; }
.badge-primary { @apply bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400; }
.badge-success { @apply bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400; }
.badge-warning { @apply bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400; }
.badge-danger { @apply bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400; }
.badge-info { @apply bg-info-100 text-info-700 dark:bg-info-900/30 dark:text-info-400; }

/* Badge with dot indicator */
.badge-dot::before {
  @apply content-[''] w-1.5 h-1.5 rounded-full;
  @apply bg-current opacity-70;
}

/* Pulsing badge (for active alerts) */
.badge-pulse {
  @apply relative;
}

.badge-pulse::after {
  @apply content-[''] absolute -top-0.5 -right-0.5;
  @apply w-2 h-2 rounded-full bg-current;
  @apply animate-ping opacity-75;
}
```

### 13.2 Avatar System

```css
/* Avatar base */
.avatar {
  @apply relative inline-flex items-center justify-center;
  @apply rounded-full overflow-hidden;
  @apply bg-gradient-to-br from-brand-500 to-violet-500;
  @apply text-white font-medium;
  @apply ring-2 ring-white dark:ring-dark-100;
}

/* Avatar sizes */
.avatar-xs { @apply w-6 h-6 text-xs; }
.avatar-sm { @apply w-8 h-8 text-sm; }
.avatar-md { @apply w-10 h-10 text-sm; }
.avatar-lg { @apply w-12 h-12 text-base; }
.avatar-xl { @apply w-16 h-16 text-lg; }
.avatar-2xl { @apply w-24 h-24 text-2xl; }

/* Avatar with status */
.avatar-status {
  @apply absolute bottom-0 right-0;
  @apply w-3 h-3 rounded-full;
  @apply ring-2 ring-white dark:ring-dark-100;
}

.avatar-status-online { @apply bg-success-500; }
.avatar-status-offline { @apply bg-neutral-400; }
.avatar-status-busy { @apply bg-danger-500; }
.avatar-status-away { @apply bg-warning-500; }

/* Avatar group */
.avatar-group {
  @apply flex -space-x-2;
}

.avatar-group .avatar {
  @apply hover:z-10 hover:scale-110;
  @apply transition-transform duration-150;
}
```

### 13.3 Stats Card

```css
/* Stats card */
.stats-card {
  @apply relative p-5 rounded-xl;
  @apply bg-white dark:bg-dark-100;
  @apply border border-neutral-200 dark:border-dark-300;
  @apply transition-all duration-200;
  @apply hover:shadow-lg hover:border-brand-200 dark:hover:border-brand-800;
}

.stats-card-value {
  @apply text-3xl font-bold tracking-tight;
  @apply text-neutral-900 dark:text-dark-800;
}

.stats-card-label {
  @apply text-sm text-neutral-500 dark:text-dark-500;
  @apply mt-1;
}

.stats-card-trend {
  @apply inline-flex items-center gap-1 mt-2;
  @apply text-sm font-medium;
}

.stats-card-trend-up { @apply text-success-600; }
.stats-card-trend-down { @apply text-danger-600; }
.stats-card-trend-neutral { @apply text-neutral-500; }

/* Stats card with gradient */
.stats-card-gradient {
  @apply text-white;
  @apply border-0;
  background: linear-gradient(135deg, var(--gradient-from) 0%, var(--gradient-to) 100%);
}

.stats-card-gradient .stats-card-value { @apply text-white; }
.stats-card-gradient .stats-card-label { @apply text-white/80; }
.stats-card-gradient .stats-card-trend { @apply text-white/90; }
```

### 13.4 Table Improvements

```css
/* Modern table */
.table {
  @apply w-full text-sm;
}

.table thead {
  @apply bg-neutral-50 dark:bg-dark-200;
}

.table th {
  @apply px-4 py-3 text-left;
  @apply text-xs font-semibold uppercase tracking-wider;
  @apply text-neutral-500 dark:text-dark-500;
  @apply border-b border-neutral-200 dark:border-dark-300;
}

.table td {
  @apply px-4 py-3;
  @apply text-neutral-700 dark:text-dark-600;
  @apply border-b border-neutral-100 dark:border-dark-300;
}

.table tbody tr {
  @apply transition-colors duration-100;
  @apply hover:bg-neutral-50 dark:hover:bg-dark-200;
}

/* Striped variant */
.table-striped tbody tr:nth-child(even) {
  @apply bg-neutral-50/50 dark:bg-dark-200/50;
}

/* Selectable rows */
.table-selectable tbody tr {
  @apply cursor-pointer;
}

.table-selectable tbody tr[data-selected] {
  @apply bg-brand-50 dark:bg-brand-900/20;
}

/* Sticky header */
.table-sticky thead {
  @apply sticky top-0 z-10;
  @apply bg-white dark:bg-dark-100;
  @apply shadow-sm;
}
```

---

## 14. User Interaction Flow Improvements

### 14.1 Loading States

```css
/* Skeleton loading */
.skeleton {
  @apply relative overflow-hidden;
  @apply bg-neutral-200 dark:bg-dark-300;
  @apply rounded;
}

.skeleton::after {
  @apply content-[''] absolute inset-0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

.skeleton-text { @apply h-4 w-full; }
.skeleton-title { @apply h-6 w-3/4; }
.skeleton-avatar { @apply w-10 h-10 rounded-full; }
.skeleton-button { @apply h-10 w-24 rounded-lg; }
.skeleton-card { @apply h-32 w-full rounded-xl; }

/* Page loading overlay */
.page-loader {
  @apply fixed inset-0 z-50;
  @apply flex items-center justify-center;
  @apply bg-white/80 dark:bg-dark-50/80;
  @apply backdrop-blur-sm;
}

/* Inline loading spinner */
.spinner {
  @apply w-5 h-5 border-2 rounded-full;
  @apply border-current border-r-transparent;
  @apply animate-spin;
}
```

### 14.2 Empty States

```css
/* Empty state container */
.empty-state {
  @apply flex flex-col items-center justify-center;
  @apply py-16 px-6 text-center;
}

.empty-state-icon {
  @apply w-16 h-16 mb-4;
  @apply text-neutral-300 dark:text-dark-400;
}

.empty-state-title {
  @apply text-lg font-semibold;
  @apply text-neutral-900 dark:text-dark-700;
}

.empty-state-description {
  @apply mt-2 text-sm max-w-sm;
  @apply text-neutral-500 dark:text-dark-500;
}

.empty-state-action {
  @apply mt-6;
}
```

### 14.3 Feedback & Notifications

```css
/* Toast notifications */
.toast {
  @apply flex items-start gap-3 p-4 rounded-xl;
  @apply bg-white dark:bg-dark-100;
  @apply border border-neutral-200 dark:border-dark-300;
  @apply shadow-xl;
  @apply animate-slide-in-right;
}

.toast-icon { @apply w-5 h-5 flex-shrink-0 mt-0.5; }
.toast-content { @apply flex-1 min-w-0; }
.toast-title { @apply font-medium text-neutral-900 dark:text-dark-700; }
.toast-message { @apply text-sm text-neutral-500 dark:text-dark-500 mt-0.5; }
.toast-close { @apply p-1 rounded hover:bg-neutral-100 dark:hover:bg-dark-200; }

/* Toast variants */
.toast-success .toast-icon { @apply text-success-500; }
.toast-error .toast-icon { @apply text-danger-500; }
.toast-warning .toast-icon { @apply text-warning-500; }
.toast-info .toast-icon { @apply text-info-500; }

/* Alert banners */
.alert {
  @apply flex items-start gap-3 p-4 rounded-lg;
  @apply border;
}

.alert-success {
  @apply bg-success-50 border-success-200 text-success-800;
  @apply dark:bg-success-900/20 dark:border-success-800 dark:text-success-300;
}

.alert-warning {
  @apply bg-warning-50 border-warning-200 text-warning-800;
  @apply dark:bg-warning-900/20 dark:border-warning-800 dark:text-warning-300;
}

.alert-danger {
  @apply bg-danger-50 border-danger-200 text-danger-800;
  @apply dark:bg-danger-900/20 dark:border-danger-800 dark:text-danger-300;
}

.alert-info {
  @apply bg-info-50 border-info-200 text-info-800;
  @apply dark:bg-info-900/20 dark:border-info-800 dark:text-info-300;
}
```

### 14.4 Confirmation Dialogs

```css
/* Modal overlay */
.modal-overlay {
  @apply fixed inset-0 z-50;
  @apply bg-black/50 backdrop-blur-sm;
  @apply animate-fade-in;
}

/* Modal content */
.modal {
  @apply fixed left-1/2 top-1/2 z-50;
  @apply -translate-x-1/2 -translate-y-1/2;
  @apply w-full max-w-lg p-6 rounded-2xl;
  @apply bg-white dark:bg-dark-100;
  @apply shadow-2xl;
  @apply animate-scale-in-bounce;
}

.modal-header {
  @apply flex items-center justify-between mb-4;
}

.modal-title {
  @apply text-lg font-semibold;
  @apply text-neutral-900 dark:text-dark-800;
}

.modal-body {
  @apply text-sm text-neutral-600 dark:text-dark-500;
}

.modal-footer {
  @apply flex items-center justify-end gap-3 mt-6;
}

/* Confirm dialog */
.confirm-dialog-icon {
  @apply w-12 h-12 rounded-full mb-4 mx-auto;
  @apply flex items-center justify-center;
}

.confirm-dialog-icon-danger {
  @apply bg-danger-100 text-danger-600;
  @apply dark:bg-danger-900/30 dark:text-danger-400;
}

.confirm-dialog-icon-warning {
  @apply bg-warning-100 text-warning-600;
  @apply dark:bg-warning-900/30 dark:text-warning-400;
}
```

---

## 15. Visual Reference Examples

### 15.1 Recommended Design Inspirations

| Aspect | Reference | Why |
|--------|-----------|-----|
| Dashboard Layout | Linear.app | Clean information density |
| Navigation | Raycast | Smooth transitions, collapsed states |
| Cards | Stripe Dashboard | Elegant shadows, clear hierarchy |
| Data Tables | Retool | Dense but readable |
| Forms | Notion | Minimal, clean inputs |
| Dark Mode | Vercel Dashboard | True dark, subtle glows |
| Notifications | Slack | Non-intrusive, actionable |
| Loading States | Figma | Skeleton + meaningful feedback |

### 15.2 Component Gallery Structure

```
Design System Gallery
├── Colors
│   ├── Brand palette
│   ├── Semantic colors
│   └── Light/Dark mode showcase
├── Typography
│   ├── Type scale
│   ├── Font weights
│   └── Usage examples
├── Components
│   ├── Buttons (all variants/states)
│   ├── Inputs (all types/states)
│   ├── Cards (all variants)
│   ├── Badges & Tags
│   ├── Avatars
│   ├── Tables
│   ├── Modals
│   └── Notifications
├── Patterns
│   ├── Page layouts
│   ├── Form patterns
│   ├── Empty states
│   └── Loading states
└── Motion
    ├── Transitions
    └── Animations
```

---

## 16. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Update Tailwind config with new design tokens
- [ ] Implement new color palette
- [ ] Add Inter font family
- [ ] Update CSS custom properties
- [ ] Implement new shadow system

### Phase 2: Core Components (Week 3-4)
- [ ] Redesign Button component
- [ ] Redesign Input/Form components
- [ ] Redesign Card component
- [ ] Update Badge/Tag components
- [ ] Improve Avatar system

### Phase 3: Layout (Week 5-6)
- [ ] Refine Sidebar design
- [ ] Update Header component
- [ ] Improve page layouts
- [ ] Add responsive refinements

### Phase 4: Polish (Week 7-8)
- [ ] Add micro-interactions
- [ ] Implement loading states
- [ ] Add empty states
- [ ] Accessibility audit
- [ ] Performance optimization

### Phase 5: Documentation (Week 9)
- [ ] Create component gallery
- [ ] Document usage patterns
- [ ] Write style guide
- [ ] Create Figma/design file

---

## 17. Quick Wins (Immediate Improvements)

These changes can be applied immediately with minimal risk:

1. **Font upgrade**: Switch from Segoe UI to Inter
2. **Border radius**: Increase from 8px to 12px for cards
3. **Shadow refinement**: Use more subtle, larger shadows
4. **Button hover**: Add subtle translateY(-1px) on hover
5. **Focus states**: Add consistent ring styles
6. **Loading skeleton**: Implement shimmer loading
7. **Color contrast**: Audit and fix accessibility issues
8. **Icon consistency**: Ensure all icons are same size/weight

---

## Appendix A: Tailwind Config Updates

```javascript
// tailwind.config.js additions
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 10px 40px -10px rgba(0, 0, 0, 0.12)',
        'glow-brand': '0 0 20px rgba(59, 130, 246, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-in-right': 'slideInRight 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in-bounce': 'scaleInBounce 400ms ease-out',
      },
    },
  },
}
```

---

*This design system is intended to serve as a comprehensive guide for the LinkedEye FinSpot platform redesign. Implementation should be iterative, with regular user testing and feedback loops.*

**Version**: 6.0
**Last Updated**: February 2026
**Author**: UI/UX Design System Team
