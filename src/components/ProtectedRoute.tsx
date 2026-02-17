import { Navigate, useLocation } from "react-router";
import useUserStore from "@/zustand/userStore";

// 로그인이 필요한 페이지를 보호하는 컴포넌트
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useUserStore();
  const location = useLocation();

  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!user) {
    // 현재 경로를 state로 전달하여 로그인 후 돌아올 수 있도록 함
    return (
      <Navigate to="/login" state={{ from: location.pathname }} replace />
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
