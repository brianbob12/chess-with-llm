'use client';

import {
  AgentDescriptor,
  EndgameState,
  initialGameState,
  Move,
  PlayerColor
} from "@/types/Chess"

import {
  useEffect,
  useState
} from "react"

import ChessBoard from "./ChessBoard"
import ChessGame from "@/ChessLogic/ChessGame"
import InfoPanel from "./InfoPanel"
import { callGenericAgent } from "@/ChessLogic/agents/callGenericAgent"
import _ from "lodash"

const getInitialGameState = ()=>{
  return _.cloneDeep(initialGameState)
}

export default function ChessGameElement(){
  const [chessGame, setChessGame] = useState({ref:new ChessGame(getInitialGameState())})

  // hook that always points to the current game
  const [liveGame, _] = useState({ref:chessGame.ref})
  liveGame.ref = chessGame.ref

  const [whiteAgent, setWhiteAgent] = useState<AgentDescriptor>("human")
  const [blackAgent, setBlackAgent] = useState<AgentDescriptor>("minimax(gpt-4)")

  const [endGameState, setEndGameState] = useState<EndgameState>("inProgress")

  const isBoardPlayable = endGameState === "inProgress" && 
    chessGame.ref.getGameState().turn === "white" && whiteAgent === "human" ||
    chessGame.ref.getGameState().turn === "black" && blackAgent === "human"

  //plays the next move if the current player is not human
  const playNextMoveIfNotUser = async ()=>{
    if(endGameState !== "inProgress"){
      return
    }
    const game = chessGame.ref
    //get move from server if necessary
    if(game.getGameState().turn === "black" && blackAgent !== "human"){
      //call the black agent
      const blackMove = await callGenericAgent(
        game.getGameState(),
        blackAgent
      )
      placeMoveSync(game, blackMove)
    }
    else if(game.getGameState().turn === "white" && whiteAgent !== "human"){
      //call the white agent
      const whiteMove = await callGenericAgent(
        game.getGameState(),
        whiteAgent
      )
      placeMoveSync(game, whiteMove)
    }
  }

  const placeMoveSync = (
    movingFromGame:ChessGame,
    move:Move
  )=>{
    if(chessGame.ref!==liveGame.ref){
      return
    }
    chessGame.ref.makeMove(move)
    setChessGame({ref:chessGame.ref})
  }

  const onMovePlaced = async (move:Move)=>{
    chessGame.ref.makeMove(move)
    setChessGame({ref:chessGame.ref})
    const endGameState = chessGame.ref.getEndgameState()
    if(endGameState !== "inProgress"){
      setEndGameState(endGameState)
      return
    }
  }

  useEffect(()=>{
    const endGameState = chessGame.ref.getEndgameState()
    setEndGameState(endGameState)
    playNextMoveIfNotUser()
  }, [chessGame, whiteAgent, blackAgent])


  return(
    <div
      className="flex flex-row flex-wrap items-center justify-center"
    >
      <ChessBoard
        game={chessGame.ref}
        onMovePlaced={onMovePlaced}
        isPlayable={isBoardPlayable}
      />
      <InfoPanel
        game={chessGame.ref}
        whiteAgent={whiteAgent}
        setWhiteAgent={setWhiteAgent}
        blackAgent={blackAgent}
        setBlackAgent={setBlackAgent}
        onClear={()=>setChessGame({ref:new ChessGame(getInitialGameState())})}
      />
    </div>
  )
}