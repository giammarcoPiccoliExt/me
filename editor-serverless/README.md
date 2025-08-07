# Serverless Documentation Editor App

This is a serverless, frontend-only documentation editor built with Vite (TypeScript). All file operations (list, read, write, upload) are performed via the GitHub API directly from the browser. No backend server is required.

## Features
- Markdown editing and preview
- File browsing (from a GitHub repository)
- Image upload (to GitHub repo)
- Config preview (with custom CSS)
- Diff and version control (using GitHub API)

## Setup
1. Clone this repository or copy the folder to your static hosting provider (GitHub Pages, Vercel, Netlify, etc.).
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the development server.

## GitHub API Usage
- You must provide a GitHub personal access token (with repo/content permissions) for file operations.
- The app uses the GitHub REST API to list, read, write, and upload files.
- See the code for details on how to configure your token and repository.

## Deployment
- Build the app with `npm run build`.
- Deploy the contents of the `dist` folder to your static hosting provider.

---

For more details, see `.github/copilot-instructions.md`.
