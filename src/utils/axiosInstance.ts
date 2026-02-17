import router from "@/route";
import useUserStore from "@/zustand/userStore";
import axios from "axios";

// API 서버 주소 (페이지별로 다른 API를 사용할 경우 여기에 추가)
export const API_SERVER = "https://fesp-api.koyeb.app/market";
// export const API_CONCERT = "https://...";
// export const API_COMMUNITY = "https://...";

// access token 재발급 URL
const REFRESH_URL = "/auth/refresh";

// Axios 인스턴스 생성 함수 - baseURL을 인자로 받아 페이지별 API 서버 사용 가능
export function getAxiosInstance(baseURL: string = API_SERVER) {
  const instance = axios.create({
    baseURL,
    timeout: 1000 * 15,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Client-Id": "openmarket",
    },
  });

  // 요청 인터셉터 추가
  instance.interceptors.request.use(
    (config) => {
      // 로그인 후에 응답받은 Access Token을 Authorization 헤더로 전달
      const user = useUserStore.getState().user;
      // config.url !== REFRESH_URL 지금 요청이 토큰 갱신 요청이 아닌 일반 API 요청이면
      if (user && config.url !== REFRESH_URL) {
        config.headers.Authorization = `Bearer ${user.token?.accessToken}`;
      }
      config.params = {
        // delay: 500,
        ...config.params,
      };
      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  // 응답 인터셉터 추가
  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      console.error("에러 응답 인터셉터 호출", error);

      const { user, setUser } = useUserStore.getState();
      const { config, response } = error;

      if (response?.status === 401) {
        // 로그인 상태에서 토큰 만료를 처리하는 두 가지 케이스와 비로그인 상태
        // 인증 실패
        // config.url === REFRESH_URL 지금 요청 URL이 Access Token 갱신 요청이면
        if (config.url === REFRESH_URL) {
          // "지금 요청이 Access Token 갱신 요청인데 401이 났다"
          // = refresh token으로 갱신 시도했는데 실패
          // = refresh token도 만료됨
          // refresh token도 만료된 경우 로그인 페이지로
          navigateLogin();
        } else if (user) {
          // "일반 API 요청이 401이 났다"
          // = access token이 만료됨
          // = 하지만 refresh token은 아직 살아있을 것

          // 로그인 했으나 access token이 만료된 경우 access token과 refresh token 재발급
          // refresh 토큰으로 access token과 refresh token 재발급 요청
          const {
            data: { accessToken, refreshToken },
          } = await instance.get(REFRESH_URL, {
            headers: {
              Authorization: `Bearer ${user.token?.refreshToken}`,
            },
          });
          // 새 토큰들 저장
          setUser({ ...user, token: { accessToken, refreshToken } });
          // 갱신된 accessToken으로 실패했던 요청을 다시 시도
          config.headers.Authorization = `Bearer ${accessToken}`;
          return axios(config);
        } else {
          // 로그인 안한 경우
          navigateLogin();
        }
      }

      return Promise.reject(error);
    },
  );

  function navigateLogin() {
    const gotoLogin = confirm(
      "로그인 후 이용 가능합니다.\n로그인 페이지로 이동하시겠습니까?",
    );
    if (gotoLogin) {
      // state로 로그인 후에 돌아올 페이지 전달
      router.navigate("/users/login", {
        state: { from: router.state.location.pathname },
      });
    }
  }

  return instance;
}
