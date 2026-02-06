/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ============================================
        // LINKEDEYE FINSPOT - ENTERPRISE DESIGN SYSTEM v7.0
        // Modern Corporate Aesthetic - 2026
        // ============================================

        // Neutral Scale - Sophisticated Gray Palette
        gray: {
          25: '#fcfcfd',
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },

        // Primary - Electric Indigo (Modern Corporate)
        primary: {
          25: '#f5f8ff',
          50: '#eef4ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a4bcfd',
          400: '#8098f9',
          500: '#6172f3',
          600: '#444ce7',
          700: '#3538cd',
          800: '#2d31a6',
          900: '#2b2f83',
          950: '#1a1d50',
        },

        // Secondary - Ocean Teal (Fresh Accent)
        secondary: {
          25: '#f5feff',
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },

        // Navy - Deep Space (Sidebar & Dark Surfaces)
        navy: {
          25: '#f8fafc',
          50: '#f0f4ff',
          100: '#e0e8ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#1e3a5f',
          600: '#162d4d',
          700: '#0f1f3a',
          800: '#0a1628',
          900: '#060d17',
          950: '#030709',
        },

        // Success - Emerald Green
        success: {
          25: '#f6fef9',
          50: '#ecfdf5',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },

        // Warning - Amber Gold
        warning: {
          25: '#fffcf5',
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },

        // Danger - Vibrant Red
        danger: {
          25: '#fffbfa',
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },

        // High Priority - Burnt Orange
        high: {
          25: '#fffaf5',
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },

        // Info - Sky Blue
        info: {
          25: '#f5fbff',
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },

        // Neutral/Paused - Slate
        paused: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },

        // Accent Colors for Data Visualization
        accent: {
          violet: '#8b5cf6',
          purple: '#a855f7',
          fuchsia: '#d946ef',
          pink: '#ec4899',
          rose: '#f43f5e',
          cyan: '#06b6d4',
          emerald: '#10b981',
          lime: '#84cc16',
        },
      },

      fontFamily: {
        // Modern Typography Stack
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        heading: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
        display: ['Inter', 'SF Pro Display', '-apple-system', 'sans-serif'],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem', letterSpacing: '0.025em' }],
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0' }],
        'base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.02em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }],
        '5xl': ['3rem', { lineHeight: '1.16', letterSpacing: '-0.03em' }],
        '6xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
      },

      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '17': '4.25rem',
        '18': '4.5rem',
        '19': '4.75rem',
        '21': '5.25rem',
        '22': '5.5rem',
        '84': '21rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
        '144': '36rem',
      },

      backgroundImage: {
        // Premium Gradient Collection
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',

        // Sidebar Gradients
        'sidebar-light': 'linear-gradient(180deg, #0f1f3a 0%, #1e3a5f 50%, #162d4d 100%)',
        'sidebar-dark': 'linear-gradient(180deg, #060d17 0%, #0a1628 50%, #0f1f3a 100%)',

        // Button Gradients
        'btn-primary': 'linear-gradient(135deg, #6172f3 0%, #444ce7 100%)',
        'btn-primary-hover': 'linear-gradient(135deg, #444ce7 0%, #3538cd 100%)',
        'btn-secondary': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        'btn-success': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        'btn-danger': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',

        // Status Gradients
        'status-critical': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        'status-high': 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        'status-medium': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'status-healthy': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        'status-paused': 'linear-gradient(135deg, #64748b 0%, #475569 100%)',

        // Premium Effects
        'aurora': 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)',
        'mesh': 'radial-gradient(at 40% 20%, hsla(265, 89%, 68%, 0.12) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189, 94%, 43%, 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(265, 89%, 68%, 0.08) 0px, transparent 50%)',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
        'glass-shine': 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%)',
        'card-glow': 'radial-gradient(ellipse at top, rgba(97, 114, 243, 0.15) 0%, transparent 50%)',

        // Noise texture for depth
        'noise': 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
      },

      boxShadow: {
        // Refined Shadow System
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'DEFAULT': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '3xl': '0 35px 60px -15px rgb(0 0 0 / 0.3)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',

        // Card Shadows
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08), 0 0 0 1px rgb(0 0 0 / 0.02)',
        'card-hover': '0 10px 25px -5px rgb(0 0 0 / 0.12), 0 8px 10px -6px rgb(0 0 0 / 0.08)',
        'card-dark': '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3), 0 0 0 1px rgb(255 255 255 / 0.03)',
        'card-dark-hover': '0 10px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.3)',

        // Dropdown & Popover Shadows
        'dropdown': '0 12px 28px -8px rgb(0 0 0 / 0.15), 0 4px 10px -4px rgb(0 0 0 / 0.08)',
        'dropdown-dark': '0 12px 28px -8px rgb(0 0 0 / 0.5), 0 4px 10px -4px rgb(0 0 0 / 0.4)',

        // Glow Effects
        'glow-sm': '0 0 15px rgb(97 114 243 / 0.15)',
        'glow': '0 0 25px rgb(97 114 243 / 0.2)',
        'glow-lg': '0 0 35px rgb(97 114 243 / 0.25)',
        'glow-xl': '0 0 50px rgb(97 114 243 / 0.3)',

        // Colored Glows
        'glow-primary': '0 0 20px rgb(97 114 243 / 0.4)',
        'glow-success': '0 0 20px rgb(34 197 94 / 0.4)',
        'glow-warning': '0 0 20px rgb(245 158 11 / 0.4)',
        'glow-danger': '0 0 20px rgb(239 68 68 / 0.4)',
        'glow-info': '0 0 20px rgb(14 165 233 / 0.4)',

        // Focus Ring
        'ring-primary': '0 0 0 3px rgb(97 114 243 / 0.2)',
        'ring-danger': '0 0 0 3px rgb(239 68 68 / 0.2)',

        // Button Shadows
        'btn': '0 1px 2px 0 rgb(0 0 0 / 0.06), 0 1px 3px 0 rgb(0 0 0 / 0.1)',
        'btn-hover': '0 4px 12px 0 rgb(0 0 0 / 0.12)',
        'btn-primary': '0 1px 2px 0 rgb(97 114 243 / 0.15), 0 4px 12px 0 rgb(97 114 243 / 0.2)',
      },

      animation: {
        // Entrance Animations
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-down': 'fadeInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-up': 'slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-down': 'slideInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in-bounce': 'scaleInBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',

        // Continuous Animations
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 5s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'shimmer-fast': 'shimmer 1.2s linear infinite',
        'gradient': 'gradient 6s ease infinite',
        'spin-slow': 'spin 4s linear infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',

        // Interactive Animations
        'wiggle': 'wiggle 0.5s ease-in-out',
        'pop': 'pop 0.3s ease',
        'shake': 'shake 0.6s ease-in-out',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',

        // Loading
        'skeleton': 'skeleton 1.8s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInDown: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleInBounce: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px currentColor' },
          '50%': { boxShadow: '0 0 20px currentColor' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-2deg)' },
          '75%': { transform: 'rotate(2deg)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
        },
        skeleton: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },

      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },

      backdropBlur: {
        'xs': '2px',
        '3xl': '64px',
      },

      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
        '600': '600ms',
      },

      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bounce': 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
        '150': '150',
        '200': '200',
      },

      lineHeight: {
        'tighter': '1.1',
        'tight': '1.25',
        'snug': '1.375',
      },

      letterSpacing: {
        'tightest': '-0.04em',
        'tighter': '-0.03em',
        'tight': '-0.02em',
      },
    },
  },
  plugins: [],
};
