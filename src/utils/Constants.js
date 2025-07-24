export const PIECE_TYPES = {
  EMPTY: 0,
  RED: 1,
  BLACK: 2,
  RED_KING: 3,
  BLACK_KING: 4,
};

export const PLAYER_COLORS = {
  RED: "red",
  BLACK: "black",
};

export const BOARD_SIZE = 8;

export const CSS_CLASSES = {
  SQUARE: "square",
  PIECE: "piece",
  SELECTED: "selected",
  HIGHLIGHTED: "highlighted",
  POSSIBLE_MOVE: "possible-move",
  MUST_CAPTURE: "must-capture",
  DARK: "dark",
  LIGHT: "light",
  KING: "king",
  OPPONENT_SELECTED: "opponent-selected",
};

export const EVENTS = {
  CHECKERS_READY: "checkers-ready",
  CHECKERS_MOVE: "checkers-move",
  CHECKERS_SELECTION: "checkers-selection",
  SET_BOARD_STATE: "set-board-state",
  RESET_GAME: "reset-game",
  SET_PLAYER: "set-player",
  OPPONENT_SELECTION: "opponent-selection",
};
