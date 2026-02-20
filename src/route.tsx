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
import CommunityList from "@/pages/community/CommunityList";
import CommunityDetail from "@/pages/community/CommunityDetail";
import CommunityNew from "@/pages/community/CommunityNew";
import CommunityEdit from "@/pages/community/CommunityEdit";
import ClassicNotePublic from "@/pages/classic-note/ClassicNotePublic";
import About from "@/pages/About";
import SupportList from "@/pages/support/SupportList";
import SupportDetail from "@/pages/support/SupportDetail";
import SupportNew from "@/pages/support/SupportNew";
import SupportEdit from "@/pages/support/SupportEdit";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
      { path: "/about", element: <About /> },
      { path: "/concert-info", element: <ConcertInfoList /> },
      { path: "/concert-info/:id", element: <ConcertInfoDetail /> },
      { path: "/magazine", element: <MagazineList /> },
      { path: "/magazine/:id", element: <MagazineDetail /> },
      {
        path: "/magazine/new",
        element: (
          <AdminRoute>
            <MagazineNew />
          </AdminRoute>
        ),
      },
      {
        path: "/magazine/:id/edit",
        element: (
          <AdminRoute>
            <MagazineEdit />
          </AdminRoute>
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
      { path: "/classic-note/:username", element: <ClassicNotePublic /> },
      { path: "/support", element: <SupportList /> },
      { path: "/support/:id", element: <SupportDetail /> },
      {
        path: "/support/new",
        element: (
          <ProtectedRoute>
            <SupportNew />
          </ProtectedRoute>
        ),
      },
      {
        path: "/support/:id/edit",
        element: (
          <ProtectedRoute>
            <SupportEdit />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

export default router;
