import { createBrowserRouter } from "react-router";
import { BlogPost } from "./components/BlogPost";
import { Calculator } from "./components/Calculator";
import { StepCalculator } from "./components/StepCalculator";
import { KakaoPreview } from "./components/KakaoPreview";
import { AdminLogin } from "./components/AdminLogin";
import { AdminDashboard } from "./components/AdminDashboard";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: BlogPost,
  },
  {
    path: "/calculator",
    Component: Calculator,
  },
  {
    path: "/step-calculator",
    Component: StepCalculator,
  },
  {
    path: "/kakao-preview",
    Component: KakaoPreview,
  },
  {
    path: "/admin",
    Component: AdminLogin,
  },
  {
    path: "/admin/dashboard",
    Component: AdminDashboard,
  },
]);