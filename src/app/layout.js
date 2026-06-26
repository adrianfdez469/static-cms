import "./layout.css";

export const metadata = {
  title: "CMS",
  description: "Static pages CMS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="root-layout">{children}
        </div>
      </body>
    </html>
  );
}
