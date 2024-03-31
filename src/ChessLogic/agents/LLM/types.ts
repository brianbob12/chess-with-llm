//see https://platform.openai.com/docs/api-reference/chat/create

type SystemMessage = {
  content: string
  role: "system"
  name?: string
}

type UserMessage = {
  content: string|string[]
  role: "user",
  name?: string
}

type ToolCall = {
  id: string
  type: "function",
  function:any
}

type AssistantMessage = {
  content: string| null
  role: "assistant"
  name?: string
  tool_calls?: ToolCall[]
}

type ToolMessage = {
  content:string
  role: "tool",
  tool_call_id: string
}

export type Message = SystemMessage | UserMessage | AssistantMessage | ToolMessage

type TokenLogprob = {
  token: string
  logprob: number
  bytes: any[]|null
}

type Logprobs = {
  content: (TokenLogprob & {
    top_logprobs?: TokenLogprob[]
  })[]
}

/**
 * The return type of the callLLM function
 */
export  type MessageChoice = {
  index: number
  message: AssistantMessage//ignore tool calls for now
  logprobs?:Logprobs
}

export type CallLLMArgs = {
    messages:Message[],
    frequency_penalty?:number,
    presence_penalty?:number,
    logit_bias?:{[key:string]:number},
    logprobs?:boolean,
    top_logprobs?:number,
    max_tokens?:number,
    stop?:string|string[],
    temperature?:number,
    n:number
  }
export type CallLLM = (ars:CallLLMArgs)=>Promise<MessageChoice[]>

export type ImportantTokenIDs = {
  'yes':number,
  'no':number,
  'black':number,
  'white':number,
}