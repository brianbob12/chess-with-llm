import React from 'react';
import { PlayerColor } from '@/types/Chess';

type TurnPillProps = {
  nextPlayerToMove:PlayerColor
}

export default function TurnPill({
  nextPlayerToMove 
}:TurnPillProps){

  const isWhite = nextPlayerToMove === "white"

  const pillText = isWhite ? "WHITE'S TURN" : "BLACK'S TURN"

  //css for these components can be found in /app/globals.css
  return (
    <div className={`turn-pill ${isWhite ? 'turn-pill-white' : 'turn-pill-black'}`}>
      <span>{pillText}</span>
      <span
        className={
          `ml-2 mr-0 turn-pill-dot ${isWhite? "turn-pill-dot-white":"turn-pill-dot-black"}`
        }
      />
    </div>
  );
}

