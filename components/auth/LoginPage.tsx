import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ArrowRight, Loader2, Workflow, CheckCircle } from 'lucide-react';
import { translations } from '../../locales';

const LoginPage = () => {
  const { login, register, language, loading, error } = useAppStore();
  const t = translations[language].auth;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    if (isRegisterMode) {
      if (!name) return;
      await register(email, name, password);
    } else {
      await login(email, password);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      <div className="hidden lg:flex w-1/2 bg-black text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-purple-900/40 z-0"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[100px] z-0"></div>
        
        <div className="relative z-10">
            <div className="flex items-center gap-3">
                <img src="/logo.png" alt="EasyWorkflow" className="h-10 w-10 rounded-lg object-contain" />
                <span className="text-xl font-bold tracking-tight">EasyWorkflow</span>
            </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
            <h1 className="text-4xl font-bold leading-tight whitespace-pre-line">
                {t.slogan}
            </h1>
            <div className="space-y-4 text-gray-300">
                <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-400" />
                    <span>{t.feature1}</span>
                </div>
                <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-400" />
                    <span>{t.feature2}</span>
                </div>
                <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-400" />
                    <span>{t.feature3}</span>
                </div>
            </div>
        </div>

        <div className="relative z-10 text-xs text-gray-500">
            &copy; 2026 EasyWorkflow Inc. All rights reserved.
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center lg:text-left">
                <div className="lg:hidden flex justify-center mb-6">
                    <img src="/logo.png" alt="EasyWorkflow" className="h-12 w-12 rounded-lg object-contain" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{isRegisterMode ? '创建账户' : t.welcome}</h2>
                <p className="mt-2 text-sm text-gray-600">{isRegisterMode ? '填写以下信息注册新账户' : t.enterAccount}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    {isRegisterMode && (
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                          <input 
                              type="text" 
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                              placeholder="您的姓名"
                          />
                      </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                            placeholder="name@company.com"
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700">{t.password}</label>
                            {!isRegisterMode && <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-500">{t.forgotPassword}</a>}
                        </div>
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-gray-200"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {isRegisterMode ? '注册中...' : t.loggingIn}
                        </>
                    ) : (
                        <>
                            {isRegisterMode ? '注册' : t.login}
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </button>
            </form>

            {/* <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="bg-gray-50 px-2 text-gray-500">{t.or}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button type="button" className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google
                </button>
                <button type="button" className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                     <svg className="h-4 w-4 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub
                </button>
            </div> */}

            <p className="text-center text-xs text-gray-500">
                {isRegisterMode ? '已有账户？' : t.noAccount}{' '}
                <button 
                  type="button"
                  onClick={() => setIsRegisterMode(!isRegisterMode)}
                  className="font-semibold text-blue-600 hover:text-blue-500"
                >
                  {isRegisterMode ? t.login : t.register}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
