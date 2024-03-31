import React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select'
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@radix-ui/react-icons'

import classnames from "./Select.module.css"

type BuiltSelectProps = {
  children: React.ReactNode,
} & React.ComponentProps<typeof SelectPrimitive.Root>

function BuiltSelect({
  children,
  ...props
}:BuiltSelectProps) {

  return (
    <SelectPrimitive.Root {...props}>
      <SelectPrimitive.Trigger
        className={classnames.SelectTrigger}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon
          className={classnames.SelectIcon}
        >
          <ChevronDownIcon />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={classnames.SelectContent}
        >
          <SelectPrimitive.ScrollUpButton
            className={classnames.SelectScrollButton}
          >
            <ChevronUpIcon />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport
            className={classnames.SelectViewport}
          >
            {children}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton
            className={classnames.SelectScrollButton}
          >
            <ChevronDownIcon />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

type BuiltSelectItemProps = {
  children: React.ReactNode,
} & React.ComponentProps<typeof SelectPrimitive.Item>

function BuiltSelectItem({
  children,
  ...props
  }:BuiltSelectItemProps){
  return (
    <SelectPrimitive.Item
      {...props}
      className={classnames.SelectItem}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator>
        <CheckIcon />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}


type SelectProps = {
  value:string,
  onValueChange:(value:string)=>void,
  options:string[]
}

export default function Select({
  value,
  onValueChange,
  options
}:SelectProps){
  return(
    <BuiltSelect value={value} onValueChange={onValueChange}>
      {options.map((option)=>(
        <BuiltSelectItem key={option} value={option}>
          {option}
        </BuiltSelectItem>
      ))}
    </BuiltSelect>
  )
}