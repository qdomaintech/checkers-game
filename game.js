class CheckersGame {
  constructor() {
    this.board = document.getElementById("checkers-board");
    this.currentPlayer = "red";
    this.selectedPiece = null;
    this.gameState = this.initializeGameState();
    this.createBoard();
    this.updateCurrentPlayerDisplay();
  }

  initializeGameState() {
    // 8x8 board represented as 2D array
    // 0 = empty, 1 = red piece, 2 = black piece, 3 = red king, 4 = black king
    const state = Array(8)
      .fill()
      .map(() => Array(8).fill(0));

    // Place red pieces (top 3 rows, only on dark squares)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          state[row][col] = 1; // red piece
        }
      }
    }

    // Place black pieces (bottom 3 rows, only on dark squares)
    for (let row = 5; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          state[row][col] = 2; // black piece
        }
      }
    }

    return state;
  }

  createBoard() {
    this.board.innerHTML = "";

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement("div");
        square.classList.add("square");
        square.dataset.row = row;
        square.dataset.col = col;

        // Alternate square colors
        if ((row + col) % 2 === 1) {
          square.classList.add("dark");
        } else {
          square.classList.add("light");
        }

        // Add piece if exists in game state
        const pieceType = this.gameState[row][col];
        if (pieceType !== 0) {
          const piece = this.createPiece(pieceType, row, col);
          square.appendChild(piece);
        }

        // Add click event listener
        square.addEventListener("click", (e) =>
          this.handleSquareClick(e, row, col)
        );

        this.board.appendChild(square);
      }
    }
  }

  createPiece(type, row, col) {
    const piece = document.createElement("div");
    piece.classList.add("piece");
    piece.dataset.row = row;
    piece.dataset.col = col;

    switch (type) {
      case 1:
        piece.classList.add("red");
        break;
      case 2:
        piece.classList.add("black");
        break;
      case 3:
        piece.classList.add("red", "king");
        break;
      case 4:
        piece.classList.add("black", "king");
        break;
    }

    return piece;
  }

  handleSquareClick(event, row, col) {
    const square = event.currentTarget;
    const piece = square.querySelector(".piece");

    // If clicking on a piece of the current player
    if (piece && this.isPieceOwnedByCurrentPlayer(piece)) {
      this.selectPiece(piece, row, col);
    }
    // If a piece is selected and clicking on an empty square
    else if (this.selectedPiece && !piece) {
      this.attemptMove(row, col);
    }
    // Deselect if clicking elsewhere
    else {
      this.deselectPiece();
    }
  }

  isPieceOwnedByCurrentPlayer(piece) {
    return (
      (this.currentPlayer === "red" && piece.classList.contains("red")) ||
      (this.currentPlayer === "black" && piece.classList.contains("black"))
    );
  }

  selectPiece(piece, row, col) {
    // Deselect previous piece
    this.deselectPiece();

    // Select new piece
    this.selectedPiece = { piece, row, col };
    piece.classList.add("selected");

    // Highlight possible moves
    this.highlightPossibleMoves(row, col);
  }

  deselectPiece() {
    if (this.selectedPiece) {
      this.selectedPiece.piece.classList.remove("selected");
      this.selectedPiece = null;
    }

    // Remove all highlights
    document.querySelectorAll(".square").forEach((square) => {
      square.classList.remove("highlighted", "possible-move");
    });
  }

  highlightPossibleMoves(row, col) {
    const pieceType = this.gameState[row][col];
    const isKing = pieceType === 3 || pieceType === 4;
    const isRed = pieceType === 1 || pieceType === 3;

    // Define movement directions
    let directions = [];
    if (isKing) {
      directions = [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]; // All diagonal directions
    } else if (isRed) {
      directions = [
        [1, -1],
        [1, 1],
      ]; // Red moves down
    } else {
      directions = [
        [-1, -1],
        [-1, 1],
      ]; // Black moves up
    }

    // Check each direction for valid moves
    directions.forEach(([rowDir, colDir]) => {
      const newRow = row + rowDir;
      const newCol = col + colDir;

      if (
        this.isValidPosition(newRow, newCol) &&
        this.gameState[newRow][newCol] === 0
      ) {
        this.highlightSquare(newRow, newCol, "possible-move");
      }
    });
  }

  isValidPosition(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  highlightSquare(row, col, className) {
    const square = document.querySelector(
      `[data-row="${row}"][data-col="${col}"]`
    );
    if (square) {
      square.classList.add(className);
    }
  }

  attemptMove(toRow, toCol) {
    if (!this.selectedPiece) return;

    const { row: fromRow, col: fromCol } = this.selectedPiece;

    // Check if it's a valid move
    if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
      this.makeMove(fromRow, fromCol, toRow, toCol);
      this.switchPlayer();
    }

    this.deselectPiece();
  }

  isValidMove(fromRow, fromCol, toRow, toCol) {
    // Check if target square is empty
    if (this.gameState[toRow][toCol] !== 0) return false;

    // Check if it's a diagonal move
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    if (rowDiff !== 1 || colDiff !== 1) return false;

    const pieceType = this.gameState[fromRow][fromCol];
    const isKing = pieceType === 3 || pieceType === 4;
    const isRed = pieceType === 1 || pieceType === 3;

    // Check direction restrictions for non-kings
    if (!isKing) {
      if (isRed && toRow <= fromRow) return false; // Red moves down
      if (!isRed && toRow >= fromRow) return false; // Black moves up
    }

    return true;
  }

  makeMove(fromRow, fromCol, toRow, toCol) {
    // Move piece in game state
    const pieceType = this.gameState[fromRow][fromCol];
    this.gameState[fromRow][fromCol] = 0;
    this.gameState[toRow][toCol] = pieceType;

    // Check for king promotion
    if (pieceType === 1 && toRow === 7) {
      // Red reaches bottom
      this.gameState[toRow][toCol] = 3;
    } else if (pieceType === 2 && toRow === 0) {
      // Black reaches top
      this.gameState[toRow][toCol] = 4;
    }

    // Recreate the board to reflect changes
    this.createBoard();

    // Add move to log
    this.addMoveToLog(fromRow, fromCol, toRow, toCol, this.currentPlayer);

    // Send move data to parent (Bubble) if embedded
    this.sendMoveToParent(fromRow, fromCol, toRow, toCol, this.currentPlayer);
  }

  switchPlayer() {
    this.currentPlayer = this.currentPlayer === "red" ? "black" : "red";
    this.updateCurrentPlayerDisplay();
  }

  updateCurrentPlayerDisplay() {
    const display = document.getElementById("current-player");
    if (display) {
      const playerName = this.currentPlayer === "red" ? "Uotoo" : "Cazoo";
      display.textContent = `${playerName}'s turn`;
      display.style.color =
        this.currentPlayer === "red" ? "#ff6b6b" : "#b0d0d0";
    }
  }

  addMoveToLog(fromRow, fromCol, toRow, toCol, player) {
    const moveLog = document.getElementById("move-log");
    const playerName = player === "red" ? "Uotoo" : "Cazoo";
    const moveText = `${playerName}: ${String.fromCharCode(97 + fromCol)}${
      8 - fromRow
    } → ${String.fromCharCode(97 + toCol)}${8 - toRow}`;

    // Create move entry
    const moveEntry = document.createElement("div");
    moveEntry.className = "move-entry";
    moveEntry.textContent = moveText;

    // Insert before current turn indicator
    const currentTurn = document.getElementById("current-player");
    moveLog.insertBefore(moveEntry, currentTurn);

    // Keep only last 8 moves
    const moves = moveLog.querySelectorAll(".move-entry");
    if (moves.length > 8) {
      moveLog.removeChild(moves[0]);
    }
  }

  sendMoveToParent(fromRow, fromCol, toRow, toCol, player) {
    // Send move data to parent window (Bubble) via postMessage
    if (window.parent && window.parent !== window) {
      const moveData = {
        type: "checkers-move",
        move: {
          from: { row: fromRow, col: fromCol },
          to: { row: toRow, col: toCol },
          player: player,
          timestamp: new Date().toISOString(),
          gameState: this.gameState,
        },
      };

      window.parent.postMessage(moveData, "*");
    }
  }

  // Method to receive messages from parent (Bubble)
  receiveMessageFromParent(event) {
    if (event.data.type === "reset-game") {
      this.resetGame();
    } else if (event.data.type === "set-player") {
      this.currentPlayer = event.data.player;
      this.updateCurrentPlayerDisplay();
    }
  }

  resetGame() {
    this.currentPlayer = "red";
    this.selectedPiece = null;
    this.gameState = this.initializeGameState();
    this.createBoard();
    this.updateCurrentPlayerDisplay();
  }
}

// Initialize the game when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const game = new CheckersGame();

  // Listen for messages from parent window (Bubble)
  window.addEventListener("message", (event) => {
    game.receiveMessageFromParent(event);
  });

  // Send ready signal to parent
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "checkers-ready" }, "*");
  }
});
