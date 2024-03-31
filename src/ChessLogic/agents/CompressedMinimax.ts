import { GameState, Move } from "@/types/Chess"
import AgentImplementation from "./AgentImplementation"
import ChessGame from "../ChessGame"
import { logMinimaxIter } from "@/utils/logging"

type CacheEntry = {
  computedValue: number,
  budget: number
}

/**
 * A cache entry for a value that may not have been computed yet
 */
type PendingCacheEntry = {
  computedValue: Promise<number>,
  budget: number
}

/**
 * The cost setup for the minimax algorithm
 * 
 * @param maxDepth the maximum depth of the tree search, overrides totalBudget
 * 
 * @param totalBudget the total budget for the minimax algorithm
 * 
 * @param stateEvaluationCost the cost of evaluating a single state
 * 
 * @param getSuccessorsCost the cost of getting the successors of a state
 * 
 * @param basicMinimaxCost the cost of a single iteration of the minimax algorithm
 * excluding the cost of evaluating the state and getting the successors
 */
export type CostSetup = {
  maxDepth: number,
  totalBudget: number,
  stateEvaluationCost: number,
  getSuccessorsCost: number,
  basicMinimaxCost: number
}

/**
 * The result of a single iteration of the minimax algorithm
 * 
 * @param computedValue the value computed by the minimax algorithm
 * @param usedBudget the amount of budget used in this iteration,
 * this may be less than the budget passed to the function
 */
type MinimaxIterationResult = {
  computedValue: number,
  usedBudget: number,
}

/**
 * A progression from one game state to another
 * 
 * @nextState the next state of the game
 * @move the move that was made to get to the next state
 * @probability a normalized score for how likely/good this progression is
 */
export type GameStateProgression = {
  nextState: GameState,
  move: Move,
  probability: number
}

export default abstract class CompressedMinimax implements AgentImplementation{
  
  /**
   * We'll use the cached'd value if
   * the cached result was computed with a larger budget
   * or
   * the difference between
   * the requested budget and the cached budget is less than this value
   */
  private budgetCacheTolerance = 0.1

  /**
   * A map from the string representation of the game state to the minimaxCache entry
   * 
   * The map directs to promises to avoid the minimax being computed multiple times
   * at the same time
   */
  private minimaxCache: Map<string, PendingCacheEntry> = new Map()

  /**
   * A map from the string representation of the game state to 
   * the successors of that state
   * 
   * The map directs to promises to avoid the successors being computed multiple times
   * at the same time
   */
  private successorsCache: Map<string, Promise<GameStateProgression[]>> = new Map()

  /**
   * Should minimax calls be run in parallel
   * 
   * This is sometime set to false to resolve rate limit issues
   */
  private parallel: boolean = true

  /**
   * 
   * @param costSetup the cost setup for the minimax algorithm
   * this specifies when to stop the tree search and do static evaluation
   * 
   * excluding the cost of evaluating the state and getting the successors
   */
  constructor(
    private costSetup:CostSetup
  ) {
  }

  private addToMinimaxCache(gameHash: string, entry: PendingCacheEntry):void {
    if(this.minimaxCache.has(gameHash)){
      const existingEntry = this.minimaxCache.get(gameHash)!
      if(existingEntry.budget > entry.budget){
        return
      }
    }
    this.minimaxCache.set(gameHash, entry)
  }

  public async selectMove(gameState: GameState): Promise<Move> {
    const maximizingPlayer = gameState.turn === "white"
    let budget = this.costSetup.totalBudget

    const game = new ChessGame(gameState)

    let successorsPromise = this.successorsCache.get(game.hashGameState())

    if(successorsPromise === undefined){
      successorsPromise =  this.getSuccessors(gameState)
      budget -= this.costSetup.getSuccessorsCost
      this.successorsCache.set(game.hashGameState(), successorsPromise)
    }
    const successors = await successorsPromise

    //the first option is always parallel for now
    const subnodeExplorations: Promise<MinimaxIterationResult&{move:Move}>[] = []

    if(successors.length === 0){
      throw new Error("No successors found")
    }

    for(const successor of successors){
      const thisNodeBudget = budget * successor.probability
      subnodeExplorations.push( new Promise(async (resolve,reject) => {
        try{
          const result = await this.minimax(
            1,
            successor.nextState,
            thisNodeBudget,
            -Infinity,
            Infinity,
            !maximizingPlayer
          )
          resolve({
            move: successor.move,
          ...result
          })
          return
        }
        catch(e){
          reject(e)
        }
      }))
    }

    const results = await Promise.all(subnodeExplorations)

    const totalBudgetUsage = results.reduce((acc, val) => acc + val.usedBudget, 0)

    const move:(MinimaxIterationResult&{move:Move}) = maximizingPlayer ?
      results.reduce((prev, current) => prev.computedValue > current.computedValue ? prev : current) :
      results.reduce((prev, current) => prev.computedValue < current.computedValue ? prev : current)

    console.log(`Found move: ${move.move.algebraic}\tTotal budget usage: ${totalBudgetUsage}`)
      
    return move.move
  }

