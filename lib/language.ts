import { useAppStore } from '../store/useAppStore';

export const useLanguage = () => {
  const { language, setLanguage } = useAppStore();
  return { language, setLanguage };
};
