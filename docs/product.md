# Reticla Product Specification

## Vision

Reticla helps sports community hosts run matches effortlessly.

Instead of spreadsheets, chat groups, and manual calculations, Reticla provides a fast workflow to create sessions, manage players, record scores, generate leaderboards, and share results.

---

# MVP Goal

Build the fastest way to host a community padel session.

Success metric:

A host can create a session, enter scores, and publish a leaderboard in under 3 minutes.

---

# MVP Scope

Sport:

* Padel only

No social features.

No public profiles.

No feeds.

No followers.

No global rankings.

Every session is isolated.

Data inside one session never affects another session.

---

# Primary User

Community Host

Examples:

* Weekly padel organizer
* Club manager
* Sports community admin
* Casual friend-group organizer

---

# Core Workflow

Host Session

↓

Add Players

↓

Generate Teams

↓

Create Matches

↓

Record Scores

↓

Generate Leaderboard

↓

Share Results

---

# Session

A Session is the core object.

A session contains:

* Players
* Teams
* Matches
* Scores
* Leaderboard
* Share Assets

All data belongs to the session.

---

# Features

## Authentication

* Email login
* Google login

---

## Session Management

Create Session

Fields:

* Name
* Date
* Location (optional)
* Sport

Current MVP:

* Padel only

---

## Player Management

Add players manually.

Import players from:

* CSV
* XLSX
* Formatted text

Example:

John
Mike
Sarah
David

---

## Team Generation

Generate random partners.

Initial mode:

* Fully random

Future modes:

* Avoid previous partners
* Balanced skill matching

---

## Match Management

Create matches.

Display:

* Team A
* Team B
* Match status

States:

* Upcoming
* Live
* Finished

---

## Score Entry

Fast mobile-first score recording.

Store:

* Team scores
* Winner
* Loser
* Differential

Example:

6 - 4

---

## Leaderboards

Metrics:

* Wins
* Losses
* Win Rate
* Games Won
* Games Lost
* Differential

Leaderboard exists only within the session.

---

## Share Results

Generate branded image cards.

Contains:

* Session name
* Date
* Top players
* Leaderboard

Export:

* PNG

Optimized for:

* WhatsApp
* Instagram Story
* Instagram Post

---

# Future Features

Not MVP.

* Multi-sport support
* Player profiles
* Communities
* Historical statistics
* Activity feed
* Social interactions
* Cross-session rankings
