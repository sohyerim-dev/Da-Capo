import { Navigate, useLocation } from "react-router";
import useUserStore from "@/zustand/userStore";

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useUserStore();
  const location = useLocation();

  if (!user) {
    return (
      <Navigate to="/login" state={{ from: location.pathname }} replace />
    );
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default AdminRoute;
