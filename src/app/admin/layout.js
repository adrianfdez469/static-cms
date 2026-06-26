import "./admin.css";

export const metadata = {
  title: "Admin - CMS",
};

export default function AdminLayout({ children }) {
  return (
    <div className="admin-root">
      {children}
    </div>
  );
}
