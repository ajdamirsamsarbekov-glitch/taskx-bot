import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TaskX - Платформа микрозаданий',
  description: 'Создавайте и выполняйте задания с безопасными escrow-платежами',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
