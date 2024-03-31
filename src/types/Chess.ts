export type PieceType = "pawn" | "rook" | "knight" | "bishop" | "queen" | "king"

export type PlayerColor = "white" | "black"

/**
 * Represents a chess piece
 * 
 * `type` is the type of the piece
 * 
 * `color` is the color of the piece
 * 
 * `hasMoved` is true if the piece has moved at least once
 * 
 * `justMoved2` is defined only for pawns true if the piece has only moved 2 squares
 */
export type Piece = {
  type: PieceType,
  color: PlayerColor,
  hasMoved: boolean,
  justMoved2?: boolean
}

export type CellState = {
  piece: Piece | "empty",
}

export const blankCell: CellState = {
  piece: "empty",
}

/**
 * Represents the state of a chess game
 * 
 * `turn` is the color of the player whose turn it is
 * 
 * `boardState` is an 8x8 array of `CellState` objects
 * It is a list of rows, where each row is a list of `CellState` objects
 * 
 * White is always at the top(low index) and black is always at the bottom(high index
 */
export type GameState= {
  turn:"white" | "black"
  boardState: CellState[][] // 8*8 cells
  moveHistory: Move[]
}

export const initialGameState: GameState = {
  turn: "white",
  boardState: [
    // First rank (white back row)
    [
      {piece:{ type: "rook", color: "white", hasMoved: false }},
      {piece:{ type: "knight", color: "white", hasMoved: false }},
      {piece:{ type: "bishop", color: "white", hasMoved: false }},
      {piece:{ type: "queen", color: "white", hasMoved: false }},
      {piece:{ type: "king", color: "white", hasMoved: false }},
      {piece:{ type: "bishop", color: "white", hasMoved: false }},
      {piece:{ type: "knight", color: "white", hasMoved: false }},
      {piece: {type: "rook", color: "white", hasMoved: false }},
    ],
    // Second rank (white pawns)
    Array.from({ length: 8 }, () => (
      {piece: { type: "pawn", color: "white", hasMoved: false }}
    )),
    // Empty ranks in between (third to sixth)
    ...Array.from({ length: 4 }, () =>
      Array.from({ length: 8 }, () => blankCell)
    ),
    // Seventh rank (black pawns)
    Array.from({ length: 8 }, () => (
      {piece:{ type: "pawn", color: "black", hasMoved: false }})),
    // Eighth rank (black back row)
    [
      {piece: { type: "rook", color: "black", hasMoved: false }},
      {piece: { type: "knight", color: "black", hasMoved: false }},
      {piece: { type: "bishop", color: "black", hasMoved: false }},
      {piece: { type: "queen", color: "black", hasMoved: false }},
      {piece: { type: "king", color: "black", hasMoved: false }},
      {piece: { type: "bishop", color: "black", hasMoved: false }},
      {piece: { type: "knight", color: "black", hasMoved: false }},
      {piece: { type: "rook", color: "black", hasMoved: false }},
    ],
  ],
  moveHistory: [],
};


/**
 * Represents a move in chess
 * 
 * `from` is the position of the piece to move
 * as a tuple of [row, col]
 * 
 * `to` is the position to move the piece to
 * as a tuple of [row, col]
 * 
 * `algebraic` is the algebraic notation of the move
 * 
 * `enPassant` is true if the move is an en passant capture,
 * if this is true
 * the from position is the position of the capturing pawn and the to position
 * is the position of the new position of the capturing pawn
 * 
 * `castling` is true if the move is a castle move
 * if this is true the from position is the position of the king and the to position
 * is the position of the new position of the king
 * 
 * `isPawnMoving2` is true if the move is a pawn moving 2 squares
 * 
 * `promotion` is the piece type to promote to if the move is a promotion
 * if this is not set the move is not a promotion
 */
export type Move = {
  from: [number,number],  
  to: [number, number],
  algebraic: string,
  enPassant?: boolean,
  castling?: boolean,
  isPawnMoving2?: boolean,
  promotion?: PieceType
}


type PieceCountForOnePlayer = {
  pawn: number,
  rook: number,
  knight: number,
  bishop: number,
  queen: number,
  king: number
}

export type PieceCount = {
  white: PieceCountForOnePlayer,
  black: PieceCountForOnePlayer
}

export type AgentDescriptor = "human" | "random" | "minimax(gpt-3.5)" | "minimax(gpt-4)"

export const allAgents: AgentDescriptor[] = ["human", "random", "minimax(gpt-3.5)", "minimax(gpt-4)"]

/**
 * Represents the endgame state of a chess game
 * 
 * `checkmateWhite` is true if white is in checkmate
 * `checkmateBlack` is true if black is in checkmate
 * 
 * `stalemate` is true if the game is in stalemate
 * 
 * `inProgress` is true if the next player can make a move
 * 
 */
export type EndgameState = "checkmateWhite"| "checkmateBlack" | "draw" | "inProgress"