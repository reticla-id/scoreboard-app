# Reticla Design System

## Design Principles

Reticla is a sports operations product.

The UI should feel:

* Fast
* Competitive
* Data-focused
* Modern
* Sporty

Inspired by:

* StatsPerform
* Opta
* Adidas
* Nike

Avoid:

* Corporate SaaS aesthetics
* Glassmorphism
* Excessive gradients
* Heavy animations

---

# Visual Identity

Theme:

Dark only

Style:

Square and structured

Dense information presentation

Sports broadcast aesthetics

---

# Typography

Headlines:

Bebas Neue

Usage:

* Session titles
* Match titles
* Leaderboard positions
* Hero statistics

Body:

Inter

Usage:

* UI text
* Forms
* Tables
* Labels

---

# Colors

```css
:root {
  color-scheme: dark;

  --background: #000000;
  --background-secondary: #111111;

  --surface: #181818;
  --surface-elevated: #1d1d1d;

  --border: #2a2a2a;

  --foreground: #ffffff;
  --foreground-secondary: #a0a0a0;

  --accent: #6b4aa5;
  --accent-secondary: #f47b20;

  --danger: #fca5a5;
}
```

---

# Layout

Desktop-first with mobile support.

Target:

* PWA
* Tablet
* Desktop

Grid:

* 12-column desktop
* 4-column mobile

Content width:

* 1280px max

---

# Components

## Cards

Square corners.

Radius:

8px

Use elevated surfaces sparingly.

---

## Buttons

Primary:

Accent color

Secondary:

Surface elevated

Danger:

Danger color

Height:

44px minimum

---

## Tables

Leaderboard is table-first.

Requirements:

* Sticky headers
* Sortable columns
* Responsive collapse

---

## Forms

Large touch targets.

Keyboard-friendly.

Fast data entry.

Minimal validation friction.

---

# Motion

Goal:

Enhance speed perception.

Duration:

100ms–200ms

Allowed:

* Fade
* Scale
* Slide

Avoid:

* Bounce
* Spring-heavy motion
* Parallax
* Decorative animation

---

# Product Screens

Landing

Authentication

Home

Session Detail

Players

Match Generator

Match List

Score Entry

Leaderboard

Share Result

---

# UX Rules

1. Score entry must be possible in under 3 taps.

2. Leaderboard must update instantly.

3. Match information must always be visible without scrolling when possible.

4. Every important action should have a keyboard shortcut on desktop.

5. Mobile users should be able to operate with one hand.
