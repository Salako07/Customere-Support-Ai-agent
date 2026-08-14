import './globals.css';

export const metadata = {
  title: 'NovaShop AI Customer Support',
  description: 'RAG-powered NovaShop support assistant demo',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
