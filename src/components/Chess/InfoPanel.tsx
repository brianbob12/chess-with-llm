import ChessGame from "@/ChessLogic/ChessGame"
import TurnPill from "./TurnPill"
import AgentSelector from "./AgentSelector"
import { AgentDescriptor } from "@/types/Chess"

type InfoPanelProps = {
  game: ChessGame,
  whiteAgent: AgentDescriptor,
  setWhiteAgent: (agent: AgentDescriptor) => void,
  blackAgent: AgentDescriptor,
  setBlackAgent: (agent: AgentDescriptor) => void
  onClear: () => void
}

/**
 * 
 * @param
 */
export default function InfoPanel({
  game,
  whiteAgent,
  setWhiteAgent,
  blackAgent,
  setBlackAgent,
  onClear
}:InfoPanelProps) {
  const gameState = game.getGameState()
  return(
    <div
      className = "rounded-lg shadow-lg p-4"
    >
      <div
        className="flex flex-col items-center justify-center space-y-4"
      >
        <div>
          <TurnPill
            nextPlayerToMove={gameState.turn}
          />
        </div>
        <div>
          <span>
            WHITE AGENT
          </span>
          <AgentSelector
            agent={whiteAgent}
            setAgent={setWhiteAgent}
          />
        </div>
        <div>
          <span>
            BLACK AGENT
          </span>
          <AgentSelector
            agent={blackAgent}
            setAgent={setBlackAgent}
          />
        </div>
        <div>
          <button
            className={`flex items-center font-mono font-bold
            rounded border border-black py-2 px-4 hover:bg-black hover:text-white transition duration-300`}
            onClick={onClear}
          >
            CLEAR
          </button>
        </div>
      </div>
    </div>
  )
}