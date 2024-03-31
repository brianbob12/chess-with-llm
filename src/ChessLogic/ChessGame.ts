import {
  CellState,
  EndgameState,
  GameState,
  initialGameState,
  Move,
  Piece,
  PieceCount,
  PlayerColor
} from "@/types/Chess";

import _ from "lodash";

export default class ChessGame{

  static readonly linearDirections:[number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]

  static readonly diagonalDirections:[number, number][] = [
    [1, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
  ]

  static readonly knightDirections:[number, number][] = [
    [2, 1],
    [2, -1],
    [-2, 1],
    [-2, -1],
    [1, 2],
    [1, -2],
    [-1, 2],
    [-1, -2]
  ]

  constructor(
    private gameState: GameState = initialGameState
  ){

  }

  /**
   * 
   * @returns a deep copy of the current game state
   */
  public getGameState(){
    return _.cloneDeep(this.gameState)
  }

  public makeMove(
    move:Move
  ):ChessGame{
    const fromCellState = this.gameState.boardState[move.from[0]][move.from[1]]
    if(fromCellState.piece === "empty"){
      throw new Error(`Failed to make move, ${move.algebraic}: No piece to move`)
    }
    const piece:Piece = fromCellState.piece
    if(piece.color !== this.gameState.turn){
      throw new Error(`Failed to make move, ${move.algebraic} Not your turn`)
    }

    if( move.enPassant ){
      this.executeEnPassant(move)
      return this
    }

    if( move.castling ){
      this.executeCastling(move)
      return this
    }

    this.addMoveToHistory(move)
    this.movePieceAccordingToMove(move)
    this.flipTurn()
    return this
  }

  private addMoveToHistory(move:Move){
    this.gameState.moveHistory.push(move)
    return this
  }

  private movePieceAccordingToMove(move:Move){
    const fromCellState = this.gameState.boardState[move.from[0]][move.from[1]]
    if(fromCellState.piece === "empty"){
      throw new Error("No piece to move")
    }

    let pieceToPutInToCell:Piece = fromCellState.piece
    pieceToPutInToCell.hasMoved = true

    if(move.isPawnMoving2){
      pieceToPutInToCell.justMoved2 = true
    }
    else{
      pieceToPutInToCell.justMoved2 = false
    }

    if(move.promotion){
      pieceToPutInToCell = {
        type: move.promotion,
        color: this.gameState.turn,
        hasMoved: true,
      }
    }

    this.gameState.boardState[move.to[0]][move.to[1]] = {
      piece: pieceToPutInToCell
    }

    this.gameState.boardState[move.from[0]][move.from[1]].piece = "empty"
  }

  private flipTurn(){
    this.gameState.turn = this.gameState.turn === "white" ? "black" : "white"
  }

  /**
   * 
   * Takes the extra pawn that was moved two squares forward
   * 
   * The move object should have the enPassant property set to true
   * 
   * This will fully execute the en passant move
   * 
   * @param move the move to execute
   */
  private executeEnPassant(
    move:Move
  ){
    //White starts from a low index and black starts from a high index
    //so if white is taking a black pawn, the direction of the captured pawn is -1,
    //(towards the top of the board)
    const directionOfCapturedPawn = this.gameState.turn === "white" ? -1 : 1

    const capturedPawnRow = move.to[0] + directionOfCapturedPawn
    const capturedPawnCol = move.to[1]

    const capturedPawnCellState = this.gameState.boardState[capturedPawnRow][capturedPawnCol]

    if(capturedPawnCellState.piece === "empty"){
      throw new Error("No piece to capture")
    }

    capturedPawnCellState.piece = "empty"

    this.addMoveToHistory(move)
    this.movePieceAccordingToMove(move)
    this.flipTurn()
  }

  private executeCastling(
    move:Move
  ){
    const row = move.from[0]

    const rookStartCol = move.to[1] === 6 ? 7 : 0
    const rookEndCol = move.to[1] === 6 ? 5 : 3

    const rookCellState = this.gameState.boardState[row][rookStartCol]

    this.addMoveToHistory(move)
    
    //move rook
    this.gameState.boardState[row][rookEndCol].piece = rookCellState.piece
    this.gameState.boardState[row][rookStartCol].piece = "empty"
    
    //move king
    this.movePieceAccordingToMove(move)
    
    this.flipTurn()
  }

  /**
   * Gets all legal moves for a piece in a given position
   * 
   * @param position the start position of the piece to move
   * @returns a list of all legal moves for the piece at the given position
   */
  public getMovesFromPosition(
    position:[number, number]
  ):Move[]{
    const cellState = this.gameState.boardState[position[0]][position[1]]
    if(cellState.piece === "empty"){
      return []
    }
    const piece = cellState.piece

    switch(piece.type){
      case "pawn":
        return this.getPawnMoves(position)
      case "rook":
        return this.getRookMoves(position)
      case "knight":
        return this.getKnightMoves(position)
      case "bishop":
        return this.getBishopMoves(position)
      case "queen":
        return this.getQueenMoves(position)
      case "king":
        return this.getKingMoves(position)
    }
  }

  /**
   * 
   * @param color the color of the player to move
   * @returns all legal moves for the player to move
   * this excludes moves that would put the player in check
   */
  public getAllLegalMoves(
    color:PlayerColor
  ):Move[]{
    const moves:Move[] = []

    for(let row = 0; row < 8; row++){
      for(let col = 0; col < 8; col++){
        const cellState = this.gameState.boardState[row][col]
        if(cellState.piece !== "empty" && cellState.piece.color === color){
          const pieceMoves = this.getMovesFromPosition([row, col])
          for(const move of pieceMoves){
            if(!this.doesMovePutMovingPlayerInCheck(move)){
              moves.push(move)
            }
          }
        }
      }
    }

    return moves
  }

  //cell utilities

  private static getPosInDirection(
    position:[number, number],
    direction:[number, number]
  ):[number,number] | undefined{
    const newRow = position[0] + direction[0]
    const newCol = position[1] + direction[1]
    if(newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7){
      return undefined
    }
    return [newRow, newCol]
  }

  private isCellEmpty(
    position:[number, number]
  ):boolean{
    return this.gameState.boardState[position[0]][position[1]].piece === "empty"
  }

  private isCellEnemy(
    position:[number, number],
    color:PlayerColor
  ):boolean{
    const cellState = this.gameState.boardState[position[0]][position[1]]
    return cellState.piece !== "empty" && cellState.piece.color !== color
  }

  private getPawnMoves(
    position:[number, number]
  ):Move[]{
    const cellState = this.gameState.boardState[position[0]][position[1]]
    const piece = cellState.piece
    if(piece === "empty" || piece.type !== "pawn"){
      throw new Error("Not a pawn: can't move like a pawn")
    }

    const direction = piece.color === "white" ? 1 : -1

    const moves:Move[] = []

    const forwardPos = ChessGame.getPosInDirection(position, [direction, 0])
    const leftDiagonalPos = ChessGame.getPosInDirection(position, [direction, -1])
    const rightDiagonalPos = ChessGame.getPosInDirection(position, [direction, 1])

    if(forwardPos && this.isCellEmpty(forwardPos)){
      moves.push(
        this.annotateMove({
        from: position,
        to: forwardPos,
      }))

      if(!piece.hasMoved){

        const doubleForwardCell = ChessGame.getPosInDirection(
          position, [direction * 2, 0]
        )
        if(doubleForwardCell && this.isCellEmpty(doubleForwardCell)){
          moves.push(
            this.annotateMove({
            from: position,
            to: doubleForwardCell,
            isPawnMoving2: true,
          }))
        }
      }
    }

    if(
      leftDiagonalPos && this.isCellEnemy(leftDiagonalPos, piece.color)
    ){
      moves.push(
        this.annotateMove({
        from: position,
        to: leftDiagonalPos,
      }))
    }

    if(
      rightDiagonalPos &&
      this.isCellEnemy(rightDiagonalPos, piece.color)
    ){
      moves.push(
        this.annotateMove({
        from: position,
        to: rightDiagonalPos,
      }))
    }

    //check for en passant
    if(
      (piece.color === "white" && position[0] === 4) ||
      (piece.color === "black" && position[0] === 3)
    ){
      const leftPos = ChessGame.getPosInDirection(position, [0, -1])
      const rightPos = ChessGame.getPosInDirection(position, [0, 1])
      if(leftPos){
        const leftCell = this.gameState.boardState[leftPos[0]][leftPos[1]]
        if(
          leftCell.piece !== "empty" &&
          leftCell.piece.type === "pawn" &&
          leftCell.piece.color !== piece.color &&
          leftCell.piece.justMoved2
        ){
          moves.push(
            this.annotateMove({
            from: position,
            to: leftDiagonalPos!,
            enPassant: true,
          }))
        }
      }
      if(rightPos){
        const rightCell = this.gameState.boardState[rightPos[0]][rightPos[1]]
        if(
          rightCell.piece !== "empty" &&
          rightCell.piece.type === "pawn" &&
          rightCell.piece.color !== piece.color &&
          rightCell.piece.justMoved2
        ){
          moves.push(
          this.annotateMove({
            from: position,
            to: rightDiagonalPos!,
            enPassant: true,
          }))
        }
      }
    }

    return moves
  }

  /**
   * Returns all possible moves for a piece assume it can move
   * in a straight line in the given direction
   * 
   * Will stop when it hits a piece or the edge of the board or an enemy piece
   * 
   * @param startPosition the starting position of the piece
   * @param direction the direction to move in
   */
  private getMovesInDirection(
    startPosition:[number, number],
    direction:[number, number]
  ):Move[]{
    const moves:Move[] = []

    const startingCellState = this.gameState.boardState[startPosition[0]][startPosition[1]]

    if(startingCellState.piece === "empty"){
      throw new Error("No piece to move")
    }

    const piece = startingCellState.piece

    let newPos = ChessGame.getPosInDirection(startPosition, direction)
    while(newPos){
      if(this.isCellEmpty(newPos)){
        moves.push(
        this.annotateMove({
          from: startPosition,
          to: newPos,
        })
        )
      }
      else if(this.isCellEnemy(newPos, piece.color)){
        moves.push(
        this.annotateMove({
          from: startPosition,
          to: newPos,
        }))
        break
      }
      else{
        break
      }
      newPos = ChessGame.getPosInDirection(newPos, direction)
    }

    return moves
  }

  private getRookMoves(
    position:[number, number]
  ):Move[]{
    const cellState = this.gameState.boardState[position[0]][position[1]]
    const piece = cellState.piece
    if(piece === "empty"){
      throw new Error("Cell is empty: don't know what pieces are enemies")
    }

    const moves = []
    for(const direction of ChessGame.linearDirections){
      moves.push(
        ...this.getMovesInDirection(position, direction)
      )
    }

    return moves
  }

  private getBishopMoves(
    position:[number, number]
  ):Move[]{
    const cellState = this.gameState.boardState[position[0]][position[1]]
    const piece = cellState.piece
    if(piece === "empty"){
      throw new Error("Cell is empty: don't know what pieces are enemies")
    }

    const moves = []

    for(const direction of ChessGame.diagonalDirections){
      moves.push(
        ...this.getMovesInDirection(position, direction)
      )
    }

    return moves
  }

  private getQueenMoves(
    position:[number, number]
  ):Move[]{
    const cellState = this.gameState.boardState[position[0]][position[1]]
    const piece = cellState.piece
    if(piece === "empty"){
      throw new Error("Cell is empty: don't know what pieces are enemies")
    }

    const moves = []

    for(const direction of ChessGame.linearDirections){
      moves.push(
        ...this.getMovesInDirection(position, direction)
      )
    }
    for(const direction of ChessGame.diagonalDirections){
      moves.push(
        ...this.getMovesInDirection(position, direction)
      )
    }

    return moves
  }

  private getKnightMoves(
    position:[number, number]
  ):Move[]{
    const cellState = this.gameState.boardState[position[0]][position[1]]
    const piece = cellState.piece
    if(piece === "empty"){
      throw new Error("Cell is empty: don't know what pieces are enemies")
    }

    const moves = []
    const directions:[number,number][] = [
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
      [1, 2],
      [1, -2],
      [-1, 2],
      [-1, -2]
    ]

    for(const direction of directions){
      const newPos = ChessGame.getPosInDirection(position, direction)
      if(newPos){
        if(this.isCellEmpty(newPos) || this.isCellEnemy(newPos, piece.color)){
          moves.push(
          this.annotateMove({
            from: position,
            to: newPos,
          }))
        }
      }
    }

    return moves
  }

  private getKingMoves(
    position:[number, number]
  ):Move[]{
    const cellState = this.gameState.boardState[position[0]][position[1]]
    const piece = cellState.piece
    if(piece === "empty" || piece.type !== "king"){
      throw new Error("Not a king")
    }

    const moves:Move[] = []

    //normal moves
    const directions:[number,number][] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]

    for(const direction of directions){
      const newPos = ChessGame.getPosInDirection(position, direction)
      if(newPos){
        if(this.isCellEmpty(newPos) || this.isCellEnemy(newPos, piece.color)){
        moves.push(
            this.annotateMove({
            from: position,
            to: newPos,
          }))
        }
      }
    }

    if(piece.hasMoved){
      return moves
    }

    //castling

    const row = position[0]

    //check left
    const leftRookCellState = this.gameState.boardState[row][0]
    if(leftRookCellState.piece !== "empty" && !leftRookCellState.piece.hasMoved){
      //check if the cells between the king and the rook are empty
      let canCastle = true
      if(this.gameState.boardState[row][1].piece !== "empty"){
        canCastle = false
      }
      if(this.gameState.boardState[row][2].piece !== "empty"){
        canCastle = false
      }
      if(this.gameState.boardState[row][3].piece !== "empty"){
        canCastle = false
      }
      if(canCastle){
        moves.push(
          this.annotateMove({
          from: position,
          to: [row, 2],
          castling: true,
        }))
      }
    }

    //check right
    const rightRookCellState = this.gameState.boardState[row][7]
    if(rightRookCellState.piece !== "empty" && !rightRookCellState.piece.hasMoved){
      //check if the cells between the king and the rook are empty
      let canCastle = true
      if(this.gameState.boardState[row][5].piece !== "empty"){
        canCastle = false
      }
      if(this.gameState.boardState[row][6].piece !== "empty"){
        canCastle = false
      }
      if(canCastle){
        moves.push(
          this.annotateMove({
          from: position,
          to: [row, 6],
          castling: true,
        }))
      }
    }

    return moves
  }

