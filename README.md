# Checkers Game - Bubble + Vercel Integration

A multiplayer checkers game with game logic hosted on Vercel and integrated with Bubble for database management and user interface.

## 🎯 Project Overview

This project demonstrates a hybrid architecture where:

- **Game UI and Logic**: HTML/CSS/JavaScript hosted on Vercel
- **Database & Backend**: Bubble handles user management, game state, and workflows
- **Communication**: postMessage API for seamless data exchange

## 🏗️ Architecture

```
┌─────────────────┐    postMessage    ┌──────────────────┐
│   Bubble App    │ ←──────────────→  │   Vercel Game    │
│                 │                   │   (iframe)       │
│ • User Auth     │    API Calls      │                  │
│ • Database      │ ←──────────────→  │ • Game Logic     │
│ • Workflows     │                   │ • UI/UX          │
│ • Real-time     │                   │ • Move Validation│
└─────────────────┘                   └──────────────────┘
```

## 🚀 Live Demo

- **Game URL**: https://checkers-game-two.vercel.app
- **Bubble Integration**: Embedded via iframe in Bubble app
- **Deployment**: Pure JavaScript - ready for immediate Git deployment

## ✅ Completed Features

### Game Mechanics

- [x] 8x8 checkers board with proper alternating colors
- [x] Red and black piece placement
- [x] Piece movement with direction restrictions
- [x] Move highlighting (golden squares for valid moves)
- [x] Must-capture piece highlighting (pulsing red glow for mandatory captures)
- [x] King promotion when pieces reach opposite end
- [x] Turn-based gameplay
- [x] Proper checkers turn logic with consecutive jump handling

### Visual Design

- [x] Beautiful teal gradient background
- [x] Wooden texture for light squares
- [x] Modern glass-effect styling
- [x] Responsive design (mobile and desktop)
- [x] Player information panel with game stats
- [x] Move history logging
- [x] Board rotation for optimal player perspective (Player 2 sees their pieces at bottom)
- [x] Animated visual indicators for pieces that must capture (pulsing red glow effect)

### Backend Integration

- [x] Bubble database integration
- [x] API endpoint for saving moves (`save_move`)
- [x] Board state synchronization
- [x] Environment variable management
- [x] Secure API communication (no exposed keys)

### Multiplayer Foundation

- [x] PostMessage communication (Bubble ↔ iframe)
- [x] Game state loading from database
- [x] Turn management system
- [x] Player identification

## 🗃️ Database Structure

### Game Data Type (Bubble)

```
Game {
  players: List of Users
  current_player: User
  board_state: text (JSON string)
  status: text ("active", "finished", "waiting")
  winner: User (optional)
  created_date: date
}
```

### Board State Format

```json
[
  [0, 2, 0, 2, 0, 2, 0, 2], // Row 0: Black pieces
  [2, 0, 2, 0, 2, 0, 2, 0], // Row 1: Black pieces
  [0, 2, 0, 2, 0, 2, 0, 2], // Row 2: Black pieces
  [0, 0, 0, 0, 0, 0, 0, 0], // Row 3: Empty
  [0, 0, 0, 0, 0, 0, 0, 0], // Row 4: Empty
  [1, 0, 1, 0, 1, 0, 1, 0], // Row 5: Red pieces
  [0, 1, 0, 1, 0, 1, 0, 1], // Row 6: Red pieces
  [1, 0, 1, 0, 1, 0, 1, 0] // Row 7: Red pieces
]
```

**Piece Values:**

- `0` = Empty square
- `1` = Red piece
- `2` = Black piece
- `3` = Red king
- `4` = Black king

## 🔄 Data Flow

### Game Initialization

1. User loads Bubble page
2. Bubble fetches user's current game from database
3. Bubble sends game state to iframe via postMessage:
   ```js
   {
     type: 'set-board-state',
     board: [[0,1,0,...], ...],
     currentPlayerId: "user_id",
     myUserId: "current_user_id",
     gameId: "game_id",
     apiEndpoint: "https://checkers-arena.bubbleapps.io/version-test/api/1.1/wf/save_move"
   }
   ```

### Move Processing

1. Player clicks piece → highlights valid moves
2. Player clicks target square → move executed locally
3. Game sends move data to Bubble API:
   ```js
   {
     game_id: "game_id",
     board_state: "[[0,1,0,...],...]",
     current_player_id: "next_player_id",
     from_row: 5,
     from_col: 0,
     to_row: 4,
     to_col: 1
   }
   ```
4. Bubble updates database
5. Real-time sync updates opponent's game

## 🎯 Must-Capture Highlighting Feature

### User Experience

When mandatory captures are available, the game automatically highlights pieces that must capture opponents with a **pulsing red glow animation**. This feature eliminates confusion and ensures players never miss mandatory capture opportunities.

