# Reticla Architecture

## Philosophy

Build a monolith first.

Optimize for:

* Speed of development
* Simplicity
* Maintainability

Avoid premature microservices.

---

# Tech Stack

Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS

Backend

- Supabase
  - PostgreSQL
  - Auth
  - Storage
  - Realtime (future)

ORM

- Prisma

Deployment

- Vercel

Authentication

- Supabase Auth

---

# Application Structure

apps/
└── web/

Inside web:

* app/
* components/
* features/
* lib/
* hooks/
* styles/

---

# Domain Model

User

↓

Session

↓

Player

↓

Team

↓

Match

↓

Score

↓

Leaderboard

---

# Core Entities

## User

Represents an authenticated account.

Can own multiple sessions.

---

## Session

Container for all match activity.

Contains:

* Players
* Teams
* Matches
* Scores
* Leaderboard

---

## Player

Participant inside a session.

May exist only inside that session.

No global profile in MVP.

---

## Team

Group of players generated for matches.

---

## Match

Competition between teams.

States:

* Upcoming
* Live
* Finished

---

## Score

Stores final match result.

---

## Leaderboard

Generated from session matches.

Not stored permanently unless snapshotting is needed.

---

# Feature Modules

Authentication

Session Management

Player Import

Team Generator

Match Management

Score Recording

Leaderboard Engine

Share Card Generator

---

# PWA

Requirements:

* Installable
* Offline shell
* Responsive
* Mobile optimized

No offline synchronization in MVP.

---

# Performance Targets

First Load:

< 2 seconds

Interaction Response:

< 100ms

Leaderboard Calculation:

Instant

Animation Budget:

Minimal

---

# Security

Authenticated routes protected.

Input validation required.

Server-side authorization checks.

Never trust client-provided ownership data.

---

# Future Evolution

Phase 1

Padel Session Hosting

Phase 2

Multi-sport Support

Phase 3

Player Profiles

Phase 4

Communities

Phase 5

Social Features

Phase 6

Cross-session Analytics
