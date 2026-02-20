export type UserRole = "user" | "admin" | "partner";

export interface User {
  id: string;
  email: string;
  nickname: string;
  username: string;
  phone: string;
  image?: string;
  role: UserRole;
}

// 회원가입 폼 타입
export type UserCreateForm = Pick<User, "email" | "nickname" | "phone"> & {
  password: string;
};

// 로그인 폼 타입
export type LoginForm = Pick<User, "email"> & {
  password: string;
};
