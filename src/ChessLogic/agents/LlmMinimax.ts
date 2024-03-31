import {
  CellState,
  GameState,
  Move
} from "@/types/Chess"

import CompressedMinimax, { CostSetup, GameStateProgression } from "./CompressedMinimax"

import {
  CallLLM,
  ImportantTokenIDs,
  Message
} from "./LLM/types"
import ChessGame from "../ChessGame"
import _ from "lodash"


export default class LLMMinimaxAgent extends CompressedMinimax{

  private static readonly maxLLMTries = 5

  private targetSuccessorCount = 8

  private static taskIntroductionMessage:Message = {
    content: `I'd like you to help as an expert chess analyst. I'll be asking questions about games of chess.`,
    role: "system"
  }

  /**
   * Cache for game LLM generated game descriptions
   * 
   * This maps to promises because the LLM could be working on the description
   */
  private gameDescriptionCache: Map<string, Promise<Message>> = new Map()

  constructor(
    private callLLM:CallLLM,
    private importantTokenIDs: ImportantTokenIDs,
    costSetup: CostSetup
  ) {
    super(
      costSetup
    )
  }

  protected override estimateNumberOfSuccessors(game: ChessGame): number {
    return this.targetSuccessorCount
  }

  /**
   * 
   * @param cellState the state of the cell
   * @returns one character ascii representation for the cell state
   */
  private static cellStateToAsciiRepresentation(cellState: CellState): string {
    const piece = cellState.piece
    if(piece === "empty"){
      return "."
    }
    const type = piece.type
    const isWhite = piece.color === "white"

    switch(type){
      case "pawn":
        return isWhite ? "P" : "p"
      case "rook":
        return isWhite ? "R" : "r"
      case "knight":
        return isWhite ? "N" : "n"
      case "bishop":
        return isWhite ? "B" : "b"
      case "queen":
        return isWhite ? "Q" : "q"
      case "king":
        return isWhite ? "K" : "k"
    }
  }

  /**
   * 
   * @param gameState the current state of the game
   * 
   * @returns the game drawn out in ascii characters, does not include
   * a description of algebraic notation or piece count
   */
  private static gameStateToAsciiPicture(gameState: GameState): string {
    let algebraicNotation = ""
    algebraicNotation += "  a b c d e f g h\n"
    for(let row = 7; row >= 0; row--){
      let rowString = `${row + 1} `
      for(let col = 0; col < 8; col++){
        const cellState = gameState.boardState[row][col]
        rowString += LLMMinimaxAgent.cellStateToAsciiRepresentation(cellState)
        rowString += " "
      }
      rowString += `${row + 1}\n`
      algebraicNotation += rowString
    }
    return algebraicNotation
  }

  private static asciiPictureDescription = `Above is the game state in drawn out in ascii characters.

  Each piece is represented by a single character:
  White pieces: uppercase letters (K = king, Q = queen, R = rook, N = knight, B = bishop, P = pawn)
  Black pieces: lowercase letters (k = king, q = queen, r = rook, n = knight, b = bishop, p = pawn)
  `

  /**
   * 
   * @param gameState the current state of the game
   * @returns a string that describes the position of each piece on the board,
   * so it's a bit easier to understand for the LLM
   */
  private static getAllPiecePositionsAsString(gameState: GameState): string {
    const whitePiecesStrings: string[] = []
    const blackPiecesStrings: string[] = []

    for(let row = 0; row < 8; row++){
      for(let col = 0; col < 8; col++){
        const cellState = gameState.boardState[row][col]
        if(cellState.piece === "empty"){
          continue
        }
        const piece = cellState.piece

        const locationString = ChessGame.convertPositionToString([row, col])

        const pieceLocationString = `${piece.color} ${piece.type} at ${locationString}`

        if(piece.color === "white"){
          whitePiecesStrings.push(pieceLocationString)
        } else {
          blackPiecesStrings.push(pieceLocationString)
        }
      }
    }

    return `Here are the positions of the pieces:
    White pieces:
    ${whitePiecesStrings.join("\n")}
    Black pieces:
    ${blackPiecesStrings.join("\n")}
    `
  }

  /**
   * 
   * @param gameState the current state of the game
   * @returns a string representation of the move history in
   * algebraic notation
   */
  private static getMoveHistoryAsString(gameState: GameState): string {

    const moveHistoryStrings = gameState.moveHistory.map(move => 
      move.algebraic
    )

    const out = moveHistoryStrings.join(" ")

    return out
  }

