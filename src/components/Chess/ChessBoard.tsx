'use client';

import { Move } from "@/types/Chess";
import ChessGame from "@/ChessLogic/ChessGame";
import { use, useEffect, useState } from "react";
import BoardSquare from "./BoardSquare";



/**
 * 
 * @param moves a list of moves
 * 
 * @returns a 2d array of moves
 * where the first index is the row and the second index is the column
 * Each element is either a move that ends at that position or null
 */
function getMovesAs2dArray(moves: Move[]):(Move|null)[][]  {
  //init a 2d array of nulls
  const moves2dArray:(Move|null)[][] = 
    Array.from({length: 8}, () => Array.from({length: 8}, () => null))

  moves.forEach(move => {
    const destination = move.to
    moves2dArray[destination[0]][destination[1]] = move
  })

  return moves2dArray
}

function isSamePosition(
  pos1:[number, number]|null,
  pos2:[number, number]|null
):boolean {
  if(!pos1 || !pos2){
    return false
  }
  return pos1[0] === pos2[0] && pos1[1] === pos2[1]
}

type ChessBoardProps = {
  game: ChessGame,
  isPlayable: boolean,
  onMovePlaced?: (move:Move) => void
}

/**
 * Renders an 8x8 chess board and allows the user to place moves
 * 
 * @param gameState the current state of the game
 * 
 */
export default function ChessBoard({
  game,
  isPlayable,
  onMovePlaced
}:ChessBoardProps) {

  const gameState = game.getGameState()

  const [hoverPosition, setHoverPosition] = useState<[number, number] | null>(null)
  const hoveredCell = hoverPosition !== null ? gameState.boardState[hoverPosition[0]][hoverPosition[1]] : null
  const hoveredPiece = hoveredCell?.piece
  const hoveredIsNextPlayer = hoveredPiece && hoveredPiece !== "empty" &&
    hoveredPiece.color === gameState.turn

  //selected is assumed to be only of the player whose turn it is
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null)

  //unselect the piece if the game a move was placed
  useEffect(() => {
    if(!selectedPosition){
      return
    }
    const selectedCell = gameState.boardState[selectedPosition[0]][selectedPosition[1]]
    const selectedPiece = selectedCell.piece
    if(selectedPiece === "empty"){
      setSelectedPosition(null)
      return
    }
    if(selectedPiece.color !== gameState.turn){
      setSelectedPosition(null)
    }
  }, [gameState.turn])

  useEffect(() => {
    if(!isPlayable){
      setSelectedPosition(null)
    }
  }, [isPlayable])


  const movesForHoveredPiece = hoverPosition !== null ?
    game.getMovesFromPosition(hoverPosition) : []
  const movesForHoveredPiece2dArray = getMovesAs2dArray(movesForHoveredPiece)

  const movesForSelectedPiece = selectedPosition !== null ?
    game.getMovesFromPosition(selectedPosition) : []
  const movesForSelectedPiece2dArray = getMovesAs2dArray(movesForSelectedPiece)

  const getHoverClassnames = 
    (rowIndex:number, colIndex:number):string|undefined => {

    const cellState = gameState.boardState[rowIndex][colIndex]
    const isSelected = isSamePosition(selectedPosition, [rowIndex, colIndex])
    const isHovered = isSamePosition(hoverPosition, [rowIndex, colIndex])
    const isInSelectedMoves = movesForSelectedPiece2dArray[rowIndex][colIndex] !== null
    const isInHoveredMoves = movesForHoveredPiece2dArray[rowIndex][colIndex] !== null

    if(isSelected){
      return "border-2 border-green-500"
    }
    if(isInSelectedMoves){
      if(isHovered){
        return "border-2 border-violet-500"
      }
      return "border-2 border-blue-500"
    }
    if(isInHoveredMoves){
      return hoveredIsNextPlayer? "border border-blue-300": "border border-orange-300"
    }
    if(isHovered){
      if(cellState.piece !== "empty"){
        return hoveredIsNextPlayer? "border border-green-300": "border border-red-300"
      }
    }
    return undefined
  }

  const onCellClick = (rowIndex:number, colIndex:number) => {
    if(!isPlayable){
      return
    }

    const isInSelectedMoves = movesForSelectedPiece2dArray[rowIndex][colIndex] !== null
    if(isInSelectedMoves){
      onMovePlaced?.(movesForSelectedPiece2dArray[rowIndex][colIndex] as Move)
      return
    }

    const cellState = gameState.boardState[rowIndex][colIndex]

    if(cellState.piece === "empty"){
      setSelectedPosition(null)
      return
    }
    if(cellState.piece.color !== gameState.turn){
      setSelectedPosition(null)
      return
    }

    if(selectedPosition === null){
      setSelectedPosition([rowIndex, colIndex])
    }
    else if(
      selectedPosition[0] === rowIndex &&
      selectedPosition[1] === colIndex
    ){
      setSelectedPosition(null)
    }
    else{
      setSelectedPosition([rowIndex, colIndex])
    }
  }

  return(
    <div
      className="flex flex-col p-8" 
    >
      <div className="rounded-lg shadow-lg p-4 min-h-[444px] min-w-[444px]">
        <div className="grid grid-cols-8 gap-1">
          {
            gameState.boardState.map((row, rowIndex) => (
              row.map((cellState, colIndex) => {
                const highlightClassnames = getHoverClassnames(rowIndex, colIndex) 

                return (
                  <BoardSquare
                    key={`${rowIndex}-${colIndex}`}
                    position={[rowIndex, colIndex]}
                    cellState={cellState}
                    highlightTailwindClassnames={highlightClassnames}
                    onMouseEnter={() => {
                      setHoverPosition([rowIndex, colIndex])
                    }}
                    onMouseLeave={() => {
                      if(isSamePosition(hoverPosition, [rowIndex, colIndex])){
                        setHoverPosition(null)
                      }
                    }}
                    onClick={() => onCellClick(rowIndex, colIndex)}
                  />
                )
              })
            ))
          }
        </div>
      </div>
    </div>
  )
}