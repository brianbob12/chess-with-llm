import OpenAI from "openai"
import { CallLLMArgs, ImportantTokenIDs, MessageChoice } from "./types";
import { Log, logLLMCall } from "@/utils/logging";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGINIZATION_ID
})

async function callOpenAIModel(model:string,args:CallLLMArgs):Promise<MessageChoice[]> {

  const completion = await openai.chat.completions.create({
    messages: args.messages as any,
    model: model,
    max_tokens: args.max_tokens || 1000,
    temperature: args.temperature || 0.7,
    frequency_penalty: args.frequency_penalty,
    presence_penalty: args.presence_penalty,
    logit_bias: args.logit_bias,
    logprobs: args.logprobs,
    top_logprobs: args.top_logprobs,
    stop: args.stop,
    n: args.n,
  },
  {
    maxRetries: 5,
    timeout: 10*1000
  })

  const logObject:Log = {
    name:`openai_chat_${model}`,
    type:"info",
    payload:{
      args:args,
      completion:completion
    }
  }

  logLLMCall(logObject)

  return completion.choices as MessageChoice[]
}

export async function gpt3_5(args:CallLLMArgs):Promise<MessageChoice[]> {
  return await callOpenAIModel("gpt-3.5-turbo",args)
}

export async function gpt4(args:CallLLMArgs):Promise<MessageChoice[]> {
  return await callOpenAIModel("gpt-4-turbo-preview",args)
}

/**
 * Important token IDs for the cl100k_base model
 * 
 * Used for all gpt-3.5 and gpt-4 models
 */
export const cl100k_base_importantTokenIDs:ImportantTokenIDs = {
  white: 5902,
  black: 11708,
  yes: 9891,
  no: 2201
}