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

    // Send selection to opponent via parent
    this.sendSelectionToParent(row, col, "select");
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

    // Send deselection to opponent via parent
    this.sendSelectionToParent(null, null, "deselect");

    // Re-highlight must-capture pieces when no piece is selected
    this.highlightMustCapturePieces();
  }

  // Send selection events to opponent via parent
  sendSelectionToParent(row, col, action) {
    if (window.parent && window.parent !== window) {
      const selectionData = {
        type: "checkers-selection",
        action: action, // 'select' or 'deselect'
        row: row,
        col: col,
        gameId: this.gameId,
        playerId: this.myUserId,
        playerColor: this.myColor,
        possibleMoves:
          action === "select" ? this.getPossibleMoves(row, col) : [],
      };

      window.parent.postMessage(selectionData, "*");
    }
  }

  // Get possible moves for a piece
  getPossibleMoves(row, col) {
    const moves = [];
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
      ];
    } else if (isRed) {
      directions = [
        [-1, -1],
        [-1, 1],
      ];
    } else {
      directions = [
        [1, -1],
        [1, 1],
      ];
    }

    // Check each direction for valid moves
    directions.forEach(([rowDir, colDir]) => {
      if (isKing) {
        // Kings can fly multiple squares
        for (let distance = 1; distance < 8; distance++) {
          const newRow = row + rowDir * distance;
          const newCol = col + colDir * distance;

          if (!this.isValidPosition(newRow, newCol)) break;
          if (this.gameState[newRow][newCol] !== 0) break;

          if (!capturesAvailable) {
            moves.push({ row: newRow, col: newCol, type: "move" });
          }
        }
        // Check for king captures
        this.addKingCaptureMoves(row, col, rowDir, colDir, moves);
      } else {
        // Regular pieces move 1 square
        const newRow = row + rowDir;
        const newCol = col + colDir;

        if (
          this.isValidPosition(newRow, newCol) &&
          this.gameState[newRow][newCol] === 0 &&
          !capturesAvailable
        ) {
          moves.push({ row: newRow, col: newCol, type: "move" });
        }

        // Check for regular captures (2 squares)
        const jumpRow = row + rowDir * 2;
        const jumpCol = col + colDir * 2;
        const middleRow = row + rowDir;
        const middleCol = col + colDir;

        if (
          this.isValidPosition(jumpRow, jumpCol) &&
          this.gameState[jumpRow][jumpCol] === 0 &&
          this.gameState[middleRow][middleCol] !== 0 &&
          this.isOpponentPiece(
            this.gameState[middleRow][middleCol],
            this.currentPlayer
          )
        ) {
          moves.push({ row: jumpRow, col: jumpCol, type: "capture" });
        }
      }
    });

    return moves;
  }

  // Helper method for king capture moves
  addKingCaptureMoves(row, col, rowDir, colDir, moves) {
    let foundOpponent = false;

    for (let distance = 1; distance < 8; distance++) {
      const checkRow = row + rowDir * distance;
      const checkCol = col + colDir * distance;

      if (!this.isValidPosition(checkRow, checkCol)) break;

      const pieceAtPosition = this.gameState[checkRow][checkCol];

      if (pieceAtPosition === 0) {
        if (foundOpponent) {
          moves.push({ row: checkRow, col: checkCol, type: "capture" });
        }
        continue;
      }

      if (this.isOpponentPiece(pieceAtPosition, this.currentPlayer)) {
        if (foundOpponent) break;
        foundOpponent = true;
        continue;
      }

      break;
    }
  }

  // Display opponent's selection transparently
  showOpponentSelection(row, col, possibleMoves) {
    // Clear any existing opponent highlights
    this.clearOpponentHighlights();

    if (row !== null && col !== null) {
      // Highlight the selected piece
      const selectedSquare = document.querySelector(
        `[data-row="${row}"][data-col="${col}"]`
      );
      const piece = selectedSquare?.querySelector(".piece");

      if (selectedSquare) {
        selectedSquare.classList.add("opponent-selected");
      }
      if (piece) {
        piece.classList.add("opponent-selected");
      }

      // Highlight possible moves
      possibleMoves.forEach((move) => {
        const square = document.querySelector(
          `[data-row="${move.row}"][data-col="${move.col}"]`
        );
        if (square) {
          square.classList.add("opponent-possible-move");
        }
      });
    }
  }

  // Clear opponent highlights
  clearOpponentHighlights() {
    document.querySelectorAll(".square").forEach((square) => {
      square.classList.remove("opponent-selected", "opponent-possible-move");
    });
    document.querySelectorAll(".piece").forEach((piece) => {
      piece.classList.remove("opponent-selected");
    });
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
      // Check each direction for valid moves
      directions.forEach(([rowDir, colDir]) => {
        if (isKing) {
          // Kings can fly multiple squares
          for (let distance = 1; distance < 8; distance++) {
            const newRow = row + rowDir * distance;
            const newCol = col + colDir * distance;

            if (!this.isValidPosition(newRow, newCol)) break;

            if (this.gameState[newRow][newCol] !== 0) break; // Path blocked

            console.log(`Adding king flight highlight to ${newRow},${newCol}`);
            this.highlightSquare(newRow, newCol, "possible-move");
          }
        } else {
          // Regular pieces move 1 square
          const newRow = row + rowDir;
          const newCol = col + colDir;

          if (
            this.isValidPosition(newRow, newCol) &&
            this.gameState[newRow][newCol] === 0
          ) {
            console.log(`Adding regular move highlight to ${newRow},${newCol}`);
            this.highlightSquare(newRow, newCol, "possible-move");
          }
        }
      });
    }

    // Check for captures (jumping over opponents)
    directions.forEach(([rowDir, colDir]) => {
      if (isKing) {
        // Kings can capture at any distance along diagonal
        this.findKingCaptures(row, col, rowDir, colDir);
      } else {
        // Regular pieces capture by jumping 2 squares
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
          console.log(`Adding regular jump highlight to ${jumpRow},${jumpCol}`);
          this.highlightSquare(jumpRow, jumpCol, "possible-move");
        }
      }
    });
  }

  // New method for king capture detection
  findKingCaptures(row, col, rowDir, colDir) {
    let foundOpponent = false;
    let opponentRow = -1;
    let opponentCol = -1;

    // Scan along the diagonal
    for (let distance = 1; distance < 8; distance++) {
      const checkRow = row + rowDir * distance;
      const checkCol = col + colDir * distance;

      if (!this.isValidPosition(checkRow, checkCol)) break;

      const pieceAtPosition = this.gameState[checkRow][checkCol];

      if (pieceAtPosition === 0) {
        // Empty square
        if (foundOpponent) {
          // We can land here after jumping the opponent
          console.log(
            `Adding king capture landing option at ${checkRow},${checkCol}`
          );
          this.highlightSquare(checkRow, checkCol, "possible-move");
        }
        continue;
      }

      if (this.isOpponentPiece(pieceAtPosition, this.currentPlayer)) {
        if (foundOpponent) {
          // Second opponent piece blocks further movement
          break;
        }
        // First opponent piece found
        foundOpponent = true;
        opponentRow = checkRow;
        opponentCol = checkCol;
        continue;
      }

      // Our own piece blocks movement
      break;
    }
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
      const captureOccurred = this.makeMove(fromRow, fromCol, toRow, toCol);

      // If this was a capture move, check for additional jumps with the same piece
      if (
        captureOccurred &&
        this.hasAdditionalJumps(
          toRow,
          toCol,
          this.currentPlayer,
          this.gameState
        )
      ) {
        // Same player continues for chain jumping
        // Don't switch player
      } else {
        // For normal moves OR completed capture sequences, always switch players
        this.switchPlayer();
      }

      // Recreate board AFTER turn management is complete
      this.createBoard();
    }

    this.deselectPiece();
  }

  isValidMove(fromRow, fromCol, toRow, toCol) {
    // Check if target square is empty
    if (this.gameState[toRow][toCol] !== 0) return false;

    // Check if it's a diagonal move
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    if (rowDiff !== colDiff) return false; // Must be diagonal

    const pieceType = this.gameState[fromRow][fromCol];
    const isKing = pieceType === 3 || pieceType === 4;
    const isRed = pieceType === 1 || pieceType === 3;

    // Check if captures are available - if so, only allow capture moves
    const capturesAvailable = this.hasAvailableCaptures(this.currentPlayer);

    if (isKing) {
      // Kings can move/capture at any distance
      return this.isValidKingMove(
        fromRow,
        fromCol,
        toRow,
        toCol,
        capturesAvailable
      );
    } else {
      // Regular piece logic (existing)
      if (rowDiff !== 1 && rowDiff !== 2) return false;

      if (capturesAvailable && rowDiff === 1) {
        return false; // Must capture when captures are available
      }

      // Check direction restrictions for non-kings
      if (isRed && toRow >= fromRow) return false; // Red moves up
      if (!isRed && toRow <= fromRow) return false; // Black moves down

      // For jump moves (2 squares), check if jumping over opponent
      if (rowDiff === 2) {
        const middleRow = fromRow + (toRow - fromRow) / 2;
        const middleCol = fromCol + (toCol - fromCol) / 2;
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
  }

  // New method for validating king moves
  isValidKingMove(fromRow, fromCol, toRow, toCol, capturesAvailable) {
    const rowDir = Math.sign(toRow - fromRow);
    const colDir = Math.sign(toCol - fromCol);
    const distance = Math.abs(toRow - fromRow);

    let foundOpponent = false;
    let opponentCount = 0;

    // Check each square along the path
    for (let step = 1; step <= distance; step++) {
      const checkRow = fromRow + rowDir * step;
      const checkCol = fromCol + colDir * step;
      const pieceAtPosition = this.gameState[checkRow][checkCol];

      if (step === distance) {
        // Final destination - must be empty (already checked)
        continue;
      }

      if (pieceAtPosition === 0) {
        // Empty square - continue
        continue;
      }

      if (this.isOpponentPiece(pieceAtPosition, this.currentPlayer)) {
        foundOpponent = true;
        opponentCount++;

        if (opponentCount > 1) {
          // Can't jump over multiple pieces in one move
          return false;
        }
        continue;
      }

      // Our own piece blocks the path
      return false;
    }

    // If captures are available but this move doesn't capture, it's invalid
    if (capturesAvailable && !foundOpponent) {
      return false;
    }

    // If this is a capture move, ensure exactly one opponent was jumped
    if (foundOpponent && opponentCount !== 1) {
      return false;
    }

    return true;
  }

  makeMove(fromRow, fromCol, toRow, toCol) {
    // Store the original piece type before moving
    const originalPieceType = Number(this.gameState[fromRow][fromCol]);
    const isKing = originalPieceType === 3 || originalPieceType === 4;

    // Move piece in game state
    this.gameState[fromRow][fromCol] = 0;
    this.gameState[toRow][toCol] = originalPieceType;

    // Handle captures
    const rowDir = Math.sign(toRow - fromRow);
    const colDir = Math.sign(toCol - fromCol);
    const distance = Math.abs(toRow - fromRow);
    let captureOccurred = false; // Track if a capture actually happened

    if (isKing && distance > 1) {
      // FLYING KING CAPTURE: Remove the jumped piece anywhere along the path
      for (let step = 1; step < distance; step++) {
        const checkRow = fromRow + rowDir * step;
        const checkCol = fromCol + colDir * step;

        if (
          this.gameState[checkRow][checkCol] !== 0 &&
          this.isOpponentPiece(
            this.gameState[checkRow][checkCol],
            this.currentPlayer
          )
        ) {
          this.gameState[checkRow][checkCol] = 0;
          captureOccurred = true; // Mark that a capture occurred
          console.log(
            `King captured piece at ${checkRow},${checkCol}, landed at ${toRow},${toCol}`
          );
          break; // Only one piece per move
        }
      }
    } else if (!isKing && distance === 2) {
      // REGULAR PIECE CAPTURE: Check if there's actually a piece to capture
      const capturedRow = fromRow + (toRow - fromRow) / 2;
      const capturedCol = fromCol + (toCol - fromCol) / 2;

      // Only capture if there's an opponent piece in the middle
      if (
        this.gameState[capturedRow][capturedCol] !== 0 &&
        this.isOpponentPiece(
          this.gameState[capturedRow][capturedCol],
          this.currentPlayer
        )
      ) {
        this.gameState[capturedRow][capturedCol] = 0;
        captureOccurred = true; // Mark that a capture occurred
        console.log(`Regular piece captured at ${capturedRow},${capturedCol}`);
      }
    }

    // Convert parameters to numbers for safe comparison
    const targetRow = Number(toRow);
    const targetCol = Number(toCol);

    console.log(`🔍 KING PROMOTION CHECK:`);
    console.log(
      `  Original piece type: ${originalPieceType} (${typeof originalPieceType})`
    );
    console.log(`  Moving to row: ${targetRow}`);
    console.log(
      `  Red promotion: pieceType(${originalPieceType}) === 1? ${
        originalPieceType === 1
      }, targetRow(${targetRow}) === 0? ${targetRow === 0}`
    );
    console.log(
      `  Black promotion: pieceType(${originalPieceType}) === 2? ${
        originalPieceType === 2
      }, targetRow(${targetRow}) === 7? ${targetRow === 7}`
    );

    // Red pieces (1) promote to red kings (3) when reaching row 0 (top)
    if (originalPieceType === 1 && targetRow === 0) {
      console.log(`🔴 PROMOTING RED PIECE TO KING! (1 → 3)`);
      this.gameState[targetRow][targetCol] = 3;
      console.log(
        `  ✅ Promotion successful: gameState[${targetRow}][${targetCol}] = ${this.gameState[targetRow][targetCol]}`
      );
    }
    // Black pieces (2) promote to black kings (4) when reaching row 7 (bottom)
    else if (originalPieceType === 2 && targetRow === 7) {
      console.log(`⚫ PROMOTING BLACK PIECE TO KING! (2 → 4)`);
      this.gameState[targetRow][targetCol] = 4;
      console.log(
        `  ✅ Promotion successful: gameState[${targetRow}][${targetCol}] = ${this.gameState[targetRow][targetCol]}`
      );
    } else {
      console.log(
        `❌ No promotion: pieceType=${originalPieceType}, targetRow=${targetRow} (not promotion conditions)`
      );
    }
    console.log(
      `📋 Board state after promotion check:`,
      JSON.stringify(this.gameState)
    );


    // Clear opponent highlights after a move is made
    this.clearOpponentHighlights();

    // Add move to log
    this.addMoveToLog(fromRow, fromCol, toRow, toCol, this.currentPlayer);

    // Send move data to parent (Bubble) if embedded
    this.sendMoveToParent(fromRow, fromCol, toRow, toCol, this.currentPlayer);

    return captureOccurred; // Return whether a capture occurred
  }

  switchPlayer() {
    this.currentPlayer = this.currentPlayer === "red" ? "black" : "red";

    // Update isMyTurn based on whether the new current player matches our color
    this.isMyTurn = this.currentPlayer === this.myColor;

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
    const pieceType = gameState[toRow][toCol];
    const isKing = pieceType === 3 || pieceType === 4;
    const distance = Math.abs(toRow - fromRow);

    // Check if this was a capture move
    let wasCapture = false;

    if (isKing && distance > 1) {
      // For kings, any move > 1 square could be a capture
      // Check if there was actually a piece captured along the path
      const rowDir = Math.sign(toRow - fromRow);
      const colDir = Math.sign(toCol - fromCol);

      for (let step = 1; step < distance; step++) {
        const checkRow = fromRow + rowDir * step;
        const checkCol = fromCol + colDir * step;

        // If there was an opponent piece here before the move, it was captured
        if (this.isValidPosition(checkRow, checkCol)) {
          // We can't directly check the old board state, but if the move was valid
          // and distance > 1, it must have been a capture
          wasCapture = true;
          break;
        }
      }
    } else if (!isKing && distance === 2) {
      // For regular pieces, 2-square moves are always captures
      wasCapture = true;
    }

    // If it was a capture, check for additional captures
    if (wasCapture) {
      // Check if the player who just captured has more captures available
      if (this.hasAdditionalJumps(toRow, toCol, currentPlayer, gameState)) {
        return currentPlayer; // Same player continues
      }
    }

    // Normal move or no more captures available
    return currentPlayer === "red" ? "black" : "red";
  }

  hasAdditionalJumps(row, col, player, gameState) {
    const pieceType = gameState[row][col];
    const isKing = pieceType === 3 || pieceType === 4;
    const isRed = pieceType === 1 || pieceType === 3;

    // Use enhanced king logic for kings
    if (isKing) {
      return this.hasAdditionalKingCaptures(row, col, player, gameState);
    }

    // Define jump directions (2 squares) for regular pieces
    let directions = [];
    if (isRed) {
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

  // New method for flying king additional captures
  hasAdditionalKingCaptures(row, col, player, gameState) {
    const pieceType = gameState[row][col];
    const isKing = pieceType === 3 || pieceType === 4;

    if (!isKing) return false; // Only for kings

    // Check all four diagonal directions
    const directions = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];

    for (let [rowDir, colDir] of directions) {
      // Scan entire diagonal for capture opportunities
      if (
        this.canKingCaptureInDirection(
          row,
          col,
          rowDir,
          colDir,
          player,
          gameState
        )
      ) {
        return true;
      }
    }

    return false;
  }

  // Helper method to check king captures in a specific direction
  canKingCaptureInDirection(row, col, rowDir, colDir, player, gameState) {
    let foundOpponent = false;

    // Scan along diagonal
    for (let distance = 1; distance < 8; distance++) {
      const checkRow = row + rowDir * distance;
      const checkCol = col + colDir * distance;

      if (!this.isValidPosition(checkRow, checkCol)) break;

      const pieceAtPosition = gameState[checkRow][checkCol];

      if (pieceAtPosition === 0) {
        // Empty square
        if (foundOpponent) {
          // Can land here after capture - this is a valid capture!
          return true;
        }
        continue;
      }

      if (this.isOpponentPiece(pieceAtPosition, player)) {
        if (foundOpponent) break; // Can't capture multiple in one move
        foundOpponent = true;
        continue;
      }

      // Our own piece blocks path
      break;
    }

    return false;
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
    // Calculate next player based on whether additional jumps are available after this move
    const nextPlayerColor = this.hasAdditionalJumps(
      toRow,
      toCol,
      player,
      this.gameState
    )
      ? player // Same player continues if more jumps available
      : player === "red"
      ? "black"
      : "red"; // Switch players otherwise

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
    } else if (event.data.type === "opponent-selection") {
      // Handle opponent selection events
      if (event.data.action === "select") {
        this.showOpponentSelection(
          event.data.row,
          event.data.col,
          event.data.possibleMoves
        );
      } else if (event.data.action === "deselect") {
        this.clearOpponentHighlights();
      }
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
