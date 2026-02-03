# LinkedEye Design System - Quick Reference Card

## Theme Recommendation: "Obsidian Pro"

A dark-first, premium enterprise theme inspired by Linear, Raycast, and Vercel.

---

## Color Palette at a Glance

### Primary Colors
```
Brand Blue     #3b82f6 → #2563eb → #1d4ed8
Violet Accent  #8b5cf6 → #7c3aed → #6d28d9
```

### Semantic Colors
```
Success   #10b981  (Emerald)
Warning   #f59e0b  (Amber)
Danger    #f43f5e  (Rose)
Critical  #dc2626  (Red - P1 incidents)
Info      #0ea5e9  (Sky)
```

### Light Mode Backgrounds
```
Page Background    #f9fafb
Card Background    #ffffff
Elevated           #ffffff
Border             #e5e7eb
Text Primary       #111827
Text Secondary     #6b7280
```

### Dark Mode Backgrounds
```
Page Background    #0a0f1a (Deep navy)
Card Background    #111827
Elevated           #1a2234
Border             rgba(255,255,255,0.08)
Text Primary       #f1f5f9
Text Secondary     #94a3b8
```

---

## Typography

### Recommended Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Type Scale
```
xs    12px   Captions, labels
sm    14px   Secondary text
base  16px   Body text
lg    18px   Card titles
xl    20px   Section headers
2xl   24px   Page titles
3xl   30px   Hero text
```

---

## Component Quick Styles

### Buttons

```tsx
// Primary Button
className="px-4 py-2 text-sm font-medium text-white bg-blue-600
  rounded-lg hover:bg-blue-700 hover:-translate-y-0.5
  active:scale-[0.98] transition-all duration-150
  focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"

// Secondary Button
className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100
  rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200
  dark:hover:bg-gray-700 transition-all duration-150"

// Ghost Button
className="px-4 py-2 text-sm font-medium text-gray-600
  hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800
  rounded-lg transition-all duration-150"

// Danger Button
className="px-4 py-2 text-sm font-medium text-white bg-rose-500
  rounded-lg hover:bg-rose-600 transition-all duration-150"
```

### Cards

```tsx
// Standard Card
className="bg-white dark:bg-gray-900 rounded-xl border
  border-gray-200 dark:border-gray-800
  shadow-sm hover:shadow-md transition-shadow duration-200"

// Interactive Card
className="bg-white dark:bg-gray-900 rounded-xl border
  border-gray-200 dark:border-gray-800
  shadow-sm hover:shadow-lg hover:scale-[1.01]
  cursor-pointer transition-all duration-200"

// Glass Card
className="backdrop-blur-xl bg-white/80 dark:bg-gray-900/80
  rounded-xl border border-white/20 dark:border-white/10
  shadow-lg"
```

### Inputs

```tsx
// Text Input
className="w-full px-3 py-2.5 text-sm rounded-lg border
  bg-white dark:bg-gray-900
  border-gray-300 dark:border-gray-700
  text-gray-900 dark:text-gray-100
  placeholder:text-gray-400 dark:placeholder:text-gray-500
  focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
  transition-all duration-200"

// Input with Error
className="... border-rose-500 focus:border-rose-500
  focus:ring-rose-500/20 bg-rose-50/50"
```

### Badges

```tsx
// Default Badge
className="inline-flex items-center px-2 py-0.5 text-xs font-medium
  rounded-full bg-gray-100 text-gray-700
  dark:bg-gray-800 dark:text-gray-300"

// Status Badges
success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
danger:  "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
info:    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
```

---

## Shadow System

```css
/* Light Mode */
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.12);
--shadow-card: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-card-hover: 0 10px 40px -10px rgba(0, 0, 0, 0.15);

/* Dark Mode - Use glows instead */
--glow-brand: 0 0 20px rgba(59, 130, 246, 0.3);
--glow-success: 0 0 20px rgba(16, 185, 129, 0.3);
--glow-danger: 0 0 20px rgba(244, 63, 94, 0.3);
```

---

## Border Radius

```
sm     4px   Small elements, checkboxes
md     6px   Default
lg     8px   Buttons, inputs
xl     12px  Cards, modals
2xl    16px  Large cards
3xl    24px  Hero sections
full   9999px  Pills, avatars
```

---

## Animation Presets

```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Fade In Up */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Scale In Bounce */
@keyframes scaleInBounce {
  0% { opacity: 0; transform: scale(0.9); }
  60% { opacity: 1; transform: scale(1.03); }
  100% { transform: scale(1); }
}

/* Button hover animation */
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn:active {
  transform: translateY(0) scale(0.98);
}

/* Card hover animation */
.card:hover {
  transform: scale(1.01);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

/* Loading spinner */
.spinner {
  animation: spin 0.6s linear infinite;
}

/* Skeleton shimmer */
.skeleton {
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255,255,255,0.2) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## Spacing Reference

```
1    4px     Tight spacing
2    8px     Icon gaps
3    12px    Input padding
4    16px    Card padding (compact)
5    20px    Card padding (default)
6    24px    Section spacing
8    32px    Component gaps
10   40px    Section margins
12   48px    Page margins
16   64px    Large spacing
```

---

## Z-Index Scale

```
0      Base layer
10     Cards, elevated content
20     Dropdowns, popovers
30     Sticky elements
40     Header
50     Modals, overlays
60     Notifications, toasts
70     Tooltips
100    Maximum (debug overlays)
```

---

## Accessibility Checklist

- [ ] Color contrast 4.5:1 for text
- [ ] Color contrast 3:1 for UI elements
- [ ] Focus visible states on all interactive elements
- [ ] ARIA labels on icon-only buttons
- [ ] Keyboard navigation support
- [ ] Reduced motion support
- [ ] Screen reader announcements for dynamic content

### Focus Style

```css
:focus-visible {
  outline: 2px solid rgba(59, 130, 246, 0.5);
  outline-offset: 2px;
  border-radius: 4px;
}
```

### Skip Link

```tsx
<a href="#main-content" className="sr-only focus:not-sr-only
  fixed top-4 left-4 z-50 px-4 py-2 bg-blue-600 text-white
  rounded-lg font-medium">
  Skip to main content
</a>
```

---

## Responsive Breakpoints

```
sm    640px    Mobile landscape
md    768px    Tablet
lg    1024px   Small desktop
xl    1280px   Desktop
2xl   1536px   Large desktop
```

### Sidebar Behavior
- Desktop (lg+): Visible, collapsible
- Tablet/Mobile (<lg): Hidden, overlay on open

---

## Quick Improvements to Apply Now

### 1. Font Upgrade
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### 2. Button Hover Effect
```css
.btn {
  transition: all 150ms ease;
}
.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

### 3. Card Radius Increase
```css
.card {
  border-radius: 12px; /* Was 8px */
}
```

### 4. Subtle Card Shadow
```css
.card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
}
.card:hover {
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.12);
}
```

### 5. Loading Skeleton
```tsx
<div className="animate-pulse space-y-3">
  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
</div>
```

---

## Color Reference Visual

```
BRAND BLUE          VIOLET              SUCCESS
[#3b82f6]           [#8b5cf6]           [#10b981]
████████            ████████            ████████

WARNING             DANGER              CRITICAL
[#f59e0b]           [#f43f5e]           [#dc2626]
████████            ████████            ████████

DARK BG             LIGHT BG            BORDER
[#0a0f1a]           [#f9fafb]           [#e5e7eb]
████████            ░░░░░░░░            --------
```

---

This quick reference card provides everything needed for consistent implementation across the LinkedEye platform.
