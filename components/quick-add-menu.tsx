'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

export interface QuickAddAction {
  label: string
  description: string
  emoji: string
  href: string
}

export const QUICK_ADD_ACTIONS: QuickAddAction[] = [
  {
    label: 'Hỏi Mochi AI',
    description: 'Trò chuyện & gợi ý thông minh',
    emoji: '🐱',
    href: '/ai',
  },
  {
    label: 'Ghi cân nặng',
    description: 'Cập nhật cân nặng & số đo',
    emoji: '⚖️',
    href: '/fitness/weight?action=add',
  },
  {
    label: 'Thêm buổi tập',
    description: 'Lưu thời gian & calo vận động',
    emoji: '🏃',
    href: '/fitness/exercise?action=add',
  },
  {
    label: 'Ghi buổi học',
    description: 'Nhật ký học tiếng Trung',
    emoji: '📖',
    href: '/chinese/journal?action=add',
  },
  {
    label: 'Thêm từ vựng',
    description: 'Lưu từ mới vào kho ôn tập',
    emoji: '🈶',
    href: '/chinese/vocabulary?action=add',
  },
  {
    label: 'Thêm giao dịch',
    description: 'Ghi khoản chi hoặc thu mới',
    emoji: '💸',
    href: '/expenses?action=add',
  },
]

interface QuickAddMenuProps {
  variant: 'sidebar' | 'header'
  onNavigate?: () => void
}

/**
 * Stable, accessible quick-add menu supporting mouse, touch, keyboard, and screen readers.
 * Uses Radix DropdownMenu for automatic focus restoration, arrow-key navigation, and edge collision handling.
 */
export function QuickAddMenu({ variant, onNavigate }: QuickAddMenuProps) {
  const pathname = usePathname()
  const [openPath, setOpenPath] = useState<string | null>(null)
  const open = openPath === pathname
  const setOpen = (nextOpen: boolean) => setOpenPath(nextOpen ? pathname : null)

  const isSidebar = variant === 'sidebar'

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          id={isSidebar ? 'quick-add-sidebar-trigger' : 'quick-add-header-trigger'}
          className={isSidebar ? 'quick-add-sidebar-btn' : 'quick-add-header-btn'}
          aria-label="Mở menu thêm nhanh"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span aria-hidden="true" className="quick-add-plus">
            {open ? '✕' : '+'}
          </span>
          <span>{isSidebar ? 'Thêm nhanh' : 'Thêm'}</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="mochi-quick-add-content"
          side={isSidebar ? 'right' : 'bottom'}
          align={isSidebar ? 'start' : 'end'}
          sideOffset={10}
          collisionPadding={16}
          avoidCollisions
          loop
        >
          <DropdownMenu.Label className="mochi-quick-add-label">
            Thao tác nhanh
          </DropdownMenu.Label>
          <div className="mochi-quick-add-list">
            {QUICK_ADD_ACTIONS.map(action => (
              <DropdownMenu.Item
                key={action.href}
                asChild
                onSelect={() => {
                  setOpen(false)
                  onNavigate?.()
                }}
              >
                <Link href={action.href} className="mochi-quick-add-item">
                  <span className="mochi-quick-add-emoji" aria-hidden="true">
                    {action.emoji}
                  </span>
                  <span className="mochi-quick-add-text">
                    <span className="mochi-quick-add-title">{action.label}</span>
                    <span className="mochi-quick-add-desc">{action.description}</span>
                  </span>
                </Link>
              </DropdownMenu.Item>
            ))}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>

      <style jsx global>{`
        .quick-add-sidebar-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: calc(100% - 16px);
          margin: 4px 8px 10px;
          padding: 11px 16px;
          border-radius: 16px;
          border: none;
          background: var(--cheese-400);
          color: var(--chocolate-700);
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 0.92rem;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(255, 202, 26, 0.28);
          transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
        }

        .quick-add-sidebar-btn:hover {
          background: var(--cheese-300);
          transform: translateY(-1px);
          box-shadow: 0 5px 14px rgba(255, 202, 26, 0.36);
        }

        .quick-add-sidebar-btn:focus-visible,
        .quick-add-header-btn:focus-visible {
          outline: 3px solid var(--chocolate-600);
          outline-offset: 2px;
        }

        .quick-add-header-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          min-height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          border: none;
          background: var(--cheese-400);
          color: var(--chocolate-700);
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 0.85rem;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(255, 202, 26, 0.3);
          transition: background 0.15s ease, transform 0.15s ease;
          flex-shrink: 0;
        }

        .quick-add-header-btn:active,
        .quick-add-sidebar-btn:active {
          transform: scale(0.97);
        }

        .quick-add-plus {
          font-size: 1.05rem;
          font-weight: 900;
          line-height: 1;
        }

        .mochi-quick-add-content {
          z-index: 120;
          width: min(280px, calc(100vw - 32px));
          max-height: min(440px, calc(100vh - 32px));
          overflow-y: auto;
          background: var(--color-surface);
          color: var(--color-text-primary);
          border: 1.5px solid var(--color-border);
          border-radius: 22px;
          padding: 10px;
          box-shadow: var(--shadow-xl);
          animation: mochi-fade-in 0.14s ease-out;
        }

        .mochi-quick-add-label {
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--color-text-muted);
          padding: 4px 10px 8px;
        }

        .mochi-quick-add-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .mochi-quick-add-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 14px;
          text-decoration: none;
          color: var(--color-text-primary);
          transition: background 0.12s ease, transform 0.12s ease;
          outline: none;
          cursor: pointer;
        }

        .mochi-quick-add-item:hover,
        .mochi-quick-add-item[data-highlighted] {
          background: var(--cheese-100);
          color: var(--chocolate-700);
        }

        .mochi-quick-add-item:focus-visible {
          box-shadow: 0 0 0 2.5px var(--cheese-400);
        }

        .mochi-quick-add-emoji {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          background: var(--cream);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          flex-shrink: 0;
        }

        .mochi-quick-add-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .mochi-quick-add-title {
          font-weight: 800;
          font-size: 0.88rem;
          line-height: 1.25;
        }

        .mochi-quick-add-desc {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--color-text-muted);
          line-height: 1.25;
        }

        [data-theme='dark'] .mochi-quick-add-content {
          background: #26201c;
          border-color: #4a3e36;
          color: #fff5ec;
        }

        [data-theme='dark'] .mochi-quick-add-emoji {
          background: #332b25;
        }

        [data-theme='dark'] .mochi-quick-add-item:hover,
        [data-theme='dark'] .mochi-quick-add-item[data-highlighted] {
          background: #4a3e36;
          color: #fff5ec;
        }
      `}</style>
    </DropdownMenu.Root>
  )
}
