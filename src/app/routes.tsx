import React from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { BlogPost } from "./components/BlogPost";
import { Calculator } from "./components/Calculator";
import { StepCalculator } from "./components/StepCalculator";
import { KakaoPreview } from "./components/KakaoPreview";
import { AdminLogin } from "./components/AdminLogin";
import { AdminDashboard } from "./components/AdminDashboard";
import { LanguageWrapper } from "./components/LanguageWrapper";

export const router = createBrowserRouter([
  {
    path: "/admin",
    element: <AdminLogin />,
  },
  {
    path: "/admin/dashboard",
    element: <AdminDashboard />,
  },
  {
    path: "/",
    element: <Navigate to="/ko" replace />,
  },
  {
    path: "/:lang",
    element: <LanguageWrapper />,
    children: [
      {
        path: "",
        element: <BlogPost />,
      },
      {
        path: "calculator",
        element: <Calculator />,
      },
      {
        path: "step-calculator",
        element: <StepCalculator />,
      },
      {
        path: "kakao-preview",
        element: <KakaoPreview />,
      },
    ],
  },
]);