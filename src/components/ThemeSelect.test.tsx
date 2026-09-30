import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach } from 'vitest'
import ThemeSelect from './ThemeSelect'
import { ThemeProvider } from '../context/ThemeContext'

describe('theme selection', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('servicehub-theme', 'light')
    document.documentElement.classList.remove('dark')
  })

  it('persists a selected theme and applies it to the page', async () => {
    const user = userEvent.setup()
    render(<ThemeProvider><ThemeSelect /></ThemeProvider>)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Color theme' }), 'dark')

    expect(localStorage.getItem('servicehub-theme')).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
  })
})
