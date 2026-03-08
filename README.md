# Guildscape

<p align="center">
  <strong>Your code builds your world.</strong>
</p>

<p align="center">
  Guildscape transforms your GitHub activity into a living fantasy kingdom. Every commit, PR, and closed issue earns you coins and energy to grow your realm.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#architecture">Architecture</a>
</p>

---

## Features

- **GitHub-Powered Progress** - Connect your GitHub account and watch your coding activity translate into in-game rewards
- **Personal Isometric Kingdom** - Each developer gets their own unique fantasy world rendered in isometric view
- **Social Collaboration** - Invite friends to join your world with their own plots
- **Milestone Landmarks** - Unlock the Park, Library, and Monument as your realm grows
- **Anti-Spam Economy** - Only meaningful contributions count. Quality over quantity.
- **Admin Panel** - World owners can tune scoring constants and manage their realm

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) with App Router
- **Authentication**: [Supabase Auth](https://supabase.com/auth) with GitHub OAuth
- **Database**: [Supabase PostgreSQL](https://supabase.com/database)
- **Styling**: CSS Modules with medieval fantasy theme
- **Fonts**: Cinzel & MedievalSharp (Google Fonts)
- **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- GitHub OAuth app (configured in Supabase Dashboard)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Humble-Librarian/Guildscape.git
   cd Guildscape
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Set up the database**
   
   Run the SQL migrations in your Supabase SQL editor (schema available upon request):
   - Create users, worlds, memberships tables
   - Set up RLS policies
   - Configure RPC functions

5. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## Architecture

### Project Structure

```
Guildscape/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/sync/     # User authentication sync
│   │   ├── worlds/mine/   # World data retrieval
│   │   ├── admin/         # Admin panel APIs
│   │   └── ...
│   ├── dashboard/         # Main dashboard
│   ├── auth/              # Authentication pages
│   └── page.js           # Landing page
├── components/            # React components
│   ├── map/              # Isometric canvas
│   ├── economy/          # Shop & invite modals
│   └── ui/               # UI components
├── lib/                   # Utilities
│   ├── auth.js           # Auth helpers
│   ├── supabase.js       # Supabase clients
│   └── constants.js      # Game constants
├── styles/               # Global styles
└── public/               # Static assets
```

### Key Concepts

- **World**: A personal kingdom tied to a GitHub user
- **Membership**: Links users to worlds with roles (owner/member)
- **Coins**: Earned through GitHub activity, spent on upgrades
- **Energy**: Used for world interactions
- **Milestones**: Group achievements that unlock landmarks

### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/sync` | POST | Syncs GitHub user with database |
| `/api/worlds/mine` | GET | Retrieves user's world data |
| `/api/ingestion/run` | POST | Processes GitHub activity |
| `/api/admin/constants` | GET/POST | Manage scoring constants |

## Development

### Database Schema

The application uses a PostgreSQL database with the following core tables:
- `users` - GitHub user profiles
- `worlds` - Personal kingdoms
- `memberships` - User-world relationships
- `activities` - GitHub activity log
- `world_state` - World configuration

*Note: Full schema available upon request for security reasons.*

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes (API routes) |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

---

<p align="center">
  Made with ⚔️ and ☕
</p>