  private getKingPosition(
    color:PlayerColor
  ):[number, number]{
    for(let row = 0; row < 8; row++){
      for(let col = 0; col < 8; col++){
        const cellState = this.gameState.boardState[row][col]
        if(cellState.piece !== "empty" && cellState.piece.type === "king" && cellState.piece.color === color){
          return [row, col]
        }
      }
    }
    throw new Error("King not found")
  }

  private isCheck(
    color:PlayerColor
  ):boolean{
    const kingPosition = this.getKingPosition(color)

    //pretend the king can move in all directions (including knight moves)
    //and see if it can be captured

    const linearDirectionMoves = this.getRookMoves(kingPosition)
    for(const move of linearDirectionMoves){
      const toCellState = this.gameState.boardState[move.to[0]][move.to[1]]
      const piece = toCellState.piece
      if(piece === "empty"){
        continue
      }
      if(piece.color !== color){
        if(piece.type === "rook" || piece.type === "queen"){
          return true
        }
      }
    }

    const diagonalDirectionMoves = this.getBishopMoves(kingPosition)
    for(const move of diagonalDirectionMoves){
      const toCellState = this.gameState.boardState[move.to[0]][move.to[1]]
      const piece = toCellState.piece
      if(piece === "empty"){
        continue
      }
      if(piece.color !== color){
        if(piece.type === "bishop" || piece.type === "queen"){
          return true
        }
        if(piece.type === "pawn"){
          if(color === "white"){
            //black pawns move(up the board) in the negative direction
            if(move.to[0] === kingPosition[0] + 1){
              return true
            }
          }
          else{
            //white pawns move(down the board) in the positive direction
            if(move.to[0] === kingPosition[0] - 1){
              return true
            }
          }
        }
      }
    }

    const knightMoves = this.getKnightMoves(kingPosition)
    for(const move of knightMoves){
      const toCellState = this.gameState.boardState[move.to[0]][move.to[1]]
      const piece = toCellState.piece
      if(piece === "empty"){
        continue
      }
      if(piece.color !== color && piece.type === "knight"){
        return true
      }
    }

    return false
  }

