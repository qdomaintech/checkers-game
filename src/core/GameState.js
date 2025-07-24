import { PIECE_TYPES, BOARD_SIZE, PLAYER_COLORS } from "../utils/Constants.js";

export class GameState {
  constructor() {
    this.board = Array(BOARD_SIZE)
      .fill()
      .map(() => Array(BOARD_SIZE).fill(PIECE_TYPES.EMPTY));
    this.currentPlayer = PLAYER_COLORS.RED;
    this.selectedPiece = null;
    this.gameId = null;
    this.isMyTurn = false;
    this.myColor = null;
    this.myUserId = null;
    this.redPlayerId = null;
    this.blackPlayerId = null;
    this.apiEndpoint = null;
  }

  initializeBoard() {
    const state = Array(BOARD_SIZE)
      .fill()
      .map(() => Array(BOARD_SIZE).fill(PIECE_TYPES.EMPTY));

    // Place black pieces (top 3 rows)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if ((row + col) % 2 === 1) {
          state[row][col] = PIECE_TYPES.BLACK;
        }
      }
    }

    // Place red pieces (bottom 3 rows)
    for (let row = 5; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if ((row + col) % 2 === 1) {
          state[row][col] = PIECE_TYPES.RED;
        }
      }
    }

    this.board = state;
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
    this.board = boardArray.map((row) => row.map((cell) => Number(cell)));
    this.gameId = gameId;
    this.apiEndpoint = apiEndpoint;
    this.myUserId = myUserId;

    if (playerIds && playerIds.includes(",")) {
      const [redPlayerId, blackPlayerId] = playerIds.split(",");
      this.redPlayerId = redPlayerId.trim();
      this.blackPlayerId = blackPlayerId.trim();

      // Determine player color
      if (myUserId === this.redPlayerId) {
        this.myColor = PLAYER_COLORS.RED;
        this.opponentPlayerId = this.blackPlayerId;
      } else if (myUserId === this.blackPlayerId) {
        this.myColor = PLAYER_COLORS.BLACK;
        this.opponentPlayerId = this.redPlayerId;
      }

      this.opponentColor =
        this.myColor === PLAYER_COLORS.RED
          ? PLAYER_COLORS.BLACK
          : PLAYER_COLORS.RED;
    }

    // Set turn state
    this.isMyTurn = currentPlayerId === myUserId;
    this.currentPlayer =
      currentPlayerId === this.redPlayerId
        ? PLAYER_COLORS.RED
        : PLAYER_COLORS.BLACK;
  }

  makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    this.board[fromRow][fromCol] = PIECE_TYPES.EMPTY;
    this.board[toRow][toCol] = piece;

    // Handle captures
    const rowDir = Math.sign(toRow - fromRow);
    const colDir = Math.sign(toCol - fromCol);
    const distance = Math.abs(toRow - fromRow);
    let captureOccurred = false;

    if (this.isKing(piece) && distance > 1) {
      // Handle king capture
      for (let step = 1; step < distance; step++) {
        const checkRow = fromRow + rowDir * step;
        const checkCol = fromCol + colDir * step;

        if (
          this.board[checkRow][checkCol] !== PIECE_TYPES.EMPTY &&
          this.isOpponentPiece(
            this.board[checkRow][checkCol],
            this.currentPlayer
          )
        ) {
          this.board[checkRow][checkCol] = PIECE_TYPES.EMPTY;
          captureOccurred = true;
          break;
        }
      }
    } else if (!this.isKing(piece) && distance === 2) {
      // Handle regular piece capture
      const capturedRow = fromRow + rowDir;
      const capturedCol = fromCol + colDir;

      if (
        this.board[capturedRow][capturedCol] !== PIECE_TYPES.EMPTY &&
        this.isOpponentPiece(
          this.board[capturedRow][capturedCol],
          this.currentPlayer
        )
      ) {
        this.board[capturedRow][capturedCol] = PIECE_TYPES.EMPTY;
        captureOccurred = true;
      }
    }

    // Handle promotion
    if (this.shouldPromote(piece, toRow)) {
      this.board[toRow][toCol] =
        piece === PIECE_TYPES.RED
          ? PIECE_TYPES.RED_KING
          : PIECE_TYPES.BLACK_KING;
    }

    return captureOccurred;
  }

  isKing(piece) {
    return piece === PIECE_TYPES.RED_KING || piece === PIECE_TYPES.BLACK_KING;
  }

  shouldPromote(piece, row) {
    return (
      (piece === PIECE_TYPES.RED && row === 0) ||
      (piece === PIECE_TYPES.BLACK && row === BOARD_SIZE - 1)
    );
  }

  isOpponentPiece(piece, currentPlayer) {
    const isRed = piece === PIECE_TYPES.RED || piece === PIECE_TYPES.RED_KING;
    return currentPlayer === PLAYER_COLORS.RED ? !isRed : isRed;
  }

  switchPlayer() {
    this.currentPlayer =
      this.currentPlayer === PLAYER_COLORS.RED
        ? PLAYER_COLORS.BLACK
        : PLAYER_COLORS.RED;

    // For standalone play, always allow current player to move
    // For multiplayer games, this will be overridden by setBoardState
    if (!this.gameId) {
      this.isMyTurn = true;
      this.myColor = this.currentPlayer;
    } else {
      this.isMyTurn = this.currentPlayer === this.myColor;
    }
  }
}
