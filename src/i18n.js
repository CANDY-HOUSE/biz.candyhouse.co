import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入语言文件
import en from './i18n/en.json';
import ja from './i18n/ja.json';
import zhCN from './i18n/zh-CN.json';
import zhTW from './i18n/zh-TW.json';

/* 

// 通过调用 i18n.changeLanguage 方法来切换语言，例如：

import i18n from './i18n';

const switchLanguage = (language) => {
  i18n.changeLanguage(language);
};

// 使用时
<button onClick={() => switchLanguage('zh-CN')}>切换到简体中文</button>
<button onClick={() => switchLanguage('zh-TW')}>切换到繁体中文</button>


*/

i18n
  .use(LanguageDetector) // 使用语言检测
  .use(initReactI18next) // 绑定 react-i18next 到 i18next
  .init({
    resources: {
      en: { translation: en },
      ja: { translation: ja },
      zh: { translation: zhCN },
      'zh-CN': { translation: zhCN },
      'zh-TW': { translation: zhTW },
    },
    fallbackLng: 'en', // 默认语言
    interpolation: {
      escapeValue: false, // React 已经自动防止了 XSS
    },
    detection: {
      order: ['cookie', 'navigator', 'querystring', 'localStorage'],
      caches: ['localStorage', 'cookie'],
    },
  });

export default i18n;
