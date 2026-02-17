import { create, type StateCreator } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { type User } from "../types/user";

// 로그인한 사용자 정보를 관리하는 스토어의 상태 인터페이스
interface UserStoreState {
  user: User | null;
  setUser: (user: User | null) => void;
  resetUser: () => void;
}

// 로그인한 사용자 정보를 관리하는 스토어 생성
// StateCreator: Zustand의 유틸리티 타입으로, set 함수의 타입을 자동으로 추론해줌
// 복잡한 타입 정의 없이도 set 함수가 올바른 타입으로 인식됨
const UserStore: StateCreator<UserStoreState> = (set) => ({
  user: null,
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
