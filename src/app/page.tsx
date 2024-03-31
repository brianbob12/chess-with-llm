import ChessGameElement from "@/components/Chess/ChessGameElement";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <span
        className="font-mono font-bold"
      >
        Play Chess with an LLM
      </span>
      <div
        className="flex flex-row flex-grow"
      >
        <div

        >
          <ChessGameElement /> 
        </div>
      </div>
    </main>
  );
}
