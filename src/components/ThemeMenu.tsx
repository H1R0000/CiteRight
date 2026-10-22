import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useApp } from '../app/AppProvider'

const themes = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
] as const

export function ThemeMenu() {
  const { theme, setTheme } = useApp()
  const Icon = themes.find((option) => option.value === theme)!.icon

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="theme-control"
          aria-label="Color theme"
          title="Color theme"
        >
          <Icon size={18} aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="theme-menu"
          align="end"
          sideOffset={10}
          collisionPadding={12}
          aria-label="Color theme"
        >
          <DropdownMenu.Label className="theme-menu-label">Appearance</DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={theme}
            onValueChange={(value) => {
              if (value === 'system' || value === 'light' || value === 'dark') setTheme(value)
            }}
          >
            {themes.map(({ value, label, icon: OptionIcon }) => (
              <DropdownMenu.RadioItem className="theme-menu-option" value={value} key={value}>
                <OptionIcon size={17} aria-hidden="true" />
                <span>{label}</span>
                <DropdownMenu.ItemIndicator className="theme-menu-check">
                  <Check size={16} aria-hidden="true" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