  public doesMovePutMovingPlayerInCheck(
    move:Move
  ):boolean{
    const hypotheticalGameState = _.cloneDeep(this.gameState)
    const hypotheticalGame = new ChessGame(hypotheticalGameState)
    hypotheticalGame.makeMove(move)
    return hypotheticalGame.isCheck(this.gameState.turn)
  }

  public getPieceCount():PieceCount{
    const pieceCount:PieceCount = {
      white: {
        pawn: 0,
        rook: 0,
        knight: 0,
        bishop: 0,
        queen: 0,
        king: 0
      },
      black: {
        pawn: 0,
        rook: 0,
        knight: 0,
        bishop: 0,
        queen: 0,
        king: 0
      }
    }

    for(const row of this.gameState.boardState){
      for(const cellState of row){
        if(cellState.piece === "empty"){
          continue
        }
        const piece = cellState.piece
        const color = piece.color
        switch(piece.type){
          case "pawn":
            pieceCount[color].pawn++
            break
          case "rook":
            pieceCount[color].rook++
            break
          case "knight":
            pieceCount[color].knight++
            break
          case "bishop":
            pieceCount[color].bishop++
            break
          case "queen":
            pieceCount[color].queen++
            break
          case "king":
            pieceCount[color].king++
            break
        }
      }
    }

    return pieceCount
  }

