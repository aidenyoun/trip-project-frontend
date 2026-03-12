import { useNavigate, useParams, useLocation } from "react-router";
import { Globe, Check } from "lucide-react";
import { useLanguage } from "../LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

export function LanguageSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang: currentLang } = useParams<{ lang: string }>();
  const { language } = useLanguage();

  const languages = [
    { code: 'ko', label: '한국어' },
    { code: 'en', label: 'English' },
    { code: 'ja', label: '日本語' },
  ];

  const handleLanguageChange = (newLang: string) => {
    // 현재 경로에서 언어 코드 부분만 교체
    // 예: /ko/step-calculator -> /en/step-calculator
    const pathParts = location.pathname.split('/');
    pathParts[1] = newLang;
    const newPath = pathParts.join('/') + location.search;
    
    navigate(newPath, { replace: true });
  };

  return (
    <div className="fixed top-4 right-4 z-[100]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="w-10 h-10 rounded-full shadow-md bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white transition-all"
          >
            <Globe className="w-5 h-5 text-slate-600" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32 rounded-2xl p-2 bg-white/95 backdrop-blur-md border-slate-100 shadow-xl">
          {languages.map((l) => (
            <DropdownMenuItem
              key={l.code}
              onClick={() => handleLanguageChange(l.code)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm cursor-pointer transition-colors mb-1 last:mb-0 ${
                language === l.code 
                  ? 'bg-blue-50 text-blue-600 font-bold' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {l.label}
              {language === l.code && <Check className="w-4 h-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
