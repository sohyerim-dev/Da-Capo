import { createBrowserRouter } from "react-router";
import Layout from "@/components/layout";
import Home from "@/pages/Home";
import Login from "@/pages/user/Login";
import Signup from "@/pages/user/Signup";
import ConcertInfoList from "@/pages/concerts-info/ConcertInfoList";
import ConcertInfoDetail from "@/pages/concerts-info/ConcertInfoDetail";
import MagazineList from "@/pages/Magazine/MagazineList";
import MagazineDetail from "@/pages/Magazine/MagazineDetail";
import MagazineNew from "@/pages/Magazine/MagazineNew";
import MagazineEdit from "@/pages/Magazine/MagazineEdit";
import MyPage from "@/pages/mypage/MyPage";
import ClassicNote from "@/pages/classic-note/ClassicNote";
import Search from "@/pages/Search";
import CommunityList from "@/pages/community/CommunityList";
import CommunityDetail from "@/pages/community/CommunityDetail";
import CommunityNew from "@/pages/community/CommunityNew";
import CommunityEdit from "@/pages/community/CommunityEdit";
import ProtectedRoute from "@/components/ProtectedRoute";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
      { path: "/concert-info", element: <ConcertInfoList /> },
      { path: "/concert-info/:id", element: <ConcertInfoDetail /> },
      { path: "/magazine", element: <MagazineList /> },
      { path: "/magazine/:id", element: <MagazineDetail /> },
      {
        path: "/magazine/new",
        element: (
          <ProtectedRoute>
            <MagazineNew />
          </ProtectedRoute>
        ),
      },
      {
        path: "/magazine/:id/edit",
        element: (
          <ProtectedRoute>
            <MagazineEdit />
          </ProtectedRoute>
        ),
      },
      { path: "/community", element: <CommunityList /> },
      { path: "/community/:id", element: <CommunityDetail /> },
      {
        path: "/community/new",
        element: (
          <ProtectedRoute>
            <CommunityNew />
          </ProtectedRoute>
        ),
      },
      {
        path: "/community/:id/edit",
        element: (
          <ProtectedRoute>
            <CommunityEdit />
          </ProtectedRoute>
        ),
      },
      {
        path: "/mypage",
        element: (
          <ProtectedRoute>
            <MyPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/classic-note",
        element: (
          <ProtectedRoute>
            <ClassicNote />
          </ProtectedRoute>
        ),
      },
      { path: "/search", element: <Search /> },
    ],
  },
]);

export default router;
