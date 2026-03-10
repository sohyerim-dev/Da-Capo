import { create, type StateCreator } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { type User } from "../types/user";

// 로그인한 사용자 정보를 관리하는 스토어의 상태 인터페이스
interface UserStoreState {
  user: User | null;
  setUser: (user: User | null) => void;
  resetUser: () => void;
}

// localStorage에서 초기 유저 정보를 동기적으로 읽어오기
function getInitialUser(): User | null {
  try {
    const raw = localStorage.getItem("userStore");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { user?: User } };
    return parsed?.state?.user ?? null;
  } catch {
    return null;
  }
}

const UserStore: StateCreator<UserStoreState> = (set) => ({
  user: getInitialUser(),
  setUser: (user: User | null) => set({ user }),
  resetUser: () => set({ user: null }),
});

// 자동 로그인 - localStorage에 저장 (브라우저를 껐다가 켜도 로그인 유지)
const useUserStore = create<UserStoreState>()(
  persist(UserStore, {
    name: "userStore",
    storage: createJSONStorage(() => localStorage),
  }),
);

export default useUserStore;
