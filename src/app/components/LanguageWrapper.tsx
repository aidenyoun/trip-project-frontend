import { useEffect } from 'react';
import { useParams, useNavigate, Outlet } from 'react-router';
import { useLanguage } from '../LanguageContext';
import { LanguageSelector } from './LanguageSelector';

const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export function LanguageWrapper() {
  const { lang } = useParams<{ lang: string }>();
  const { setLanguage, language } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
      if (lang !== language) {
        setLanguage(lang as SupportedLanguage);
      }
    } else {
      // 리다이렉트: 잘못된 언어 코드거나 언어 코드가 없는 경우 기본 언어(ko)로 이동
      const targetLang = SUPPORTED_LANGUAGES.includes(language as SupportedLanguage) ? language : 'ko';
      navigate(`/${targetLang}`, { replace: true });
    }
  }, [lang, language, setLanguage, navigate]);

  return (
    <>
      <LanguageSelector />
      <Outlet />
    </>
  );
}
