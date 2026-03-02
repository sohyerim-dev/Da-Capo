import { useEffect } from "react";
import router from "@/route";
import { RouterProvider } from "react-router";
import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import type { User } from "@/types/user";

function App() {
  const { setUser, resetUser } = useUserStore();

  useEffect(() => {
    // 앱 시작 시 Supabase 세션 상태 감지 (로그인 유지)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // 자동로그인 미설정 + 새 브라우저 세션 → 로그아웃 처리
        if (event === "INITIAL_SESSION") {
          // 비밀번호 재설정 링크로 진입 시 로그아웃 방지
          const isRecovery = window.location.hash.includes("type=recovery");
          if (isRecovery) return;

          const autoLogin = localStorage.getItem("autoLogin");
          const sessionActive = sessionStorage.getItem("sessionActive");
          if (session && autoLogin === "false" && !sessionActive) {
            supabase.auth.signOut();
            return;
          }
        }

        if (event === "PASSWORD_RECOVERY") {
          router.navigate("/update-password");
        }

        if (session?.user) {
          const u = session.user;
          const user: User = {
            id: u.id,
            email: u.email!,
            nickname: u.user_metadata?.nickname ?? "",
            username: u.user_metadata?.username ?? "",
            phone: u.user_metadata?.phone ?? "",
            image: u.user_metadata?.avatar_url,
            role: u.user_metadata?.role ?? "user",
          };
          setUser(user);
        } else {
          resetUser();
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [setUser, resetUser]);

  return <RouterProvider router={router} />;
}

export default App;