  /**
   * This function should be cheap to compute.
   * This is used for cost projection in minimax
   * 
   * This will not be run if the number of successors is cached
   * so there's no need for this to check the successors cache
   * 
   * @param game the chess game object
   * 
   * @returns an estimate of the number of possible next states 
   * that'll be explored in the next iteration (return of getSuccessors)
   */
  protected estimateNumberOfSuccessors(game: ChessGame): number {
    return 10
  }


  //NOTE white is maximizing player, black is minimizing player

  private async minimax(
    depth: number,
    gameState: GameState,
    budget: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean
  ): Promise<MinimaxIterationResult> {
    const game = new ChessGame(gameState)
    const gameHash = game.hashGameState()
    let usedBudget = 0

    //Check if the value is already cached
    if(this.minimaxCache.has(gameHash)){
      const cacheResult:PendingCacheEntry = this.minimaxCache.get(gameHash)!
      if(
        cacheResult.budget >= budget ||
        Math.abs(cacheResult.budget - budget) < this.budgetCacheTolerance
      ){
        return {
          computedValue: await cacheResult.computedValue,
          usedBudget
        }
      }
    }

    //check if the game is in an endgame state
    usedBudget += this.costSetup.basicMinimaxCost
    const endgameState = game.getEndgameState()
    if(endgameState === "checkmateWhite"){
      this.addToMinimaxCache(gameHash,{
        computedValue: Promise.resolve(-1),
        budget: usedBudget
      })
      return {
        computedValue: -1,
        usedBudget
      }
    }
    if(endgameState === "checkmateBlack"){
      this.addToMinimaxCache(gameHash, {
        computedValue: Promise.resolve(1),
        budget: usedBudget
      })
      return {
        computedValue: 1,
        usedBudget
      }
    }

    //from here we know we'll have to do some expensive computation
    //we'll create a promise now and cache that so that we don't compute
    //the same thing multiple times at the same time

    const minimaxResultPromise = new Promise<MinimaxIterationResult>(async (resolve, reject) => {

      const cachedSuccessorsPromise = this.successorsCache.get(gameHash)
      let cachedSuccessors: GameStateProgression[]|undefined = undefined

      //guess for the number of successors, this should
      let estimatedNumberOfSuccessors

      if(cachedSuccessorsPromise === undefined){
        estimatedNumberOfSuccessors = this.estimateNumberOfSuccessors(game)
      }
      else{
        cachedSuccessors = await cachedSuccessorsPromise
        estimatedNumberOfSuccessors = cachedSuccessors.length
      }


      /**
       * either the cost of getting the successors or 0 if the successors are cached
       * for this state
       */
      const realizedGetSuccessorsCost = cachedSuccessors!==undefined ?
        0 : this.costSetup.getSuccessorsCost

      //we want to make sure we leave enough budget to evaluate the state for each
      //successor
      if(
        depth >= this.costSetup.maxDepth || 
        budget < realizedGetSuccessorsCost + estimatedNumberOfSuccessors * this.costSetup.stateEvaluationCost + usedBudget
      ){
        usedBudget += this.costSetup.stateEvaluationCost
        const value = await this.stateEvaluation(gameState)
        logMinimaxIter({
          name: "stateEvaluation",
          type: "info",
          payload: {
            value,
            depth
          }
        })

        resolve( {
          computedValue: value,
          usedBudget
        })
        return
      }

      //from here on we'll be exploring the tree
      usedBudget += realizedGetSuccessorsCost

      let successors: GameStateProgression[]

      if(cachedSuccessors === undefined){
        const successorsPromise = this.getSuccessors(gameState)
        this.successorsCache.set(gameHash, successorsPromise)
        //add to cache before awaiting result
        try{
          successors = await successorsPromise
        }
        catch(e){
          reject(e)
          return
        }
      }
      else{
        successors = cachedSuccessors
      }

      if(successors.length === 0){
        reject(new Error("No successors found"))
      }

      const remainingBudgetBeforeTreeSearch = budget - usedBudget

      let minimaxTreeSearchResult: MinimaxIterationResult
      try{
        minimaxTreeSearchResult = this.parallel ?
          await this.minimaxParallelTreeSearch(
            remainingBudgetBeforeTreeSearch,
            successors,
            depth,
            maximizingPlayer
          ) :
          await this.minimaxSerialTreeSearch(
            remainingBudgetBeforeTreeSearch,
            successors,
            depth,
            alpha,
            beta,
            maximizingPlayer
          )
      }
      catch(e){
        reject(e)
        return
      }
      
      usedBudget += minimaxTreeSearchResult.usedBudget

      logMinimaxIter({
        name: "minimaxIter",
        type: "info",
        payload: {
          depth,
          value: minimaxTreeSearchResult.computedValue,
          usedBudget
        }
      })

      resolve({
        computedValue: minimaxTreeSearchResult.computedValue,
        usedBudget
      })
      return
    })

    const computedValueWrapper = new Promise<number>(async (resolve, reject) => {
      try{
        const result = await minimaxResultPromise
        resolve(result.computedValue)
      }
      catch(e){
        reject(e)
      }
    })


    //we haven't finished computing the value yet
    this.addToMinimaxCache(gameHash, {
      computedValue: computedValueWrapper,
      budget
    })

    const finalResult = await minimaxResultPromise
    return finalResult
  }