  /**
   * 
   * @param gameState the current state of the game
   * 
   * @returns a string representation of the piece count for each player
   */
  private static getPieceCountAsString(gameState: GameState): string {
    const gameObject = new ChessGame(gameState)
    const pieceCount = gameObject.getPieceCount()

    const pieceCountStringified = JSON.stringify(pieceCount, null, 2)

    return `Here is the piece count for each player:
    ${pieceCountStringified}`
  }

  /**
   * Gets the representation of the game state for the LLM
   * 
   * @param gameState the current state of the game
   * 
   * @returns a string representation of the game state in algebraic notation
   * along with a description of the notation and a piece count for
   * each player.
   */
  private static getTextRepresentation(gameState: GameState): string {
    return `This is a regular game of chess. Here's what the board looks like:
    ${this.gameStateToAsciiPicture(gameState)}
    ${this.asciiPictureDescription}
    ${this.getPieceCountAsString(gameState)}
    ${this.getAllPiecePositionsAsString(gameState)}
    Here is the move history in algebraic notation:
    ${this.getMoveHistoryAsString(gameState)}

    It is the ${gameState.turn} player's turn to move.
    `
  }

  private static describeGamePrompt = `
  Please describe the game state above.

  Start by identifying the most important pieces on the board from the list above.
  
  Then look for any pieces that are in danger or any pieces that are attacking the opponent's pieces.

  Look for forks, pins, skewers, and other tactics that could be used to gain an advantage.

  Then briefly describe the implications of the position for both players.

  Format the answer as three short sets of bullet points
  `

  /**
   * 
   * @param gameState the current state of the game
   * @returns [textRepresentation, gameDescriptionMessage], where
   *  `textRepresentation` is a string representation of the game state
   *  `gameDescriptionMessage` is a message that describes the game state generated by the LLM
   */
  private async getGameDescription(gameState: GameState): Promise<[Message, Message]> {
    const gameObject = new ChessGame(gameState)
    const hash = gameObject.hashGameState()

    const textRepresentation = LLMMinimaxAgent.getTextRepresentation(gameState)

    const textRepresentationMessage:Message = {
      content: textRepresentation,
      role: "system"
    }

    if(this.gameDescriptionCache.has(hash)){
      return [  textRepresentationMessage, await this.gameDescriptionCache.get(hash)! ]
    }

    const descriptionAsPromise = new Promise<Message>(async (resolve, reject)=>{
      const messages:Message[] = [
        LLMMinimaxAgent.taskIntroductionMessage,
        textRepresentationMessage,
        {
          content: LLMMinimaxAgent.describeGamePrompt,
          role: "user"
        }
      ]

      let tries = 0
      let messageChoices = undefined
      while((!messageChoices) && tries++ < LLMMinimaxAgent.maxLLMTries){
        try{
          messageChoices = await this.callLLM(
            {
              messages,
              max_tokens: 500,
              temperature: 0.6,
              n: 1
            }
          )
        }
        catch(e){
          console.error(e)
          continue
        }
      }
      if(!messageChoices){
        reject(
          new Error("Exceeded max tries and could not get game description from LLM")
        )
        return
      }

      const gameDescriptionMessage = messageChoices[0].message as Message

      resolve(gameDescriptionMessage)
    })

    this.gameDescriptionCache.set(hash, descriptionAsPromise)

    return [ textRepresentationMessage, await descriptionAsPromise]
  }

