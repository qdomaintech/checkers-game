import { PIECE_TYPES, PLAYER_COLORS, BOARD_SIZE } from "../utils/Constants.js";

export class MoveValidator {
  constructor(gameState) {
    this.gameState = gameState;
  }

  /* Helper to ensure coordinates are on the board */
  isValidPosition(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  /* Returns true if the piece at (row,col) belongs to the given player */
  isPlayersPiece(pieceType, player) {
    const isRed =
      pieceType === PIECE_TYPES.RED || pieceType === PIECE_TYPES.RED_KING;
    return (
      (player === PLAYER_COLORS.RED && isRed) ||
      (player === PLAYER_COLORS.BLACK && !isRed)
    );
  }

  /* Determine if any capture is currently available for the player */
  hasAvailableCaptures(player) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = this.gameState.board[r][c];
        if (piece === PIECE_TYPES.EMPTY) continue;
        if (!this.isPlayersPiece(piece, player)) continue;
        if (this.pieceHasCaptures(r, c, piece)) return true;
      }
    }
    return false;
  }

  /* Check if a specific piece has any capture moves */
  pieceHasCaptures(row, col, pieceType) {
    const isKing = this.gameState.isKing(pieceType);
    const isRed =
      pieceType === PIECE_TYPES.RED || pieceType === PIECE_TYPES.RED_KING;

    // Directions a non-king can capture (2-square jumps)
    const manDirs = isRed
      ? [
          [-2, -2],
          [-2, 2],
        ]
      : [
          [2, -2],
          [2, 2],
        ];
    const kingDirs = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];

    if (!isKing) {
      for (const [dRow, dCol] of manDirs) {
        const landingRow = row + dRow;
        const landingCol = col + dCol;
        const midRow = row + dRow / 2;
        const midCol = col + dCol / 2;
        if (
          this.isValidPosition(landingRow, landingCol) &&
          this.gameState.board[landingRow][landingCol] === PIECE_TYPES.EMPTY &&
          this.gameState.board[midRow][midCol] !== PIECE_TYPES.EMPTY &&
          this.gameState.isOpponentPiece(
            this.gameState.board[midRow][midCol],
            this.gameState.currentPlayer
          )
        ) {
          return true;
        }
      }
      return false;
    }

    // King capture logic – can "fly" any distance but must jump exactly one opponent
    for (const [rDir, cDir] of kingDirs) {
      let foundOpponent = false;
      for (let dist = 1; dist < BOARD_SIZE; dist++) {
        const checkRow = row + rDir * dist;
        const checkCol = col + cDir * dist;
        if (!this.isValidPosition(checkRow, checkCol)) break;
        const pieceAt = this.gameState.board[checkRow][checkCol];
        if (pieceAt === PIECE_TYPES.EMPTY) {
          if (foundOpponent) return true; // empty landing square beyond opponent
          continue;
        }
        if (
          this.gameState.isOpponentPiece(pieceAt, this.gameState.currentPlayer)
        ) {
          if (foundOpponent) break; // more than one opponent – not allowed
          foundOpponent = true;
          continue;
        }
        // Own piece blocks path
        break;
      }
    }
    return false;
  }

  /* Validate that a proposed move is legal */
  isValidMove(fromRow, fromCol, toRow, toCol) {
    if (
      !this.isValidPosition(fromRow, fromCol) ||
      !this.isValidPosition(toRow, toCol)
    )
      return false;
    if (this.gameState.board[toRow][toCol] !== PIECE_TYPES.EMPTY) return false;

    const pieceType = this.gameState.board[fromRow][fromCol];
    if (pieceType === PIECE_TYPES.EMPTY) return false;

    const isKing = this.gameState.isKing(pieceType);
    const isRed =
      pieceType === PIECE_TYPES.RED || pieceType === PIECE_TYPES.RED_KING;

    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false; // must be diagonal

    if (!isKing) {
      // Men – simple rules
      if (!(Math.abs(rowDiff) === 1 || Math.abs(rowDiff) === 2)) return false;
      if (isRed && rowDiff >= 0) return false; // red moves up (row decreases)
      if (!isRed && rowDiff <= 0) return false; // black moves down

      // RESTORE: Force capture rule - if captures are available, you must capture
      const capturesAvailable = this.hasAvailableCaptures(this.gameState.currentPlayer);
      if (capturesAvailable && Math.abs(rowDiff) === 1) return false; // must capture

      if (Math.abs(rowDiff) === 2) {
        const midRow = (fromRow + toRow) / 2;
        const midCol = (fromCol + toCol) / 2;
        const midPiece = this.gameState.board[midRow][midCol];
        if (
          midPiece === PIECE_TYPES.EMPTY ||
          !this.gameState.isOpponentPiece(
            midPiece,
            this.gameState.currentPlayer
          )
        )
          return false;
      }
      return true;
    }

    // King logic
    return this.isValidKingMove(fromRow, fromCol, toRow, toCol);
  }

  /* King move validation */
  isValidKingMove(fromRow, fromCol, toRow, toCol) {
    const rowDir = Math.sign(toRow - fromRow);
    const colDir = Math.sign(toCol - fromCol);
    const distance = Math.abs(toRow - fromRow);
    let opponentCount = 0;

    for (let step = 1; step < distance; step++) {
      const checkRow = fromRow + rowDir * step;
      const checkCol = fromCol + colDir * step;
      const pieceAt = this.gameState.board[checkRow][checkCol];
      if (pieceAt === PIECE_TYPES.EMPTY) continue;
      if (
        this.gameState.isOpponentPiece(pieceAt, this.gameState.currentPlayer)
      ) {
        opponentCount += 1;
        if (opponentCount > 1) return false; // cannot jump more than one in single move
      } else {
        return false; // own piece blocks
      }
    }

    // RESTORE: Force capture rule for kings - must capture when captures available
    const capturesAvailable = this.hasAvailableCaptures(this.gameState.currentPlayer);
    if (capturesAvailable && opponentCount === 0) return false; // must capture when any capture available
    
    if (opponentCount > 0 && opponentCount !== 1) return false;

    return true;
  }

  /* Provide list of possible moves for UI/parent communication */
  getPossibleMoves(row, col) {
    const moves = [];
    const pieceType = this.gameState.board[row][col];
    if (pieceType === PIECE_TYPES.EMPTY) return moves;

    const isKing = this.gameState.isKing(pieceType);
    const isRed =
      pieceType === PIECE_TYPES.RED || pieceType === PIECE_TYPES.RED_KING;

    // Check if any captures are available for the current player
    const capturesAvailable = this.hasAvailableCaptures(this.gameState.currentPlayer);

    const dirMan = isRed
      ? [
          [-1, -1],
          [-1, 1],
        ]
      : [
          [1, -1],
          [1, 1],
        ];
    const dirKing = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];

    const addMove = (r, c, type) => moves.push({ row: r, col: c, type });

    if (!isKing) {
      // normal piece - respect forced captures
      for (const [dr, dc] of dirMan) {
        const newRow = row + dr;
        const newCol = col + dc;
        // Only allow normal moves if no captures are available anywhere
        if (
          !capturesAvailable &&
          this.isValidPosition(newRow, newCol) &&
          this.gameState.board[newRow][newCol] === PIECE_TYPES.EMPTY
        ) {
          addMove(newRow, newCol, "move");
        }

        // capture moves
        const jumpRow = row + dr * 2;
        const jumpCol = col + dc * 2;
        const midRow = row + dr;
        const midCol = col + dc;
        if (
          this.isValidPosition(jumpRow, jumpCol) &&
          this.gameState.board[jumpRow][jumpCol] === PIECE_TYPES.EMPTY &&
          this.gameState.board[midRow][midCol] !== PIECE_TYPES.EMPTY &&
          this.gameState.isOpponentPiece(
            this.gameState.board[midRow][midCol],
            this.gameState.currentPlayer
          )
        ) {
          addMove(jumpRow, jumpCol, "capture");
        }
      }
    } else {
      // king moves - respect forced captures
      for (const [dr, dc] of dirKing) {
        let foundOpponent = false;
        for (let dist = 1; dist < BOARD_SIZE; dist++) {
          const newRow = row + dr * dist;
          const newCol = col + dc * dist;
          if (!this.isValidPosition(newRow, newCol)) break;
          const pieceAt = this.gameState.board[newRow][newCol];
          if (pieceAt === PIECE_TYPES.EMPTY) {
            // Only allow normal king moves if no captures are available anywhere
            if (!foundOpponent && !capturesAvailable) {
              addMove(newRow, newCol, "move");
            }
            if (foundOpponent) {
              addMove(newRow, newCol, "capture");
            }
            continue;
          }

          if (
            this.gameState.isOpponentPiece(
              pieceAt,
              this.gameState.currentPlayer
            )
          ) {
            if (foundOpponent) break; // only one allowed
            foundOpponent = true;
            continue;
          }
          // own piece – stop scanning further in this direction
          break;
        }
      }
    }

    return moves;
  }
}
