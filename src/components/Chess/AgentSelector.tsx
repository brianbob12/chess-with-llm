import { AgentDescriptor, allAgents } from "@/types/Chess"
import Select from "@/components/ui/Select"

type AgentSelectorProps = {
  agent: AgentDescriptor,
  setAgent: (agent: AgentDescriptor) => void
}

export default function AgentSelector({
  agent,
  setAgent
}:AgentSelectorProps) {

  const options = allAgents

  return(
    <div

    >
      <Select
        value={agent}
        onValueChange={(value)=>setAgent(value as AgentDescriptor)}
        options={options}
      />
    </div>
  )
}