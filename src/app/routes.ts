import { createBrowserRouter } from "react-router";
import { BlogPost } from "./components/BlogPost";
import { Calculator } from "./components/Calculator";
import { StepCalculator } from "./components/StepCalculator";
import { KakaoPreview } from "./components/KakaoPreview";

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
]);