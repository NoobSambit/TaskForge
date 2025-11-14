# Documentation Index

This directory contains comprehensive documentation for the application's features and architecture.

## Available Documentation

### Core Features

- **[Gamification System](./GAMIFICATION.md)** - Experience points, levels, achievements, streaks, and themes
  - User model extensions with XP and levels
  - Achievement system with 30+ predefined achievements
  - Streak tracking and activity logging
  - Migration and seeding scripts
  - TypeScript type definitions

### Offline & Sync

- **[Offline-First Architecture & QA Guide](./offline-testing.md)** - Comprehensive guide to the offline-first architecture
  - IndexedDB storage with fallbacks
  - Sync queue with conflict resolution
  - Network status monitoring
  - Service worker implementation
  - Testing procedures

### UI Components

- **[Smart Task Input](./SMART_TASK_INPUT.md)** - Intelligent task creation interface
  - AI-powered task parsing (when available)
  - Smart defaults and validation
  - User experience considerations

- **[Achievements UI](./ACHIEVEMENTS_UI.md)** - Achievement display and notification system
  - Toast notifications with rarity styling
  - Achievement badges with locked/unlocked states
  - Grid layout with filtering and real-time updates
  - Accessibility and reduced-motion support

## Getting Started

### Initial Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your MongoDB URI and other settings
   ```

3. **Run migrations:**
   ```bash
   # Dry run to preview changes
   npm run migrate:gamification:dry-run
   
   # Execute migration
   npm run migrate:gamification
   ```

4. **Seed initial data:**
   ```bash
   # Dry run to preview achievements
   npm run seed:achievements:dry-run
   
   # Execute seeding
   npm run seed:achievements
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

### Development Workflow

- **Type checking:** `npm run typecheck`
- **Run tests:** `npm run test`
- **Build for production:** `npm run build`
- **Start production server:** `npm run start`

## Environment Variables

Required environment variables:

- `MONGODB_URI` - MongoDB connection string (required for database operations)

See `.env.local.example` for a complete list of available environment variables.

## Contributing

When adding new features:

1. Update or create appropriate documentation in this directory
2. Add entries to this README if creating new documentation files
3. Include migration scripts for schema changes
4. Update TypeScript types in the `types/` directory
5. Write tests for new functionality

## Architecture Overview

### Tech Stack

- **Framework:** Next.js 15 (React 19)
- **Database:** MongoDB with Mongoose ODM
- **TypeScript:** Full type safety across the application
- **Styling:** Tailwind CSS
- **Testing:** Vitest
- **Auth:** NextAuth.js v5

### Project Structure

```
├── app/              # Next.js app directory (routes and pages)
├── components/       # React components
├── docs/            # Documentation (you are here)
├── hooks/           # Custom React hooks
├── lib/             # Utility libraries and helpers
├── models/          # Mongoose database models
├── public/          # Static assets and service worker
├── scripts/         # Database migrations and utility scripts
├── types/           # TypeScript type definitions
└── workers/         # Web Workers for background processing
```

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