  /**
   * 
   * @returns true if the game is in a terminal state
   */
  public isTerminal():boolean{
    const moves = this.getAllLegalMoves(this.gameState.turn)
    return moves.length === 0
  }

  public isCheckmate(
    color:PlayerColor
  ):boolean{
    if(!this.isCheck(color)){
      return false
    }

    const allLegalMoves = this.getAllLegalMoves(color)
    return allLegalMoves.length === 0
  }

  public getEndgameState():EndgameState{
    if(!this.isTerminal()){
      return "inProgress"
    }
    if(this.isCheckmate("white")){
      return "checkmateWhite"
    }
    if(this.isCheckmate("black")){
      return "checkmateBlack"
    }
    return "draw"
  }

  private hashCellState(cellState:CellState){
    if(cellState.piece === "empty"){
      return "empty"
    }
    const piece = cellState.piece
    let out = `${piece.color}_${piece.type}_${piece.hasMoved}`
    if(piece.type === "pawn"){
      out += `_${piece.justMoved2}`
    }
  }

  /**
   * deterministically hashes the game state
   * 
   * @returns a string hash of the game state
   */
  public hashGameState():string{
    const gameState = this.gameState
    let hash = `${gameState.turn},`
    for(const row of gameState.boardState){
      for(const cellState of row){
        hash += this.hashCellState(cellState)
        hash+= ","
      }
    }
    //remove trailing comma
    hash = hash.slice(0, -1)
    return hash
  }