### How It Works

- **Automatic Detection**: Game scans all player pieces to identify capture opportunities
- **Visual Indicator**: Pieces that can capture pulse with a red glow and subtle scaling animation
- **Turn-Based**: Only highlights pieces for the current player on their turn
- **Smart Clearing**: Highlights automatically clear when pieces are selected and reappear when deselected
- **Dynamic Updates**: Refreshes highlighting when turns change or after moves are made

### Technical Details

- **CSS Animation**: Smooth `pulse-capture` keyframe animation with red shadow effects
- **JavaScript Logic**: `highlightMustCapturePieces()` and `clearMustCaptureHighlights()` methods
- **Performance**: Lightweight implementation with minimal DOM manipulation
- **Integration**: Seamlessly integrated into existing board creation and turn management

## 🛠️ Technical Implementation

### Frontend (Vercel)

- **Framework**: Vanilla HTML/CSS/JavaScript (No server-side dependencies)
- **Logic**: Pure JavaScript - all game mechanics implemented client-side
- **Styling**: CSS Grid, Gradients, CSS Variables
- **Communication**: postMessage API, Fetch API
- **Deployment**: Auto-deploy from GitHub (no build process required)

### Backend (Bubble)

- **Database**: Bubble's built-in database
- **API**: RESTful workflows
- **Authentication**: Bubble's user system
- **Real-time**: "Do when data changes" workflows

### Security

- ✅ No API keys exposed in client code
- ✅ Public API endpoints with server-side validation
- ✅ User authorization checked in Bubble workflows
- ✅ Environment variables properly managed

## 🚦 Current Status

### Working

- ✅ Single-player game mechanics
- ✅ Bubble database integration
- ✅ Move saving to database
- ✅ Turn logic with consecutive jumps
- ✅ Visual feedback and UI polish
- ✅ Board rotation for Player 2 perspective
- ✅ Jump/capture mechanics with forced capture rule
- ✅ Mandatory jump enforcement

### In Progress

- 🔄 Real-time multiplayer synchronization
- 🔄 "Do when data changes" Bubble workflow

### Planned

- ⏳ Win condition detection
- ⏳ Game lobby system
- ⏳ Player matchmaking

## 🎮 How to Test

### Single Player

1. Open https://checkers-game-two.vercel.app
2. Board loads empty (waiting for Bubble data)

### With Bubble Integration

1. Embed iframe in Bubble page
2. Send board state via postMessage
3. Test moves and database saving

### Development & Deployment

**JavaScript-Only Architecture**: This game uses pure client-side JavaScript with no server-side dependencies, build tools, or compilation steps.

#### Git-Based Deployment

1. Clone repository: `git clone https://github.com/qdomaintech/checkers-game.git`
2. Make changes to `game.js`, `index.html`, or `style.css`
3. Commit and push to GitHub
4. Vercel automatically deploys from Git (no build process)

#### Local Testing (Optional)

- Simply open `index.html` directly in browser
- Game runs standalone (no Bubble integration)
- No localhost server required

## 📁 Project Structure

```
checkers-game/
├── index.html          # Main game page
├── style.css           # Game styling and layout
├── game.js             # Pure JavaScript game logic (no dependencies)
├── .gitignore          # Ignore environment files
└── README.md           # This documentation
```

**Note**: All game logic is implemented in vanilla JavaScript with no external libraries, frameworks, or build tools required.

## 🔧 Configuration

### Bubble Workflow Parameters

- `game_id` (text): Unique game identifier
- `board_state` (text): JSON string of board array
- `current_player_id` (text): Next player to move

### PostMessage Interface

```js
// From Bubble to Game
{
  type: 'set-board-state',
  board: Array<Array<number>>,
  currentPlayerId: string,
  myUserId: string,
  gameId: string,
  apiEndpoint: string
}

// From Game to Bubble
{
  type: 'checkers-move',
  move: {
    from: {row: number, col: number},
    to: {row: number, col: number},
    player: string,
    gameState: Array<Array<number>>
  }
}
```

## 🤝 Contributing

This is a demonstration project showing Bubble + external service integration. Key learnings:

1. **Hybrid Architecture Works**: External game logic + Bubble database
2. **PostMessage is Powerful**: Seamless iframe communication
3. **Security**: Public APIs with server-side validation
4. **Real-time**: Bubble workflows enable live multiplayer

## 📞 Support

For questions about the architecture or implementation, refer to the commit history which documents each development step.

---

**Last Updated**: December 2024  
**Status**: Active Development  
**Demo**: https://checkers-game-two.vercel.app  
**Latest Feature**: Must-capture piece highlighting with pulsing red glow animation
