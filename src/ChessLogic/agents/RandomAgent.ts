import {
  GameState,
  Move
} from "@/types/Chess"

import ChessGame from "../ChessGame"
import AgentImplementation from "./AgentImplementation"


export class RandomAgent implements AgentImplementation{

  public async selectMove(gameState: GameState): Promise<Move> {
    const game = new ChessGame(gameState)
    const myColor = game.getGameState().turn
    const legalMoves = game.getAllLegalMoves(myColor)

    if(legalMoves.length === 0){
      throw new Error("No legal moves")
    }

    const randomIndex = Math.floor(Math.random() * legalMoves.length)
    return legalMoves[randomIndex]
  }

}