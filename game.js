class CheckersGame {
  constructor() {
    this.board = document.getElementById("checkers-board");
    this.currentPlayer = "red";
    this.selectedPiece = null;
    this.gameState = null; // Start empty, wait for board state from Bubble
    this.gameId = null; // Will be set when board state is received
    this.isMyTurn = false; // Will be determined by Bubble
    this.createBoard(); // Always show the board grid, even when empty
  }

  initializeGameState() {
    // 8x8 board represented as 2D array
    // 0 = empty, 1 = red piece, 2 = black piece, 3 = red king, 4 = black king
    const state = Array(8)
      .fill()
      .map(() => Array(8).fill(0));

    // Place black pieces (top 3 rows, only on dark squares)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          state[row][col] = 2; // black piece
        }
      }
    }

    // Place red pieces (bottom 3 rows, only on dark squares)
    for (let row = 5; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          state[row][col] = 1; // red piece
        }
      }
    }

    return state;
  }

  setBoardState(
    boardArray,
    currentPlayerId,
    myUserId,
    gameId,
    apiEndpoint,
    playerIds
  ) {
    console.log("Received raw boardArray:", boardArray);

    // Convert all values to numbers to ensure proper type checking
    this.gameState = boardArray.map((row) => row.map((cell) => Number(cell)));

    console.log("Converted board state:", this.gameState);
    console.log("Sample cell type:", typeof this.gameState[0][0]);

    this.gameId = gameId;
    this.apiEndpoint = apiEndpoint;
    this.myUserId = myUserId;

    // Parse combined player IDs from param5
    if (playerIds && playerIds.includes(",")) {
      const [redPlayerId, blackPlayerId] = playerIds.split(",");
      this.redPlayerId = redPlayerId.trim();
      this.blackPlayerId = blackPlayerId.trim();
    } else {
      console.error("Invalid playerIds format:", playerIds);
      return;
    }

    // Determine my color based on explicit assignments
    if (myUserId === this.redPlayerId) {
      this.myColor = "red";
      this.opponentPlayerId = this.blackPlayerId;
    } else if (myUserId === this.blackPlayerId) {
      this.myColor = "black";
      this.opponentPlayerId = this.redPlayerId;
    } else {
      console.error("User not assigned to either color!", {
        myUserId,
        redPlayerId: this.redPlayerId,
        blackPlayerId: this.blackPlayerId,
      });
      return;
    }

    this.opponentColor = this.myColor === "red" ? "black" : "red";

    // Set turn state
    this.isMyTurn = currentPlayerId === myUserId;
    this.currentPlayer = currentPlayerId === this.redPlayerId ? "red" : "black";

    console.log("Color assignments:", {
      myUserId: this.myUserId,
      myColor: this.myColor,
      redPlayer: this.redPlayerId,
      blackPlayer: this.blackPlayerId,
      isMyTurn: this.isMyTurn,
    });

    this.createBoard();
    this.checkAndFixExistingPromotions(); // Fix pieces that should already be promoted
    this.setBoardOrientation(); // Add board rotation based on player color
    this.updateCurrentPlayerDisplay();
  }

  checkAndFixExistingPromotions() {
    console.log(`🔧 CHECKING FOR EXISTING PIECES THAT SHOULD BE PROMOTED...`);
    let promotionsMade = 0;

    // Check row 0 for red pieces that should be kings
    for (let col = 0; col < 8; col++) {
      if (this.gameState[0][col] === 1) {
        // Red piece in promotion row
        console.log(
          `🔴 Found red piece at [0,${col}] that should be king - promoting 1 → 3`
        );
        this.gameState[0][col] = 3;
        promotionsMade++;
      }
    }

    // Check row 7 for black pieces that should be kings
    for (let col = 0; col < 8; col++) {
      if (this.gameState[7][col] === 2) {
        // Black piece in promotion row
        console.log(
          `⚫ Found black piece at [7,${col}] that should be king - promoting 2 → 4`
        );
        this.gameState[7][col] = 4;
        promotionsMade++;
      }
    }

    if (promotionsMade > 0) {
      console.log(
        `✅ Fixed ${promotionsMade} existing pieces that should have been promoted`
      );
      console.log(`📋 Updated board state:`, JSON.stringify(this.gameState));
    } else {
      console.log(`✅ No existing pieces needed promotion fixes`);
    }
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

        // Only add piece if gameState exists and this square is occupied
        if (
          this.gameState &&
          this.gameState[row] &&
          this.gameState[row][col] !== 0
        ) {
          const pieceType = this.gameState[row][col];
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

    // Highlight pieces that must capture after board is created
    this.highlightMustCapturePieces();
  }

  // Add new method to highlight pieces that must capture
  highlightMustCapturePieces() {
    // Only highlight if it's the current player's turn and captures are available
    if (!this.isMyTurn || !this.hasAvailableCaptures(this.currentPlayer)) {
      return;
    }

    // Find all pieces that belong to current player and can capture
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const pieceType = this.gameState[row][col];

        // Skip empty squares
        if (pieceType === 0) continue;

        // Check if piece belongs to current player
        const isRed = pieceType === 1 || pieceType === 3;
        const isPlayerPiece =
          (this.currentPlayer === "red" && isRed) ||
          (this.currentPlayer === "black" && !isRed);

        if (!isPlayerPiece) continue;

        // Check if this piece has captures available
        if (this.pieceHasCaptures(row, col, pieceType)) {
          // Find the piece element and add must-capture class
          const square = document.querySelector(
            `[data-row="${row}"][data-col="${col}"]`
          );
          const piece = square?.querySelector(".piece");
          if (piece) {
            piece.classList.add("must-capture");
          }
        }
      }
    }
  }

  // Clear must-capture highlights
  clearMustCaptureHighlights() {
    document.querySelectorAll(".piece.must-capture").forEach((piece) => {
      piece.classList.remove("must-capture");
    });
  }

  createPiece(type, row, col) {
    const piece = document.createElement("div");
    piece.classList.add("piece");
    piece.dataset.row = row;
    piece.dataset.col = col;

    // Apply counter-rotation to keep pieces upright
    piece.style.transform = "var(--piece-rotation, rotate(0deg))";

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
    // Don't allow moves if it's not the player's turn
    if (!this.isMyTurn) return;

    const square = event.currentTarget;
    const piece = square.querySelector(".piece");

    // If clicking on a piece of the current player
    if (piece && this.isPieceOwnedByCurrentPlayer(piece)) {
      // Check if captures are available
      const capturesAvailable = this.hasAvailableCaptures(this.currentPlayer);

      if (capturesAvailable) {
        // Only allow selection of pieces that can capture
        const pieceType = this.gameState[row][col];
        if (this.pieceHasCaptures(row, col, pieceType)) {
          this.selectPiece(piece, row, col);
        } else {
          // Show message that capture is mandatory
          this.showCaptureMessage();
        }
      } else {
        // No captures available, allow normal selection
        this.selectPiece(piece, row, col);
      }
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

    // Clear must-capture highlights when a piece is selected
    this.clearMustCaptureHighlights();

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

    // Re-highlight must-capture pieces when no piece is selected
    this.highlightMustCapturePieces();
  }

  highlightPossibleMoves(row, col) {
    console.log("Highlighting moves for piece at:", row, col);
    console.log("Game state at position:", this.gameState[row][col]);
    console.log("Type of value:", typeof this.gameState[row][col]);

    const pieceType = this.gameState[row][col];
    const isKing = pieceType === 3 || pieceType === 4;
    const isRed = pieceType === 1 || pieceType === 3;
    const capturesAvailable = this.hasAvailableCaptures(this.currentPlayer);

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
        [-1, -1],
        [-1, 1],
      ]; // Red moves up (toward row 0)
    } else {
      directions = [
        [1, -1],
        [1, 1],
      ]; // Black moves down (toward row 7)
    }

    // If captures are available, only show capture moves
    if (!capturesAvailable) {
      // Check each direction for valid moves (1 square) - only when no captures available
      directions.forEach(([rowDir, colDir]) => {
        const newRow = row + rowDir;
        const newCol = col + colDir;

        console.log(`Checking move to ${newRow},${newCol}`);

        if (this.isValidPosition(newRow, newCol)) {
          console.log(
            `Position valid. Cell value: ${
              this.gameState[newRow][newCol]
            } (type: ${typeof this.gameState[newRow][newCol]})`
          );

          if (this.gameState[newRow][newCol] === 0) {
            console.log(`Adding highlight to ${newRow},${newCol}`);
            this.highlightSquare(newRow, newCol, "possible-move");
          }
        }
      });
    }

    // Always check for jump moves (2 squares)
    directions.forEach(([rowDir, colDir]) => {
      const jumpRow = row + rowDir * 2;
      const jumpCol = col + colDir * 2;
      const middleRow = row + rowDir;
      const middleCol = col + colDir;

      if (
        this.isValidPosition(jumpRow, jumpCol) &&
        this.gameState[jumpRow][jumpCol] === 0 && // Target square empty
        this.gameState[middleRow][middleCol] !== 0 && // Middle has piece
        this.isOpponentPiece(
          this.gameState[middleRow][middleCol],
          this.currentPlayer
        )
      ) {
        console.log(`Adding jump highlight to ${jumpRow},${jumpCol}`);
        this.highlightSquare(jumpRow, jumpCol, "possible-move");
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

    if (rowDiff !== colDiff || (rowDiff !== 1 && rowDiff !== 2)) return false;

    const pieceType = this.gameState[fromRow][fromCol];
    const isKing = pieceType === 3 || pieceType === 4;
    const isRed = pieceType === 1 || pieceType === 3;

    // Check if captures are available - if so, only allow capture moves
    const capturesAvailable = this.hasAvailableCaptures(this.currentPlayer);
    if (capturesAvailable && rowDiff === 1) {
      return false; // Must capture when captures are available
    }

    // Check direction restrictions for non-kings
    if (!isKing) {
      if (isRed && toRow >= fromRow) return false; // Red moves up (toward row 0)
      if (!isRed && toRow <= fromRow) return false; // Black moves down (toward row 7)
    }

    // For jump moves (2 squares), check if jumping over opponent
    if (rowDiff === 2) {
      const middleRow = fromRow + (toRow - fromRow) / 2;
      const middleCol = fromCol + (toCol - fromCol) / 2;

      // Must jump over opponent piece
      const middlePiece = this.gameState[middleRow][middleCol];
      if (
        middlePiece === 0 ||
        !this.isOpponentPiece(middlePiece, this.currentPlayer)
      ) {
        return false;
      }
    }

    return true;
  }

  makeMove(fromRow, fromCol, toRow, toCol) {
    // Move piece in game state
    const pieceType = this.gameState[fromRow][fromCol];
    this.gameState[fromRow][fromCol] = 0;
    this.gameState[toRow][toCol] = pieceType;

    // Handle captures for jumps
    const rowDiff = Math.abs(toRow - fromRow);
    if (rowDiff === 2) {
      const capturedRow = fromRow + (toRow - fromRow) / 2;
      const capturedCol = fromCol + (toCol - fromCol) / 2;
      this.gameState[capturedRow][capturedCol] = 0; // Remove captured piece
      console.log(`Captured piece at ${capturedRow},${capturedCol}`);
    }

    // Check for king promotion with debugging
    // FORCE TYPE CONVERSION to ensure proper comparison
    pieceType = Number(pieceType);
    toRow = Number(toRow);
    toCol = Number(toCol);

    console.log(`🔍 KING PROMOTION CHECK (after type conversion):`);
    console.log(`  Piece type: ${pieceType} (${typeof pieceType})`);
    console.log(`  Moving to row: ${toRow}`);
    console.log(
      `  Red promotion: pieceType(${pieceType}) === 1? ${
        pieceType === 1
      }, toRow(${toRow}) === 0? ${toRow === 0}`
    );
    console.log(
      `  Black promotion: pieceType(${pieceType}) === 2? ${
        pieceType === 2
      }, toRow(${toRow}) === 7? ${toRow === 7}`
    );

    // Red pieces (1) promote to red kings (3) when reaching row 0 (top)
    if (pieceType === 1 && toRow === 0) {
      console.log(`🔴 PROMOTING RED PIECE TO KING! (1 → 3)`);
      this.gameState[toRow][toCol] = 3;
      console.log(
        `  ✅ Promotion successful: gameState[${toRow}][${toCol}] = ${this.gameState[toRow][toCol]}`
      );
    }
    // Black pieces (2) promote to black kings (4) when reaching row 7 (bottom)
    else if (pieceType === 2 && toRow === 7) {
      console.log(`⚫ PROMOTING BLACK PIECE TO KING! (2 → 4)`);
      this.gameState[toRow][toCol] = 4;
      console.log(
        `  ✅ Promotion successful: gameState[${toRow}][${toCol}] = ${this.gameState[toRow][toCol]}`
      );
    } else {
      console.log(
        `❌ No promotion: pieceType=${pieceType}, toRow=${toRow} (not promotion conditions)`
      );
    }
    console.log(
      `📋 Board state after promotion check:`,
      JSON.stringify(this.gameState)
    );

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
      const capturesAvailable = this.hasAvailableCaptures(this.currentPlayer);
      const turnText = capturesAvailable
        ? `${playerName}'s turn - Must capture!`
        : `${playerName}'s turn`;

      display.textContent = turnText;
      display.style.color =
        this.currentPlayer === "red" ? "#ff6b6b" : "#b0d0d0";
    }

    // Update must-capture highlights when turn changes
    this.clearMustCaptureHighlights();
    this.highlightMustCapturePieces();
  }

  showCaptureMessage() {
    const display = document.getElementById("current-player");
    if (display) {
      const originalText = display.textContent;
      display.textContent = "You must capture! Select a piece that can jump.";
      display.style.color = "#ff4444";

      // Reset after 2 seconds
      setTimeout(() => {
        this.updateCurrentPlayerDisplay();
      }, 2000);
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

  getNextPlayer(fromRow, fromCol, toRow, toCol, currentPlayer, gameState) {
    const rowDiff = Math.abs(toRow - fromRow);

    // If it was a jump (moved 2 squares), check for additional jumps
    if (rowDiff === 2) {
      // Check if the player who just jumped has more jumps available
      if (this.hasAdditionalJumps(toRow, toCol, currentPlayer, gameState)) {
        return currentPlayer; // Same player continues
      }
    }

    // Normal move or no more jumps available
    return currentPlayer === "red" ? "black" : "red";
  }

  hasAdditionalJumps(row, col, player, gameState) {
    const pieceType = gameState[row][col];
    const isKing = pieceType === 3 || pieceType === 4;
    const isRed = pieceType === 1 || pieceType === 3;

    // Define jump directions (2 squares)
    let directions = [];
    if (isKing) {
      directions = [
        [-2, -2],
        [-2, 2],
        [2, -2],
        [2, 2],
      ];
    } else if (isRed) {
      directions = [
        [-2, -2],
        [-2, 2],
      ]; // Red moves up (toward row 0)
    } else {
      directions = [
        [2, -2],
        [2, 2],
      ]; // Black moves down (toward row 7)
    }

    // Check each direction for valid jumps
    for (let [rowDir, colDir] of directions) {
      const jumpToRow = row + rowDir;
      const jumpToCol = col + colDir;
      const middleRow = row + rowDir / 2;
      const middleCol = col + colDir / 2;

      if (
        this.isValidPosition(jumpToRow, jumpToCol) &&
        gameState[jumpToRow][jumpToCol] === 0 && // Target square empty
        gameState[middleRow][middleCol] !== 0 && // Middle has piece
        this.isOpponentPiece(gameState[middleRow][middleCol], player)
      ) {
        // Middle is opponent
        return true; // Additional jump available
      }
    }

    return false; // No additional jumps
  }

  isOpponentPiece(pieceType, currentPlayer) {
    const isRed = pieceType === 1 || pieceType === 3;
    const isBlack = pieceType === 2 || pieceType === 4;

    if (currentPlayer === "red") {
      return isBlack; // Red player's opponent is black
    } else {
      return isRed; // Black player's opponent is red
    }
  }

  // Check if any captures are available for the current player
  hasAvailableCaptures(player) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const pieceType = this.gameState[row][col];

        // Skip if not current player's piece
        if (pieceType === 0) continue;

        const isRed = pieceType === 1 || pieceType === 3;
        const isPlayerPiece =
          (player === "red" && isRed) || (player === "black" && !isRed);

        if (!isPlayerPiece) continue;

        // Check if this piece has any captures available
        if (this.pieceHasCaptures(row, col, pieceType)) {
          return true;
        }
      }
    }
    return false;
  }

  // Check if a specific piece has captures available
  pieceHasCaptures(row, col, pieceType) {
    const isKing = pieceType === 3 || pieceType === 4;
    const isRed = pieceType === 1 || pieceType === 3;

    // Define jump directions (2 squares)
    let directions = [];
    if (isKing) {
      directions = [
        [-2, -2],
        [-2, 2],
        [2, -2],
        [2, 2],
      ];
    } else if (isRed) {
      directions = [
        [-2, -2],
        [-2, 2],
      ]; // Red moves up (toward row 0)
    } else {
      directions = [
        [2, -2],
        [2, 2],
      ]; // Black moves down (toward row 7)
    }

    // Check each direction for valid captures
    for (let [rowDir, colDir] of directions) {
      const jumpToRow = row + rowDir;
      const jumpToCol = col + colDir;
      const middleRow = row + rowDir / 2;
      const middleCol = col + colDir / 2;

      if (
        this.isValidPosition(jumpToRow, jumpToCol) &&
        this.gameState[jumpToRow][jumpToCol] === 0 && // Target square empty
        this.gameState[middleRow][middleCol] !== 0 && // Middle has piece
        this.isOpponentPiece(
          this.gameState[middleRow][middleCol],
          this.currentPlayer
        )
      ) {
        return true; // Capture available
      }
    }
    return false;
  }

  sendMoveToParent(fromRow, fromCol, toRow, toCol, player) {
    const nextPlayerColor = this.getNextPlayer(
      fromRow,
      fromCol,
      toRow,
      toCol,
      player,
      this.gameState
    );

    // Use explicit color assignments
    const nextPlayerId =
      nextPlayerColor === "red" ? this.redPlayerId : this.blackPlayerId;

    // Send move data to Bubble via API endpoint
    if (this.gameId && this.apiEndpoint) {
      const moveData = {
        game_id: this.gameId,
        board_state: JSON.stringify(this.gameState),
        current_player_id: nextPlayerId, // Fixed to use correct player IDs
        from_row: fromRow,
        from_col: fromCol,
        to_row: toRow,
        to_col: toCol,
      };

      fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(moveData),
      })
        .then((res) => res.json())
        .then((data) => console.log("Move saved to Bubble:", data))
        .catch((err) => console.error("Error saving move:", err));
    }

    // Also send via postMessage for immediate parent communication
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
    if (event.data.type === "set-board-state") {
      this.setBoardState(
        event.data.board,
        event.data.currentPlayerId,
        event.data.myUserId,
        event.data.gameId,
        event.data.apiEndpoint,
        event.data.playerIds // Combined player IDs string
      );
    } else if (event.data.type === "reset-game") {
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

  setBoardOrientation() {
    const board = document.getElementById("checkers-board");

    if (this.myColor === "black") {
      // Rotate board 180 degrees for black player
      board.style.transform = "rotate(180deg)";
      // Set CSS variable for piece counter-rotation
      board.style.setProperty("--piece-rotation", "rotate(180deg)");

      console.log("Board rotated for black player perspective");
    } else {
      // Normal orientation for red player
      board.style.transform = "rotate(0deg)";
      board.style.setProperty("--piece-rotation", "rotate(0deg)");

      console.log("Board in normal orientation for red player");
    }
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
