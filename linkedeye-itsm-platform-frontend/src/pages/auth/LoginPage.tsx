import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn, Copy, Check, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const loginSchema = z.object({
  username: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const { login, isLoading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    const loginData = {
      email: data.username.includes('@') ? data.username : undefined,
      username: !data.username.includes('@') ? data.username : undefined,
      password: data.password,
      rememberMe: data.rememberMe,
    };
    await login(loginData);
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <div>
      {/* Form Header - Modern Premium Design */}
      <div className="mb-9">
        <h1 className="text-[32px] font-bold text-slate-900 mb-2 tracking-tight">Welcome Back</h1>
        <p className="text-[15px] text-slate-500 leading-relaxed">
          Sign in to access your incident management dashboard and monitor your infrastructure.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-3.5 px-4 bg-red-50 border border-red-200 rounded-[10px] flex items-center gap-3 text-sm text-red-800">
          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <span className="text-red-600 text-xs">!</span>
          </div>
          <span>{error}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Email Field */}
        <div className="mb-6">
          <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-2">
            Email Address
          </label>
          <input
            type="text"
            id="username"
            placeholder="Enter your work email"
            autoComplete="email"
            className={`w-full px-4 py-3.5 text-[15px] border-2 rounded-xl transition-all duration-200 outline-none
              ${errors.username
                ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                : 'border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100'
              }
              placeholder:text-slate-400`}
            {...register('username')}
          />
          {errors.username && (
            <p className="mt-1.5 text-sm text-red-600">{errors.username.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              className={`w-full px-4 py-3.5 pr-12 text-[15px] border-2 rounded-xl transition-all duration-200 outline-none
                ${errors.password
                  ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                  : 'border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100'
                }
                placeholder:text-slate-400`}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Form Options */}
        <div className="flex items-center justify-between mb-7">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              {...register('rememberMe')}
              className="w-5 h-5 rounded-md border-2 border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <span className="text-sm text-slate-700">Remember me for 30 days</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-amber-600 hover:text-amber-700 hover:underline transition-all"
          >
            Forgot Password?
          </Link>
        </div>

        {/* Sign In Button - Modern Premium Gradient */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 px-4 rounded-xl text-white text-base font-semibold flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            boxShadow: isLoading ? 'none' : '0 8px 24px -4px rgba(245, 158, 11, 0.35)',
          }}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LogIn size={18} />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-7">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 bg-white text-sm text-gray-500">or continue with SSO</span>
        </div>
      </div>

      {/* SSO Buttons */}
      <div className="flex gap-3 mb-7">
        <button
          type="button"
          className="flex-1 py-3.5 px-4 border-2 border-gray-200 rounded-[10px] text-sm font-medium text-gray-700 flex items-center justify-center gap-2.5 hover:bg-gray-50 hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200"
        >
          <div
            className="w-5 h-5 rounded"
            style={{ background: 'linear-gradient(135deg, #00a4ef, #0078d4)' }}
          />
          <span>Microsoft AD</span>
        </button>
        <button
          type="button"
          className="flex-1 py-3.5 px-4 border-2 border-gray-200 rounded-[10px] text-sm font-medium text-gray-700 flex items-center justify-center gap-2.5 hover:bg-gray-50 hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200"
        >
          <div
            className="w-5 h-5 rounded"
            style={{ background: 'linear-gradient(135deg, #ea4335, #c53929)' }}
          />
          <span>Google Workspace</span>
        </button>
      </div>

      {/* Sign Up Link */}
      <p className="text-center text-sm text-slate-500 mb-7">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-amber-600 hover:underline">
          Request Access
        </Link>
      </p>

      {/* Demo Credentials Box - Only visible in development when env vars are set */}
      {import.meta.env.DEV && import.meta.env.VITE_DEMO_EMAIL && (
        <div
          className="p-5 rounded-xl border border-amber-200"
          style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}
        >
          <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <Info size={16} className="text-amber-600" />
            Demo Credentials (Dev Only)
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[13px]">
              <strong className="min-w-[70px] text-slate-700">Email:</strong>
              <span className="px-2.5 py-1 bg-white/70 rounded-lg font-mono text-amber-800">
                {import.meta.env.VITE_DEMO_EMAIL}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(import.meta.env.VITE_DEMO_EMAIL, 'email')}
                className="ml-auto p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors"
                title="Copy email"
              >
                {copiedField === 'email' ? (
                  <Check size={14} className="text-emerald-500" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <strong className="min-w-[70px] text-slate-700">Password:</strong>
              <span className="px-2.5 py-1 bg-white/70 rounded-lg font-mono text-amber-800">
                {import.meta.env.VITE_DEMO_PASSWORD}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(import.meta.env.VITE_DEMO_PASSWORD, 'password')}
                className="ml-auto p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors"
                title="Copy password"
              >
                {copiedField === 'password' ? (
                  <Check size={14} className="text-emerald-500" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