  /**
   * Performs a serial tree search using the minimax algorithm
   * with alpha-beta pruning
   * 
   * This should be run when you know there's enough budget to run the the next
   * iteration of the search
   * 
   * @param budgetForSearch the budget for the search
   * @param successors the possible next states
   * @param depth the current depth of the search
   * @param alpha the alpha value for alpha-beta pruning
   * @param beta the beta value for alpha-beta pruning
   * @param maximizingPlayer whether the current player is maximizing
   * 
   * @returns the computed value and the amount of budget used
   */
  private async minimaxSerialTreeSearch(
    budgetForSearch: number,
    successors: GameStateProgression[],
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean,
  ):Promise<MinimaxIterationResult> {
    let usedBudget = 0
    if(maximizingPlayer){
      let bestValue = -Infinity
      for(const successor of successors){
        const thisNodeBudget = budgetForSearch * successor.probability

        const minimaxReturn = await this.minimax(
          depth + 1,
          successor.nextState,
          thisNodeBudget,
          alpha,
          beta,
          false
        )

        const value = minimaxReturn.computedValue

        usedBudget += minimaxReturn.usedBudget

        bestValue = Math.max(bestValue, value)
        alpha = Math.max(alpha, value)
        if(beta <= alpha){
          break
        }
      }
      return {
        computedValue: bestValue,
        usedBudget
      }
    } else {
      let bestValue = Infinity
      for(const successor of successors){
        const thisNodeBudget = budgetForSearch * successor.probability

        const minimaxReturn = await this.minimax(
          depth + 1,
          successor.nextState,
          thisNodeBudget,
          alpha,
          beta,
          true
        )

        const value = minimaxReturn.computedValue

        usedBudget += minimaxReturn.usedBudget

        bestValue = Math.min(bestValue, value)
        beta = Math.min(beta, value)
        if(beta <= alpha){
          break
        }
      }
      return{
        computedValue: bestValue,
        usedBudget
      }
    }
  }

  /**
   * Performs a parallel tree search using the minimax algorithm
   * without alpha-beta pruning
   * 
   * this should be run when you know there's enough budget to run the next
   * iteration of the search
   * 
   * @param budgetForSearch 
   * @param successors 
   * @param depth 
   * @param maximizingPlayer 
   * @returns the computed value and the amount of budget used
   */
  private async minimaxParallelTreeSearch(
    budgetForSearch: number,
    successors: GameStateProgression[],
    depth: number,
    maximizingPlayer: boolean,
  ):Promise<MinimaxIterationResult> {
    let usedBudget = 0
    const subnodeExplorations: Promise<MinimaxIterationResult>[] = []
    for(const successor of successors){
      const thisNodeBudget = budgetForSearch * successor.probability
      subnodeExplorations.push(
        this.minimax(
          depth + 1,
          successor.nextState,
          thisNodeBudget,
          -Infinity,
          Infinity,
          !maximizingPlayer
        )
      )
    }
    const id = Math.random().toString(36).substring(7)
    const subnodeResults = await Promise.all(subnodeExplorations)
    usedBudget += subnodeResults.reduce((acc, val) => acc + val.usedBudget, 0)

    if(maximizingPlayer){
      const bestValue = Math.max(...subnodeResults.map(val => val.computedValue))
      return {
        computedValue: bestValue,
        usedBudget
      }
    } else {
      const bestValue = Math.min(...subnodeResults.map(val => val.computedValue))
      return {
        computedValue: bestValue,
        usedBudget
      }
    }
  }

  /**
   * 
   * @param gameState 
   * 
   * @returns a value between -1 and 1
   * indicating how favorable the state is for the white player
   */
  protected abstract stateEvaluation(gameState: GameState): Promise<number>

  /**
   * produces a list of possible next states along with the probability of each state 
   * 
   * The sum of the probabilities should be 1
   * 
   * @param gameState 
   */
  protected abstract getSuccessors(gameState: GameState): Promise<GameStateProgression[]>
}