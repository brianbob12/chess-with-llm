const logToFile = require("log-to-file")

type LogType = "info" | "error" | "warn"

export type Log = {
  name: string,
  type: LogType,
  payload: any
}

export function logLLMCall(log:Log){
  logToFile(JSON.stringify(log,null,2), "llm.log")
}

export function logMinimaxIter(log:Log){
  logToFile(JSON.stringify(log,null,2), "minimax.log")
}