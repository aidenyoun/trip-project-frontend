import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useLanguage } from "../LanguageContext";

export function LanguageSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang: currentLang } = useParams<{ lang: string }>();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'ko', label: '한국어' },
    { code: 'en', label: 'English' },
    { code: 'ja', label: '日本語' },
  ];

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageChange = (newLang: string) => {
    const pathParts = location.pathname.split('/');
    pathParts[1] = newLang;
    const newPath = pathParts.join('/') + location.search;
    
    navigate(newPath, { replace: true });
    setIsOpen(false);
  };

  const currentLangLabel = languages.find(l => l.code === language)?.label || 'KO';

  return (
    <div className="fixed top-4 right-4 z-[9999]" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-full shadow-lg bg-white border border-slate-200 hover:border-blue-300 hover:shadow-blue-100 transition-all active:scale-95"
      >
        <Globe className="w-4 h-4 text-blue-600" />
        <span className="text-xs font-bold text-slate-700 uppercase">{language}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-2xl p-1.5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => handleLanguageChange(l.code)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors mb-1 last:mb-0 ${
                language === l.code 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {l.label}
              {language === l.code && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