  /**
   * Converts logprobs into a normalized probability distribution
   * 
   * @param logprobs the logprobs from the LLM
   * @returns a probability distribution over the tokens
   */
  private static normalizeLogprobs(logprobs: {token:string, logprob:number}[]): {[key:string]:number} {
    const unNormalizedProbs = logprobs.map(({token, logprob})=>({token, prob: Math.exp(logprob)}))
    const unNormalizedProbsSum = unNormalizedProbs.reduce((acc, {prob})=>acc + prob, 0)
    const normalizedProbs:{[key:string]:number} = {}
    for(const {token, prob} of unNormalizedProbs){
      normalizedProbs[token] = prob / unNormalizedProbsSum
    }
    return normalizedProbs
  }
  
  
  protected async stateEvaluation(gameState: GameState): Promise<number> {
    const [

      textRepresentationMessage,
      gameDescriptionMessage
    ] = await this.getGameDescription(gameState)

    const messages:Message[] = [
      LLMMinimaxAgent.taskIntroductionMessage,
      textRepresentationMessage,
      gameDescriptionMessage,
      {
        content: `Who is more likely to win above, black or white?
        Do not do any more explanation, just answer by typing "black" or "white".
        Don't capitalize your answer.`,
        role: "user"
      }
    ]

    let messageChoices = undefined
    let tires = 0
    while((!messageChoices) && tires++ < LLMMinimaxAgent.maxLLMTries){
      try{
        messageChoices = await this.callLLM(
          {
            messages,
            max_tokens: 1,
            temperature: 0.0,
            n: 1,
            presence_penalty: 0.0,
            frequency_penalty: 0.0,
            logit_bias: {
              [this.importantTokenIDs.black]: 100,
              [this.importantTokenIDs.white]: 100
            },
            logprobs: true,
            top_logprobs: 2+10//just in case something else comes up
          }
        )
      }
      catch(e){
        console.error(e)
        continue
      }
    }
    if(!messageChoices){
      throw new Error("Exceeded max tries and could not get game description from LLM")
    }


    const messageChoice = messageChoices[0]

    if(!messageChoice.logprobs){
      console.error("No logprobs in message choice")
      if(messageChoice.message.content === "black"){
        return -1
      } else {
        return 1
      }
    }
    const topLogprobs = messageChoice.logprobs.content[0].top_logprobs
    if(!topLogprobs){
      throw new Error("No top logprobs in message choice")
    }

    const normalizedProbs = LLMMinimaxAgent.normalizeLogprobs(topLogprobs)

    if(normalizedProbs.white === undefined || normalizedProbs.black === undefined){
      throw new Error("Black or white not in normalized probs")
    }

    return normalizedProbs.white
  }

  protected async getSuccessors(gameState: GameState): Promise<GameStateProgression[]> {
    return this.getSuccessorsInOneSingleOptionLLMCall(gameState)
  }

  /**
   * This is meant to extract the moves from llm output of the
   * llm call in getSuccessorsInOneSingleOptionLLMCall
   * 
   * @returns the moves extracted from the llm output or null if the output was not valid
   */
  private extractMovesFromMessage(validMoveMapping:Map<String,Move>, llmOutput:string):Move[]|null {
    const searchRegex = /Moves: (.*)/g

    const match = searchRegex.exec(llmOutput)
    if(match === null){
      return null
    }

    let movesString = match[1]

    const moveStrings = movesString.split(",").map(moveString=>moveString.trim())

    const moves:Move[] = []

    for(const moveString of moveStrings){
      if(validMoveMapping.has(moveString)){
        moves.push(validMoveMapping.get(moveString)!)
        continue
      }
      if(moveString[0] === "P" || moveString[0] === "p"){
        const moveStringWithoutFirstChar = moveString.slice(1)
        if(validMoveMapping.has(moveStringWithoutFirstChar)){
          moves.push(validMoveMapping.get(moveStringWithoutFirstChar)!)
          continue
        }
      }
      if(moveString==="O-O"){
        if(validMoveMapping.has("0-0")){
          moves.push(validMoveMapping.get("0-0")!)
          continue
        }
      }
      if(moveString==="O-O-O"){
        if(validMoveMapping.has("0-0-0")){
          moves.push(validMoveMapping.get("0-0-0")!)
          continue
        }
      }
    }

    if(moves.length === 0){
      return null
    }

    return moves
  }

  /**
   * Unlike the multi- option version we don't have an indication of how promising each move is
   * 
   * @param gameState 
   * @returns 
   */
  protected async getSuccessorsInOneSingleOptionLLMCall(gameState: GameState): Promise<GameStateProgression[]> {
    const [
      textRepresentationMessage,
      gameDescriptionMessage
    ] = await this.getGameDescription(gameState)

    const validMoves = new ChessGame(gameState).getAllLegalMoves(
      gameState.turn
    )

    const listOfValidMoveRepresentations = validMoves.map(move=>move.algebraic)

    const messages:Message[] = [
      LLMMinimaxAgent.taskIntroductionMessage,
      textRepresentationMessage,
      gameDescriptionMessage,
      {
        content: `What moves is the ${gameState.turn} player likely to make next?
        Both the black and white players are expert chess players.

        Select around ${this.targetSuccessorCount} moves.

        Output one or two sentences about how the description above relates to the likely moves.

        Finish your answer with "Moves: " followed by the algebraic notation of the moves you selected
        separated by commas. For example "Moves: e4, e5, Nf3"

        Choose from the following moves:
        ${listOfValidMoveRepresentations.join(", ")}
        `,
        role: "user"
      }
    ]

    

    /**
     * Maps the algebraic notation of the move to the move object
     */
    const validMoveMapping = new Map<string, Move>()
    for(const move of validMoves){
      validMoveMapping.set(move.algebraic, move)
    }

    let moves:Move[]|null = null

    let tires = 0

    //console.log(`Selecting from ${listOfValidMoveRepresentations.join(", ")}`)

    while(moves === null){
      if(tires >= LLMMinimaxAgent.maxLLMTries){
        throw new Error("Exceeded max tries and could not extract moves from LLM output")
      }
      let messageChoices
      try{
        messageChoices = await this.callLLM(
          {
            messages,
            max_tokens: 300,
            temperature: 1,
            n: 1,
          }
        )
      }
      catch(e){
        console.error(e)
        continue
      }

      const messageChoice = messageChoices[0]
      const messageContent = messageChoice.message.content
      if(!messageContent){
        throw new Error("No message content in message choice")
      }

      moves = this.extractMovesFromMessage(validMoveMapping, messageContent)
      tires++
    }

    const constantProbability = 1 / moves.length

    console.log(`Identified ${moves.length} of ${validMoves.length} valid moves`)

    const gameStateProgressions:GameStateProgression[] = moves.map(move=>({
      nextState: new ChessGame(_.cloneDeep(gameState)).makeMove(move).getGameState(),
      move,
      probability: constantProbability
    }))

    return gameStateProgressions
  }

