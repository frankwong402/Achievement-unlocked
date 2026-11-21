import './globals.css';

export const metadata = { title: 'Achievement Unlocked', description: 'A gamified quest and achievement tracker — hackathon prototype.' };

export default function RootLayout({children}) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
