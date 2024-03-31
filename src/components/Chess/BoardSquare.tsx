import { CellState, Piece } from "@/types/Chess"
import { ChessPiece } from "./ChessPiece"

type BoardSquareProps = {
  position: [number, number],
  cellState: CellState,
  highlightTailwindClassnames?: string,
  onMouseEnter?: React.MouseEventHandler<HTMLElement>,
  onMouseLeave?: React.MouseEventHandler<HTMLElement>,
  onClick?: React.MouseEventHandler<HTMLElement>
}

export default function BoardSquare({
  position,
  cellState,
  highlightTailwindClassnames,
  onMouseEnter,
  onMouseLeave,
  onClick
}: BoardSquareProps) {
  const isBlack = (position[0] + position[1]) % 2 === 1

  const isEmpty = cellState.piece === "empty"
  return(
    <div
      className={`h-12 w-12 flex justify-center items-center text-lg ${
        isBlack ? 'bg-white' : 'bg-slate-300'
      } ${
        highlightTailwindClassnames ? highlightTailwindClassnames : ''
      } rounded-lg`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {
        !isEmpty && (
          <ChessPiece
            piece={cellState.piece as Piece}
          />
        )
      }
    </div>
  )
}