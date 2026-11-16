# Mela Motion Films

Wedding post-production site and studio dashboard for Mela Motion Films. The public site and the studio dashboard run as one local app.

The app folder is `lovable-a7cf46a4`. `start.bat` sits in the folder above it and starts this app for you.

## What you need

- **Node.js 20.19 or newer**, or **Node.js 22 LTS**. Older 20.x releases will not start the dev server.
- **npm**, which comes with Node.js.

Check both from a terminal:

```sh
node -v
npm -v
```

Install Node from [https://nodejs.org](https://nodejs.org) if `node` is missing or the version is too old. After installing, close the terminal and open a new one so the new version is on your PATH.

## First-time setup

Open a terminal in `lovable-a7cf46a4` (the folder that contains `package.json`).

### 1. Install dependencies

```sh
npm install
```

The first install can take a few minutes. It creates `node_modules`. You only need to run it again when `package.json` or `package-lock.json` changes.

If install fails on a peer-dependency conflict, run:

```sh
npm install --legacy-peer-deps
```

That is the same command `start.bat` uses on a first run.

### 2. Create `.env`

Copy this into a file named `.env` in `lovable-a7cf46a4`, next to `package.json`. The app reads it on startup. It is not committed to git.

```env
ADMIN_EMAIL="you@example.com"
ADMIN_PASSWORD="choose-a-password"
AUTH_SECRET="replace-with-a-random-string-at-least-32-characters"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_EMAIL="studio@gmail.com"
SMTP_PASSWORD="google-app-password"
ENQUIRY_RECEIVER_EMAIL="inbox@example.com"
```

| Variable | Required to start | What it does |
| --- | --- | --- |
| `ADMIN_EMAIL` | Yes, for studio sign-in | Email typed on `/admin` |
| `ADMIN_PASSWORD` | Yes, for studio sign-in | Password typed on `/admin`. Stays on the server and is never sent to the browser |
| `AUTH_SECRET` | Yes, for studio sign-in | Seals the sign-in cookie. Must be **at least 32 characters**. A shorter value makes sign-in report that the studio is unavailable |
| `SMTP_HOST` | No | Mail server. Defaults to `smtp.gmail.com` when omitted |
| `SMTP_PORT` | No | Mail port. Defaults to `587` when omitted or invalid |
| `SMTP_EMAIL` | Only to send enquiry email | Account that sends the message |
| `SMTP_PASSWORD` | Only to send enquiry email | For Gmail this must be a [Google app password](https://myaccount.google.com/apppasswords), not the normal account password |
| `ENQUIRY_RECEIVER_EMAIL` | Only to send enquiry email | Inbox that receives new enquiries |

The public site still loads if the SMTP values are empty. A visitor can submit the contact form and the enquiry is saved. The confirmation then says the email was not sent until `SMTP_EMAIL`, `SMTP_PASSWORD`, and `ENQUIRY_RECEIVER_EMAIL` are set.

Restart the dev server after you change `.env`.

## Start the project

### Windows shortcut

From the folder that contains `start.bat` (one level above `lovable-a7cf46a4`), double-click `start.bat`.

It checks Node, installs dependencies the first time `node_modules` is missing, opens http://localhost:8080/ in the browser, and runs the dev server. Leave that window open. Closing it, or pressing Ctrl+C in it, stops the server.

### From the terminal

In `lovable-a7cf46a4`:

```sh
npm run dev
```

Vite prints the local address when it is ready. Open:

**http://localhost:8080/**

The dev server uses port **8080** only (`strictPort`). If another program is already using 8080, the start fails. Stop that program, or close the previous `npm run dev` window, then start again.

`host` is enabled, so the same site is also reachable from other devices on your network at `http://<this-computer-ip>:8080/`.

Stop the server with **Ctrl+C** in the terminal that is running it.

## Pages

| URL | Who can open it |
| --- | --- |
| http://localhost:8080/ | Everyone. Home |
| http://localhost:8080/about | Everyone |
| http://localhost:8080/services | Everyone |
| http://localhost:8080/films | Everyone |
| http://localhost:8080/process | Everyone |
| http://localhost:8080/contact | Everyone. Enquiry form |
| http://localhost:8080/admin | Studio. Sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD` |

After a successful sign-in, the session cookie lasts 12 hours. Ten failed attempts from the same address lock sign-in for 15 minutes.

## Where content is stored

These folders are created when you save content. They are local to this machine and are not committed to git.

| Path | Contents |
| --- | --- |
| `data/studio.json` | Films, page copy, and studio links (contact email, Instagram, Upwork) |
| `data/enquiries.json` | Enquiry inbox |
| `data/private-uploads/` | Files attached to enquiries. Served only to a signed-in studio session at `/studio/files/:name` |
| `public/uploads/` | Published studio media shown on the public site |

Deleting `data/` clears films, page content, and the inbox. The site still starts; empty content is used until you save again from `/admin`.

## Other commands

Run these from `lovable-a7cf46a4`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local dev server at http://localhost:8080/ |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Format the project with Prettier |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Re-run tests when files change |

A production build is separate from day-to-day work. `npm run dev` is enough to view and edit the site locally.

## Built with

- TanStack Start
- React
- TypeScript
- Tailwind CSS
- Vite
