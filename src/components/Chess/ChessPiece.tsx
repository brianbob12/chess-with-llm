import Image from "next/image"
import { Piece } from "@/types/Chess"

type ChessPieceProps = {
  piece: Piece
}

export function ChessPiece({ piece }: ChessPieceProps) {
  return (
    <div
      className="flex items-center justify-center w-8 h-18"
    >
      <Image
        height={32}
        width={32}
        src={`/chessPieces/${piece.type}-${piece.color}.svg`}
        alt={`${piece.color} ${piece.type}`}
      />
    </div>
  )
}