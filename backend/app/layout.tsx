import type { ReactNode } from 'react'

export const metadata = {
  title: 'Larabby Hotel — Backend',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
