import {
  GameState,
  Move
} from "@/types/Chess"

export default interface AgentImplementation {
  selectMove(gameState: GameState): Promise<Move>
}