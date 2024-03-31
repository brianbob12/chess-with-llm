'use server'

import {
  AgentDescriptor,
  GameState,
  Move
} from "@/types/Chess"
import { RandomAgent } from "./RandomAgent"
import LLMMinimaxAgent from "./LlmMinimax"
import {
  cl100k_base_importantTokenIDs,
  gpt3_5,
  gpt4
} from "./LLM"
import { CostSetup } from "./CompressedMinimax"

/**
 * Should evaluate about 3 states
 * 
 * Since LLMminimaxAgent caches descriptions and descriptions are the expensive
 * part of the evaluation, the state evaluation cost is set really low
 * compared to the getSuccessorsCost
 */
const gpt3_5Agent = new LLMMinimaxAgent(
  gpt3_5,
  cl100k_base_importantTokenIDs,
  {
    maxDepth: 1,
    totalBudget: 500,
    getSuccessorsCost: 10,
    stateEvaluationCost: 10,
    basicMinimaxCost: 1,
  } satisfies CostSetup
)

/**
 * Should evaluate about 3 states
 * 
 * Since LLMminimaxAgent caches descriptions and descriptions are the expensive
 * part of the evaluation, the state evaluation cost is set really low
 * compared to the getSuccessorsCost
 */
const gpt4Agent = new LLMMinimaxAgent(
  gpt4,
  cl100k_base_importantTokenIDs,
  {
    maxDepth: 1,
    totalBudget: 500,
    getSuccessorsCost: 10,
    stateEvaluationCost: 10,
    basicMinimaxCost: 1,
  } satisfies CostSetup
)

export async function callGenericAgent(
  gameState: GameState,
  agent: AgentDescriptor
):Promise<Move> {

  switch(agent){
    case "random":
      const randomAgent = new RandomAgent
      return await randomAgent.selectMove(gameState)
    case "human":
      throw new Error("Human agent should not be called")
    case "minimax(gpt-3.5)":
      return await gpt3_5Agent.selectMove(gameState)
    case "minimax(gpt-4)":
      return await gpt4Agent.selectMove(gameState)
    default:
      throw new Error("Invalid agent")
  }
}