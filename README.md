# Spotify Web Clone

A full-featured Spotify Web Player clone built with vanilla JavaScript, HTML, CSS (TailwindCSS), and Vite.

## 🚀 Features

- **Authentication**: Register, Login, and Profile management using real endpoints.
- **Dynamic Content**: Fetching and displaying Trending Tracks, Artists, Albums, and Playlists.
- **Audio Player**: Full custom audio player with Play/Pause, Next/Prev, Shuffle, Repeat, Volume Control, and Progress bar.
- **User Library Management**:
  - Like/Unlike songs
  - Create and manage custom Playlists
  - Create Folders and organize playlists inside them
- **Local Track Uploads**: 
  - Upload your own MP3 tracks directly in the browser!
  - IndexedDB storage integration for keeping large audio/image blob files completely client-side.
  - Full account isolation: local tracks and folders are securely tied to your specific user profile.
- **Responsive UI**: Pixel-perfect Spotify UI clone, fully responsive across all screen sizes.

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Bundler**: [Vite](https://vitejs.dev/)
- **Storage**: `localStorage` (metadata & auth) & `IndexedDB` (large file blobs)

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-github-repo-url>
   cd module2
   ```

2. **Install dependencies:**
   Make sure you have [Node.js](https://nodejs.org/) installed, then run:
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` file in the root directory (this file is ignored by Git to keep your data safe) and configure your API URL:
   ```env
   VITE_API_BASE_URL=https://api-f8.fullstack.edu.vn
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to the local URL provided by Vite (usually `http://localhost:5173`).

## ☁️ Deployment Guide

This project is highly optimized for deployment on **Vercel** because it uses Vite.

### Deploying to Vercel (Recommended)
1. Push your code to your GitHub repository.
2. Go to [Vercel](https://vercel.com/) and log in with your GitHub account.
3. Click **Add New** -> **Project**.
4. Import your repository.
5. Vercel will automatically detect that it's a Vite project and configure the build settings (`npm run build` and `dist` folder).
6. Expand the **Environment Variables** section and add:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://api-f8.fullstack.edu.vn`
7. Click **Deploy**! 🚀

> **Note on GitHub Pages:** You can also deploy to GitHub Pages, but because this is a Vite app routing might require extra setup (like configuring a `base` URL in `vite.config.js`). Vercel handles all of this automatically and is much faster for this specific stack.

## 👤 Author

Developed during the F8 Fullstack course.