  public static convertPositionToString(position: [number, number]): string {
    const [row, col] = position
    const rowString = (row + 1).toString()
    const colString = String.fromCharCode("a".charCodeAt(0) + col)
    return `${colString}${rowString}`
  }

  private static convertPieceTypeToChar(pieceType:Piece["type"]):string{
    switch(pieceType){
      case "pawn":
        return ""
      case "rook":
        return "R"
      case "knight":
        return "N"
      case "bishop":
        return "B"
      case "queen":
        return "Q"
      case "king":
        return "K"
    }
  }

  /**
   * Gets a move in algebraic notation (e.g. e4, Nf3, etc.)
   * considering the current game state and annotates it to
   * the move
   * 
   * @param move a move without the algebraic notation
   * 
   * 
   */
  private annotateMove(move:Omit<Move,"algebraic">):Move{
    if(move.castling){
      return this.annotateCastlingMove(move)
    }

    const cellStateAtFromPos = this.gameState.boardState[move.from[0]][move.from[1]]
    if(cellStateAtFromPos.piece === "empty"){
      throw new Error("No piece to move")
    }
    const pieceMoving = cellStateAtFromPos.piece

    const cellStateAtToPos = this.gameState.boardState[move.to[0]][move.to[1]]

    let capturing = false
    const pieceAtToPos = cellStateAtToPos.piece
    if(pieceAtToPos !== "empty"){
      capturing = true
    }

    let pieceType = pieceMoving.type
    let pieceChar = ChessGame.convertPieceTypeToChar(pieceType)

    const toPositionString = ChessGame.convertPositionToString(move.to)

    const capturingChar = capturing ? "x" : ""

    const promotionChar = move.promotion ?
      `=${ChessGame.convertPieceTypeToChar(move.promotion)}`
      : ""

    let algebraicNotation = `${pieceChar}${capturingChar}${toPositionString}${promotionChar}`

    return {
      ...move,
      algebraic: algebraicNotation
    }
  }

  private annotateCastlingMove(move:Omit<Move,"algebraic">):Move{
    if(move.castling){
      if(move.to[1] === 2){
        return {
          ...move,
          algebraic: "0-0-0"
        }
      }
      else{
        return {
          ...move,
          algebraic: "0-0"
        }
      }
    }
    throw new Error("Not a castling move")
  }
}