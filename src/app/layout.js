export const metadata = {
  title: "CMS",
  description: "Static pages CMS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
