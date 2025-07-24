import { GameState } from "./GameState.js";
import { MoveValidator } from "../rules/MoveValidator.js";
import { BoardRenderer } from "../ui/BoardRenderer.js";
import { EVENTS, CSS_CLASSES, PLAYER_COLORS } from "../utils/Constants.js";

export class GameController {
  constructor() {
    this.gameState = new GameState();
    this.moveValidator = new MoveValidator(this.gameState);
    this.boardRenderer = new BoardRenderer(
      document.getElementById("checkers-board"),
      this.gameState
    );
    this.selectedPiece = null;
  }

  initialize() {
    this.gameState.initializeBoard();
    this.boardRenderer.createBoard();
    this.setupEventListeners();
    this.updateCurrentPlayerDisplay();
  }

  setupEventListeners() {
    document.getElementById("checkers-board").addEventListener("click", (e) => {
      this.handleBoardClick(e);
    });

    window.addEventListener("message", (event) => {
      this.handleMessage(event);
    });

    // Send ready signal to parent
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: EVENTS.CHECKERS_READY }, "*");
    }
  }

  handleBoardClick(event) {
    if (!this.gameState.isMyTurn) return;

    const square = event.target.closest(`.${CSS_CLASSES.SQUARE}`);
    if (!square) return;

    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const piece = square.querySelector(`.${CSS_CLASSES.PIECE}`);

    if (piece && this.isPieceOwnedByCurrentPlayer(piece)) {
      this.selectPiece(piece, row, col);
    } else if (this.selectedPiece && !piece) {
      this.attemptMove(row, col);
    } else {
      this.deselectPiece();
    }
  }

  selectPiece(piece, row, col) {
    this.deselectPiece();

    this.selectedPiece = { piece, row, col };
    piece.classList.add(CSS_CLASSES.SELECTED);

    this.boardRenderer.clearHighlights();
    this.boardRenderer.highlightPossibleMoves(row, col);

    this.sendSelectionToParent(row, col, "select");
  }

  deselectPiece() {
    if (this.selectedPiece) {
      this.selectedPiece.piece.classList.remove(CSS_CLASSES.SELECTED);
      this.selectedPiece = null;
    }

    this.boardRenderer.clearHighlights();
    this.sendSelectionToParent(null, null, "deselect");
  }

  attemptMove(toRow, toCol) {
    if (!this.selectedPiece) return;

    const { row: fromRow, col: fromCol } = this.selectedPiece;

    if (this.moveValidator.isValidMove(fromRow, fromCol, toRow, toCol)) {
      const captureOccurred = this.gameState.makeMove(
        fromRow,
        fromCol,
        toRow,
        toCol
      );

      this.gameState.switchPlayer();
      this.boardRenderer.createBoard();
      this.updateCurrentPlayerDisplay();
      this.sendMoveToParent(fromRow, fromCol, toRow, toCol);
    }

    this.deselectPiece();
  }

  isPieceOwnedByCurrentPlayer(piece) {
    return (
      (this.gameState.currentPlayer === PLAYER_COLORS.RED &&
        piece.classList.contains(PLAYER_COLORS.RED)) ||
      (this.gameState.currentPlayer === PLAYER_COLORS.BLACK &&
        piece.classList.contains(PLAYER_COLORS.BLACK))
    );
  }

  updateCurrentPlayerDisplay() {
    const display = document.getElementById("current-player");
    if (display) {
      const playerName =
        this.gameState.currentPlayer === PLAYER_COLORS.RED ? "Uotoo" : "Cazoo";
      
      display.textContent = `${playerName}'s turn`;
      display.style.color =
        this.gameState.currentPlayer === PLAYER_COLORS.RED
          ? "#ff6b6b"
          : "#b0d0d0";
    }
  }

  showCaptureMessage() {
    const display = document.getElementById("current-player");
    if (display) {
      const originalText = display.textContent;
      display.textContent = "You must capture! Select a piece that can jump.";
      display.style.color = "#ff4444";

      setTimeout(() => {
        display.textContent = originalText;
        this.updateCurrentPlayerDisplay();
      }, 2000);
    }
  }

  sendSelectionToParent(row, col, action) {
    if (window.parent && window.parent !== window) {
      const selectionData = {
        type: EVENTS.CHECKERS_SELECTION,
        action: action,
        row: row,
        col: col,
        gameId: this.gameState.gameId,
        playerId: this.gameState.myUserId,
        playerColor: this.gameState.myColor,
        possibleMoves:
          action === "select"
            ? this.moveValidator.getPossibleMoves(row, col)
            : [],
      };

      window.parent.postMessage(selectionData, "*");
    }
  }

  sendMoveToParent(fromRow, fromCol, toRow, toCol) {
    // Determine next player based on current board state
    const pieceType = this.gameState.board[toRow][toCol];
    const captureOccurred =
      Math.abs(toRow - fromRow) === 2 ||
      (this.gameState.isKing(pieceType) && Math.abs(toRow - fromRow) > 1);

    let nextPlayerColor = this.gameState.currentPlayer;

    if (
      !captureOccurred ||
      !this.moveValidator.pieceHasCaptures(toRow, toCol, pieceType)
    ) {
      nextPlayerColor =
        this.gameState.currentPlayer === PLAYER_COLORS.RED
          ? PLAYER_COLORS.BLACK
          : PLAYER_COLORS.RED;
    }

    const nextPlayerId =
      nextPlayerColor === PLAYER_COLORS.RED
        ? this.gameState.redPlayerId
        : this.gameState.blackPlayerId;

    if (this.gameState.gameId && this.gameState.apiEndpoint) {
      const moveData = {
        game_id: this.gameState.gameId,
        board_state: JSON.stringify(this.gameState.board),
        current_player_id: nextPlayerId,
        from_row: fromRow,
        from_col: fromCol,
        to_row: toRow,
        to_col: toCol,
      };

      fetch(this.gameState.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(moveData),
      })
        .then((res) => res.json())
        .then((data) => console.log("Move saved:", data))
        .catch((err) => console.error("Error saving move:", err));
    }

    if (window.parent && window.parent !== window) {
      const moveData = {
        type: EVENTS.CHECKERS_MOVE,
        move: {
          from: { row: fromRow, col: fromCol },
          to: { row: toRow, col: toCol },
          player: this.gameState.currentPlayer,
          timestamp: new Date().toISOString(),
          gameState: this.gameState.board,
        },
      };

      window.parent.postMessage(moveData, "*");
    }
  }

  handleMessage(event) {
    switch (event.data.type) {
      case EVENTS.SET_BOARD_STATE:
        this.gameState.setBoardState(
          event.data.board,
          event.data.currentPlayerId,
          event.data.myUserId,
          event.data.gameId,
          event.data.apiEndpoint,
          event.data.playerIds
        );
        this.boardRenderer.createBoard();
        this.boardRenderer.setBoardOrientation();
        this.updateCurrentPlayerDisplay();
        break;

      case EVENTS.RESET_GAME:
        this.gameState.initializeBoard();
        this.boardRenderer.createBoard();
        this.updateCurrentPlayerDisplay();
        break;

      case EVENTS.SET_PLAYER:
        this.gameState.currentPlayer = event.data.player;
        this.updateCurrentPlayerDisplay();
        break;

      case EVENTS.OPPONENT_SELECTION:
        if (event.data.action === "select") {
          this.showOpponentSelection(
            event.data.row,
            event.data.col,
            event.data.possibleMoves
          );
        } else {
          this.boardRenderer.clearHighlights();
        }
        break;
    }
  }

  showOpponentSelection(row, col, possibleMoves) {
    this.boardRenderer.clearHighlights();

    if (row !== null && col !== null) {
      const selectedSquare = document.querySelector(
        `[data-row="${row}"][data-col="${col}"]`
      );
      const piece = selectedSquare?.querySelector(`.${CSS_CLASSES.PIECE}`);

      if (selectedSquare) {
        selectedSquare.classList.add(CSS_CLASSES.OPPONENT_SELECTED);
      }
      if (piece) {
        piece.classList.add(CSS_CLASSES.OPPONENT_SELECTED);
      }

      possibleMoves.forEach((move) => {
        const square = document.querySelector(
          `[data-row="${move.row}"][data-col="${move.col}"]`
        );
        if (square) {
          square.classList.add(CSS_CLASSES.POSSIBLE_MOVE);
        }
      });
    }
  }
}
