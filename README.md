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
- [x] King promotion when pieces reach opposite end (recently fixed)
- [x] **Flying King Mechanics** - Kings can move multiple squares diagonally
- [x] **Long-Distance King Captures** - Kings can capture at any distance along diagonals
- [x] **Strategic King Landing** - Kings can land anywhere beyond captured pieces
- [x] **Multi-Capture Sequences** - Kings can make consecutive captures in one turn
- [x] Turn-based gameplay
- [x] Proper checkers turn logic with consecutive jump handling
- [x] **Win Condition Detection** - Game automatically detects wins and losses

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

## 👑 Flying King Mechanics Feature

### International Checkers Rules

This game now implements **authentic flying king mechanics** following international checkers standards, transforming kings into powerful strategic pieces.

### King Abilities

- **🚁 Multi-Square Flight**: Kings can move any number of squares diagonally in all directions
- **🎯 Long-Distance Captures**: Kings can capture opponent pieces at any distance along diagonal paths
- **📍 Strategic Landing**: Kings can land anywhere beyond captured pieces (not just immediately after)
- **⚡ Multi-Capture Sequences**: Kings can make consecutive captures in one turn until no more captures are available

### User Experience

**Enhanced Visual Feedback**: Kings show multiple movement options and capture landing positions, giving players strategic choices for positioning and multi-capture combinations.

**Strategic Gameplay**: Flying kings create deep tactical opportunities with their ability to control entire board diagonals and execute complex capture sequences.

### Example King Power

```
Before: King moves 1 square like regular pieces
After:  King flies across board, captures multiple pieces strategically

K . . b . . . .    →    . . . . . . . K
. . . . . . . .          . . . . . . . .
. . . . . b . .          . . . . . . . .
. . . . . . . .          . . . . . . . .

King captured 2 pieces and landed strategically!
```

### Technical Implementation

- **Enhanced Movement Validation**: `isValidKingMove()` validates paths at any distance
- **Capture Detection**: `findKingCaptures()` scans entire diagonals for opportunities
- **Multi-Capture Logic**: `hasAdditionalKingCaptures()` enables consecutive captures
- **Strategic Positioning**: Kings can choose optimal landing positions after captures

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
- ✅ **Flying king mechanics** with multi-square diagonal movement
- ✅ **Long-distance king captures** and strategic positioning
- ✅ **Multi-capture sequences** for consecutive king captures
- ✅ **Win condition detection** and game end logic

### In Progress

- 🔄 Real-time multiplayer synchronization
- 🔄 "Do when data changes" Bubble workflow

### Planned

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

## 🔧 Recent Updates

### Flying King Implementation (December 2024)

**Major Feature**: Implemented authentic international checkers flying king mechanics to transform game strategy and follow proper checkers rules.

**Features Added**:

- ✅ **Multi-Square Diagonal Movement**: Kings can now fly any number of squares diagonally in all directions
- ✅ **Long-Distance Captures**: Kings can capture opponent pieces at any distance along diagonal paths
- ✅ **Strategic Landing Positions**: Kings can land anywhere beyond captured pieces (not just immediately after)
- ✅ **Multi-Capture Sequences**: Kings can make consecutive captures in a single turn until no more captures are available
- ✅ **Enhanced Move Validation**: Comprehensive path checking and capture validation for flying movements
- ✅ **Win Condition Detection**: Automatic game end detection when players have no pieces or valid moves

**Technical Implementation**:

- 🔧 **Enhanced `highlightPossibleMoves()`**: Shows all possible king flight paths and capture landing options
- 🔧 **New `findKingCaptures()`**: Scans entire diagonals for capture opportunities at any distance
- 🔧 **Updated `isValidMove()`**: Validates flying king moves with proper path checking
- 🔧 **Fixed `makeMove()`**: Kings can now land strategically anywhere beyond captured pieces
- 🔧 **Added `hasAdditionalKingCaptures()`**: Enables multi-capture sequences for flying kings
- 🔧 **Enhanced `getNextPlayer()`**: Properly handles turn continuation for king multi-captures

**Strategic Impact**:

- 🎯 **Powerful Kings**: Flying kings are now formidable pieces that can control entire board diagonals
- 🎯 **Strategic Depth**: Players can make complex multi-capture combinations and strategic positioning moves
- 🎯 **Authentic Rules**: Game now follows international checkers flying king rules for competitive play
- 🎯 **Enhanced Gameplay**: Kings provide the strategic superiority they should have in traditional checkers

**Result**:

- Kings can fly multiple squares diagonally in any direction (♔ → ♔ → ♔ → ♔)
- Long-distance captures with flexible landing positions create strategic opportunities
- Multi-capture sequences enable powerful combination moves
- Game automatically detects win/loss conditions for proper game endings
- Enhanced player experience with authentic international checkers mechanics

### King Promotion Bug Fix (December 2024)

**Issue**: King promotion logic had critical JavaScript errors that prevented pieces from being promoted to kings when reaching the opposite end of the board.

**Problems Fixed**:

- ❌ **JavaScript Error**: Attempting to reassign `const` variable caused runtime errors
- ❌ **Parameter Modification**: Direct reassignment of function parameters created unpredictable behavior
- ❌ **Type Conversion Issues**: Inconsistent handling of numeric values in promotion logic
- ❌ **Visual Updates**: Promoted pieces didn't display the golden crown (♔) symbol

**Solution**:

- ✅ **Safe Variable Handling**: Created `originalPieceType` variable to store piece data safely
- ✅ **Parameter Protection**: Used `targetRow` and `targetCol` variables instead of modifying parameters
- ✅ **Proper Type Conversion**: Explicit number conversion at the right points in the logic
- ✅ **Immediate Visual Feedback**: `createBoard()` now properly updates display after promotion

**Result**:

- Red pieces reaching row 0 now properly become red kings (piece type 1 → 3)
- Black pieces reaching row 7 now properly become black kings (piece type 2 → 4)
- Kings immediately display the golden crown (♔) symbol
- Kings can move in all diagonal directions (forward and backward)

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
**Latest Update**: Flying King Implementation - authentic international checkers with multi-square movement, long-distance captures, and strategic positioning
