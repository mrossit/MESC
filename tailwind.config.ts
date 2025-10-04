import type { Config } from "tailwindcss";

export default {
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
        extend: {
                screens: {
                        xs: '475px',
                        sm: '640px',
                        md: '768px',
                        lg: '1024px',
                        xl: '1280px',
                        '2xl': '1536px',
                        '3xl': '1920px',
                        '4k': '2560px',
                        '5k': '2880px'
                },
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)'
                },
                colors: {
                        background: 'rgb(var(--background) / <alpha-value>)',
                        foreground: 'rgb(var(--foreground) / <alpha-value>)',
                        card: {
                                DEFAULT: 'rgb(var(--card) / <alpha-value>)',
                                foreground: 'rgb(var(--card-foreground) / <alpha-value>)'
                        },
                        popover: {
                                DEFAULT: 'rgb(var(--popover) / <alpha-value>)',
                                foreground: 'rgb(var(--popover-foreground) / <alpha-value>)'
                        },
                        primary: {
                                DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
                                foreground: 'rgb(var(--primary-foreground) / <alpha-value>)'
                        },
                        pearl: {
                                DEFAULT: '#FAF8F3',
                                dark: '#C4B5A0'
                        },
                        beige: {
                                DEFAULT: '#F5E6D3',
                                warm: '#EDD9C4'
                        },
                        gold: {
                                DEFAULT: '#D4AF37',
                                soft: '#E6D7B8',
                                shadow: 'rgba(212, 175, 55, 0.3)'
                        },
                        bronze: {
                                DEFAULT: '#8B6F47',
                                aged: '#6B5637',
                                satin: '#A0845C'
                        },
                        copper: {
                                DEFAULT: '#B87333',
                                aged: '#935E2E'
                        },
                        charcoal: {
                                DEFAULT: '#1A1A1A',
                                brown: '#1F1B18'
                        },
                        gray: {
                                dark: '#2A2A2A',
                                lead: '#3E3E3E'
                        },
                        pastel: {
                                blue: '#B8D4E3',
                                green: '#C8E6C9',
                                yellow: '#FFF3CD',
                                red: '#F8D7DA',
                                purple: '#E1BEE7',
                                orange: '#FFE0B2',
                                pink: '#FCE4EC',
                                teal: '#B2DFDB'
                        },
                        secondary: {
                                DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
                                foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)'
                        },
                        muted: {
                                DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
                                foreground: 'rgb(var(--muted-foreground) / <alpha-value>)'
                        },
                        accent: {
                                DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
                                foreground: 'rgb(var(--accent-foreground) / <alpha-value>)'
                        },
                        destructive: {
                                DEFAULT: 'rgb(var(--destructive) / <alpha-value>)',
                                foreground: 'rgb(var(--destructive-foreground) / <alpha-value>)'
                        },
                        border: 'rgb(var(--border) / <alpha-value>)',
                        input: 'rgb(var(--input) / <alpha-value>)',
                        ring: 'rgb(var(--ring) / <alpha-value>)',
                        chart: {
                                '1': 'var(--chart-1)',
                                '2': 'var(--chart-2)',
                                '3': 'var(--chart-3)',
                                '4': 'var(--chart-4)',
                                '5': 'var(--chart-5)'
                        },
                        sidebar: {
                                DEFAULT: 'rgb(var(--sidebar-background) / <alpha-value>)',
                                foreground: 'rgb(var(--sidebar-foreground) / <alpha-value>)',
                                primary: 'rgb(var(--sidebar-primary) / <alpha-value>)',
                                'primary-foreground': 'rgb(var(--sidebar-primary-foreground) / <alpha-value>)',
                                accent: 'rgb(var(--sidebar-accent) / <alpha-value>)',
                                'accent-foreground': 'rgb(var(--sidebar-accent-foreground) / <alpha-value>)',
                                border: 'rgb(var(--sidebar-border) / <alpha-value>)',
                                ring: 'rgb(var(--sidebar-ring) / <alpha-value>)'
                        }
                },
                fontFamily: {
                        sans: [
                                'var(--font-sans)'
                        ],
                        serif: [
                                'var(--font-serif)'
                        ],
                        mono: [
                                'var(--font-mono)'
                        ],
                        heading: [
                                'var(--font-heading)'
                        ]
                },
                keyframes: {
                        'accordion-down': {
                                from: {
                                        height: '0'
                                },
                                to: {
                                        height: 'var(--radix-accordion-content-height)'
                                }
                        },
                        'accordion-up': {
                                from: {
                                        height: 'var(--radix-accordion-content-height)'
                                },
                                to: {
                                        height: '0'
                                }
                        },
                        'fade-in': {
                                from: {
                                        opacity: '0',
                                        transform: 'translateY(20px)'
                                },
                                to: {
                                        opacity: '1',
                                        transform: 'translateY(0)'
                                }
                        },
                        'slide-up': {
                                from: {
                                        transform: 'translateY(100%)'
                                },
                                to: {
                                        transform: 'translateY(0)'
                                }
                        },
                        'pulse-slow': {
                                '0%, 100%': {
                                        opacity: '1'
                                },
                                '50%': {
                                        opacity: '0.5'
                                }
                        }
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out',
                        'fade-in': 'fade-in 0.5s ease-in-out',
                        'slide-up': 'slide-up 0.3s ease-out',
                        'pulse-slow': 'pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                },
                boxShadow: {
                        liturgical: '0 4px 20px rgba(92, 64, 51, 0.1)',
                        sacred: '0 10px 25px -5px rgb(139 58 58 / 0.1), 0 4px 6px -2px rgb(139 58 58 / 0.05)',
                        'sacred-lg': '0 20px 40px -5px rgb(139 58 58 / 0.15), 0 10px 15px -3px rgb(139 58 58 / 0.1)'
                },
                backgroundImage: {
                        'gradient-bg': 'linear-gradient(135deg, #F8F4ED 0%, #E9DCC9 100%)',
                        'pattern-bg': 'radial-gradient(circle at 1px 1px, rgba(201, 168, 106, 0.1) 1px, transparent 0)',
                        'sacred-gradient': 'linear-gradient(135deg, #8B3A3A 0%, #A05244 100%)',
                        'gold-gradient': 'linear-gradient(135deg, #C9A86A 0%, #A07C48 100%)'
                },
                backgroundSize: {
                        pattern: '20px 20px'
                }
        }
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
