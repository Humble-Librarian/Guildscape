# 📊 GitHub Visualizer

A sleek, premium GitHub analytics dashboard built with **Next.js 14**, **Tailwind CSS v4**, and **Recharts**. Visualize your open-source contributions, repository language distribution, and commit history with a focus on security and performance.

## ✨ Features

- **🛡️ Secure Token Proxy**: Input your Personal Access Token (PAT) with confidence. It is never exposed client-side—all requests are proxied through server-side Next.js routes.
- **🔥 Contribution Heatmap**: Complete 365-day visualization utilizing both GitHub's REST and GraphQL APIs.
- **📈 Commit Insights**: Interactive area charts showing your commit activity across your top 6 repositories, filtered for your specific contributions.
- **🍩 Language Analytics**: Beautiful donut charts displaying your primary coding languages and total bytes written.
- **🚀 Ultra Fast**: Built with Next.js App Router for optimal performance and server-side rendering.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14 (App Router)](https://nextjs.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **API**: GitHub REST API & GraphQL API
- **Type Safety**: TypeScript

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Humble-Librarian/Guildscape.git
cd Guildscape
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
GITHUB_PAT=your_fallback_personal_access_token_here
```
> [!NOTE]
> This PAT is used as a fallback if the user doesn't provide one on the landing page. It helps avoid rate-limiting for basic searches.

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🛡️ Security & Privacy

This application prioritizes the security of your GitHub Personal Access Tokens.
- **Proxy Architecture**: Tokens provided in the UI are sent only to our `/api/github` routes.
- **No Persistence**: Your tokens are never stored or logged on our servers or your local machine.
- **Minimal Scope**: You can use a "Public Data Only" token with zero scopes to unlock the full 365-day contribution heatmap.

## 📜 License

[MIT](LICENSE)
