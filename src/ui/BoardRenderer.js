import {
  PIECE_TYPES,
  CSS_CLASSES,
  BOARD_SIZE,
  PLAYER_COLORS,
} from "../utils/Constants.js";
import { MoveValidator } from "../rules/MoveValidator.js";

// Utility function to convert (row, col) to square number (1-64)
function toSquareNumber(row, col) {
  return row * 8 + col + 1;
}

export class BoardRenderer {
  constructor(boardElement, gameState) {
    this.boardElement = boardElement;
    this.gameState = gameState;
  }

  createBoard() {
    this.boardElement.innerHTML = "";

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const square = this.createSquare(row, col);

        // Only render pieces if the board is loaded
        if (
          this.gameState.board &&
          this.gameState.board[row] &&
          this.gameState.board[row][col] !== PIECE_TYPES.EMPTY
        ) {
          const piece = this.createPiece(
            this.gameState.board[row][col],
            row,
            col
          );
          square.appendChild(piece);
        }

        this.boardElement.appendChild(square);
      }
    }

    // Only highlight must-capture pieces if the board is loaded
    if (this.gameState.board) {
      this.highlightMustCapturePieces();
    }
    // Optionally, trigger a loading spinner in the main UI if board is null
    if (
      !this.gameState.board &&
      typeof window !== "undefined" &&
      window.showLoadingSpinner
    ) {
      window.showLoadingSpinner();
    } else if (
      this.gameState.board &&
      typeof window !== "undefined" &&
      window.hideLoadingSpinner
    ) {
      window.hideLoadingSpinner();
    }
  }

  createSquare(row, col) {
    const square = document.createElement("div");
    square.classList.add(CSS_CLASSES.SQUARE);
    square.dataset.row = row;
    square.dataset.col = col;
    square.style.position = "relative"; // Ensure relative positioning for absolute children

    // Add the square number visibly to the square
    const squareNumber = toSquareNumber(row, col);
    const numberLabel = document.createElement("span");
    numberLabel.classList.add("square-number-label");
    numberLabel.textContent = squareNumber;
    square.appendChild(numberLabel);

    if ((row + col) % 2 === 1) {
      square.classList.add(CSS_CLASSES.DARK);
    } else {
      square.classList.add(CSS_CLASSES.LIGHT);
    }

    return square;
  }

  createPiece(type, row, col) {
    const piece = document.createElement("div");
    piece.classList.add(CSS_CLASSES.PIECE);
    piece.dataset.row = row;
    piece.dataset.col = col;

    // Apply counter-rotation to keep pieces upright
    piece.style.transform = "var(--piece-rotation, rotate(0deg))";

    switch (type) {
      case PIECE_TYPES.RED:
        piece.classList.add(PLAYER_COLORS.RED);
        break;
      case PIECE_TYPES.BLACK:
        piece.classList.add(PLAYER_COLORS.BLACK);
        break;
      case PIECE_TYPES.RED_KING:
        piece.classList.add(PLAYER_COLORS.RED, CSS_CLASSES.KING);
        break;
      case PIECE_TYPES.BLACK_KING:
        piece.classList.add(PLAYER_COLORS.BLACK, CSS_CLASSES.KING);
        break;
    }

    return piece;
  }

  highlightMustCapturePieces() {
    if (!this.gameState.isMyTurn) return;

    const moveValidator = new MoveValidator(this.gameState);
    if (!moveValidator.hasAvailableCaptures(this.gameState.currentPlayer))
      return;

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const pieceType = this.gameState.board[row][col];
        if (pieceType === PIECE_TYPES.EMPTY) continue;

        const isRed =
          pieceType === PIECE_TYPES.RED || pieceType === PIECE_TYPES.RED_KING;
        const isPlayerPiece =
          (this.gameState.currentPlayer === PLAYER_COLORS.RED && isRed) ||
          (this.gameState.currentPlayer === PLAYER_COLORS.BLACK && !isRed);

        if (!isPlayerPiece) continue;

        if (moveValidator.pieceHasCaptures(row, col, pieceType)) {
          const square = document.querySelector(
            `[data-row="${row}"][data-col="${col}"]`
          );
          const piece = square?.querySelector(`.${CSS_CLASSES.PIECE}`);
          if (piece) {
            piece.classList.add(CSS_CLASSES.MUST_CAPTURE);
          }
        }
      }
    }
  }

  highlightPossibleMoves(row, col) {
    const moveValidator = new MoveValidator(this.gameState);
    const possibleMoves = moveValidator.getPossibleMoves(row, col);

    possibleMoves.forEach((move) => {
      this.highlightSquare(move.row, move.col, CSS_CLASSES.POSSIBLE_MOVE);
    });
  }

  highlightNormalMoves(row, col, directions, isKing) {
    directions.forEach(([rowDir, colDir]) => {
      if (isKing) {
        for (let distance = 1; distance < BOARD_SIZE; distance++) {
          const newRow = row + rowDir * distance;
          const newCol = col + colDir * distance;

          if (!this.isValidPosition(newRow, newCol)) break;
          if (this.gameState.board[newRow][newCol] !== PIECE_TYPES.EMPTY) break;

          this.highlightSquare(newRow, newCol, CSS_CLASSES.POSSIBLE_MOVE);
        }
      } else {
        const newRow = row + rowDir;
        const newCol = col + colDir;

        if (
          this.isValidPosition(newRow, newCol) &&
          this.gameState.board[newRow][newCol] === PIECE_TYPES.EMPTY
        ) {
          this.highlightSquare(newRow, newCol, CSS_CLASSES.POSSIBLE_MOVE);
        }
      }
    });
  }

  highlightCaptureMoves(row, col, directions, isKing) {
    directions.forEach(([rowDir, colDir]) => {
      if (isKing) {
        this.highlightKingCaptures(row, col, rowDir, colDir);
      } else {
        const jumpRow = row + rowDir * 2;
        const jumpCol = col + colDir * 2;
        const middleRow = row + rowDir;
        const middleCol = col + colDir;

        if (
          this.isValidPosition(jumpRow, jumpCol) &&
          this.gameState.board[jumpRow][jumpCol] === PIECE_TYPES.EMPTY &&
          this.gameState.board[middleRow][middleCol] !== PIECE_TYPES.EMPTY &&
          this.gameState.isOpponentPiece(
            this.gameState.board[middleRow][middleCol],
            this.gameState.currentPlayer
          )
        ) {
          this.highlightSquare(jumpRow, jumpCol, CSS_CLASSES.POSSIBLE_MOVE);
        }
      }
    });
  }

  highlightKingCaptures(row, col, rowDir, colDir) {
    let foundOpponent = false;

    for (let distance = 1; distance < BOARD_SIZE; distance++) {
      const checkRow = row + rowDir * distance;
      const checkCol = col + colDir * distance;

      if (!this.isValidPosition(checkRow, checkCol)) break;

      const pieceAtPosition = this.gameState.board[checkRow][checkCol];

      if (pieceAtPosition === PIECE_TYPES.EMPTY) {
        if (foundOpponent) {
          this.highlightSquare(checkRow, checkCol, CSS_CLASSES.POSSIBLE_MOVE);
        }
        continue;
      }

      if (
        this.gameState.isOpponentPiece(
          pieceAtPosition,
          this.gameState.currentPlayer
        )
      ) {
        if (foundOpponent) break;
        foundOpponent = true;
        continue;
      }

      break;
    }
  }

  highlightSquare(row, col, className) {
    const square = document.querySelector(
      `[data-row="${row}"][data-col="${col}"]`
    );
    if (square) {
      square.classList.add(className);
      if (
        className === CSS_CLASSES.POSSIBLE_MOVE &&
        !square.querySelector(".inner-ring")
      ) {
        const ring = document.createElement("div");
        ring.className = "inner-ring";
        square.appendChild(ring);
      }
    }
  }

  clearHighlights() {
    document.querySelectorAll(`.${CSS_CLASSES.SQUARE}`).forEach((square) => {
      square.classList.remove(
        CSS_CLASSES.HIGHLIGHTED,
        CSS_CLASSES.POSSIBLE_MOVE,
        CSS_CLASSES.OPPONENT_SELECTED
      );
    });

    document.querySelectorAll(`.${CSS_CLASSES.PIECE}`).forEach((piece) => {
      piece.classList.remove(CSS_CLASSES.MUST_CAPTURE);
    });
  }

  isValidPosition(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  setBoardOrientation() {
    if (this.gameState.myColor === PLAYER_COLORS.BLACK) {
      this.boardElement.style.transform = "rotate(180deg)";
      this.boardElement.style.setProperty("--piece-rotation", "rotate(180deg)");
    } else {
      this.boardElement.style.transform = "rotate(0deg)";
      this.boardElement.style.setProperty("--piece-rotation", "rotate(0deg)");
    }
  }
}
