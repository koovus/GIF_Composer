# GIF Composer - Experimental GIF Creation Tool

## Overview
A web-based multi-video GIF creation tool designed for artists. Users upload video clips which are automatically sliced into time chunks displayed as a visual grid. Users click chunks to select/deselect them, arrange them in a composition strip, and export as a GIF.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui components
- **Backend**: Express.js (file upload handling only)
- **No database** — purely client-side state for video manipulation
- **GIF encoding**: Custom browser-side GIF encoder (`client/src/lib/gif-encoder.ts`)

## Key Concepts
- **Auto-chunking**: Videos are automatically sliced into configurable time segments (0.5s - 3s)
- **Visual sampler**: Chunks displayed as a thumbnail grid; click to select/deselect
- **Composition strip**: Bottom strip shows selected chunks in order, supports drag reorder
- **Export**: Client-side GIF encoding from selected chunks

## File Structure
```
shared/schema.ts          - VideoFile and Chunk types
server/routes.ts           - Upload endpoint, video serving with range support
client/src/pages/workspace.tsx    - Main workspace page with all state management
client/src/components/
  video-upload.tsx         - Drag-and-drop upload zone
  chunk-grid.tsx           - Grid of auto-generated chunk cards with thumbnails
  composition-strip.tsx    - Bottom strip showing selected chunks
client/src/lib/
  gif-encoder.ts           - Browser-side GIF89a encoder with LZW compression
  queryClient.ts           - TanStack Query setup
```

## Design Tokens
- Primary: Coral #FF6B6B
- Secondary: Teal #4ECDC4
- Background: Dark navy #1A1A2E
- Accent: Light salmon #FFA07A
- Success: Mint #95E1D3
- Fonts: Inter (sans), JetBrains Mono (mono)

## API Endpoints
- `POST /api/upload` — Upload video files (multer, max 200MB, up to 20 files)
- `GET /api/videos/:filename` — Serve video with range request support
- `DELETE /api/videos/:id` — Remove uploaded video file

## User Flow
1. Upload video clips (drag & drop or click)
2. Videos auto-chunk into configurable segments
3. Click chunks to toggle selection
4. Use Random/Shuffle/Select All controls
5. Selected chunks appear in composition strip at bottom
6. Drag to reorder in composition strip
7. Click Export GIF to download
