# PlanThing

PlanThing is a collaborative Kanban-style task manager built with React, Vite, TypeScript, Tailwind CSS, and Convex.

It lets teams create boards, organize work into columns, manage tasks with labels, due dates, priorities, and assignees, and collaborate in real time without manual refreshes.

## What the project does

- Email/password authentication with Convex Auth
- Email verification with OTP
- Board creation and board sharing by invite
- Owner and member access control on shared boards
- Drag-and-drop task movement across columns
- Task details with description, labels, due dates, priority, completion state, and assignee
- Owner-controlled task assignment permissions
- Notifications for board invites and task assignments
- Search for boards from the main dashboard

## Permission model

- Board owners can update board settings, invite members, and delete boards
- Only board owners can assign tasks
- Members can only be assigned tasks if the owner enables `Allow assign` for that specific member
- Users who are allowed to receive assignments cannot grant that permission to anyone else
- Task assignment notifications are sent only when one user assigns a task to a different user

## Tech stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Convex
- Convex Auth
- DnD Kit
- pnpm

## Local development

Install dependencies:

```bash
pnpm install
```

Start the frontend:

```bash
pnpm dev
```

Build the app:

```bash
pnpm build
```

Lint the codebase:

```bash
pnpm lint
```

Push Convex functions and schema:

```bash
pnpm exec convex dev --once
```

## Environment notes

This project uses Convex for backend state and auth. To run the current auth flow, the Convex deployment needs:

- `SITE_URL`
- `JWT_PRIVATE_KEY`
- `JWKS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_FROM`
- `SMTP_USER`
- `SMTP_PASS`
- optional `SMTP_SECURE`

The frontend local env typically includes:

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`

## Project structure

- [src](C:\Users\Guette\Desktop\BLOCKC\src): React app, pages, layout, auth UI, board UI, notifications
- [convex](C:\Users\Guette\Desktop\BLOCKC\convex): backend schema, queries, mutations, auth, invites, notifications, SMTP action
- [public](C:\Users\Guette\Desktop\BLOCKC\public): static assets