  //! Not working, this usually only returns 8% of the available moves,
  //! It tends to output the same move multiple times
  protected async getSuccessorsInOneMultiOptionLMCall(gameState: GameState): Promise<GameStateProgression[]> {
    const [
      textRepresentationMessage,
      gameDescriptionMessage
    ] = await this.getGameDescription(gameState)

    const validMoves = new ChessGame(gameState).getAllLegalMoves(
      gameState.turn
    )

    const listOfValidMoveRepresentations = validMoves.map(move=>move.algebraic)

    const messages:Message[] = [
      LLMMinimaxAgent.taskIntroductionMessage,
      textRepresentationMessage,
      gameDescriptionMessage,
      {
        content: `What move is the ${gameState.turn} player likely to make next?
        Both the black and white players are expert chess players.

        Just output the move in algebraic notation. Do not type anything other than the move.

        Choose from the following moves:
        ${listOfValidMoveRepresentations.join(", ")}
        `,
        role: "user"
      }
    ]

    

    /**
     * Maps the algebraic notation of the move to the move object
     */
    const validMoveMapping = new Map<string, Move>()
    for(const move of validMoves){
      validMoveMapping.set(move.algebraic, move)
    }

    const messageChoices = await this.callLLM(
      {
        messages,
        max_tokens: 5,//should be enough for all move for the gpt-4 tokenizer
        temperature: 1,
        n: 40,
        logprobs: true,
        logit_bias: {
          [this.importantTokenIDs.white]: -100,
          [this.importantTokenIDs.black]: -100
        }
      }
    )

    let totalProbabilityOfValidMoves = 0

    const unNormalizedGameStateProgressions:GameStateProgression[] = []

    const selectedMoves: Set<string>= new Set()

    for(const messageChoice of messageChoices){
      const moveAlgebraic = messageChoice.message.content
      if(!moveAlgebraic){
        console.error("message.content was falsy")
        continue
      }
      if(validMoveMapping.has(moveAlgebraic)){
        if(selectedMoves.has(moveAlgebraic)){
          continue
        }
        selectedMoves.add(moveAlgebraic)
        const move = validMoveMapping.get(moveAlgebraic)!
        const game = new ChessGame(_.cloneDeep(gameState))
        game.makeMove(move)
        const newGameState = game.getGameState()

        let logProbability = 0
        if(messageChoice.logprobs === undefined){
          throw new Error("No logprobs in message choice")
        }
        for(const tokenLogprob of messageChoice.logprobs.content){
          logProbability += tokenLogprob.logprob
        }

        const unNormalizedProbability = Math.exp(logProbability)
        totalProbabilityOfValidMoves += unNormalizedProbability
        unNormalizedGameStateProgressions.push({
          nextState: newGameState,
          move: move,
          probability:unNormalizedProbability
        })
      }
    }

    const normalizedGameStateProgressions:GameStateProgression[] =
      unNormalizedGameStateProgressions.map(
        ({nextState, move, probability})=>({
          nextState,
          move,
          probability: probability / totalProbabilityOfValidMoves
        })
    )

    console.log(`Identified ${normalizedGameStateProgressions.length} of ${validMoves.length} valid moves`)

    return normalizedGameStateProgressions

  }
}