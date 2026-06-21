import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
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
                        // Novas cores - Paleta adicional para maior visibilidade
                        sage: {
                                DEFAULT: '#A2B38B',        // Verde oliva/sálvia
                                light: '#B8C6A5',          // Variação mais clara
                                dark: '#8A9C76',           // Variação mais escura
                                muted: '#94A580'           // Tom desbotado
                        },
                        cream: {
                                light: '#E4E9BE',          // Bege claro amarelado
                                vanilla: '#F0F4D3',        // Mais claro ainda
                                warm: '#D8DDA8'            // Mais quente
                        },
                        burgundy: {
                                DEFAULT: '#722F37',        // Vinho litúrgico
                                rich: '#8B0000',           // Vermelho litúrgico
                                deep: '#4F1F28',           // Mais profundo
                                soft: '#96525B'            // Tom suave
                        },
                        gold: {
                                DEFAULT: '#C5A059',
                                soft: '#E0CC9E',
                                shadow: 'rgba(197, 160, 89, 0.3)'
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
                                brown: '#222222'
                        },
                        gray: {
                                dark: '#2C2C2C',
                                lead: '#3E3E3E'
                        },
                        neutral: {
                                peanut: 'rgb(var(--peanut) / <alpha-value>)',
                                chalkBeige: 'rgb(var(--chalk-beige) / <alpha-value>)',
                                whiteBeige: 'rgb(var(--white-beige) / <alpha-value>)',
                                cream: 'rgb(var(--cream) / <alpha-value>)',
                                neutral: 'rgb(var(--primary) / <alpha-value>)',
                                peachCream: 'rgb(var(--peach-cream) / <alpha-value>)',
                                textDark: 'rgb(var(--text-dark) / <alpha-value>)',
                                textMedium: 'rgb(var(--text-medium) / <alpha-value>)',
                                textLight: 'rgb(var(--text-light) / <alpha-value>)',
                                accentWarm: 'rgb(var(--accent-warm) / <alpha-value>)',
                                accentSoft: 'rgb(var(--accent-soft) / <alpha-value>)',
                                accentNeutral: 'rgb(var(--accent-neutral) / <alpha-value>)',
                                badgeWarm: 'rgb(var(--badge-warm) / <alpha-value>)',
                                badgeNeutral: 'rgb(var(--badge-neutral) / <alpha-value>)',
                                badgeLight: 'rgb(var(--badge-light) / <alpha-value>)',
                                badgeSoft: 'rgb(var(--badge-soft) / <alpha-value>)',
                                badgeGold: 'rgb(var(--badge-gold) / <alpha-value>)',
                                border: 'rgb(var(--border) / <alpha-value>)'
                        },
                        dark: {
                                '1': 'rgb(var(--dark-1) / <alpha-value>)',
                                '2': 'rgb(var(--dark-2) / <alpha-value>)',
                                '3': 'rgb(var(--dark-3) / <alpha-value>)',
                                '4': 'rgb(var(--dark-4) / <alpha-value>)',
                                '5': 'rgb(var(--dark-5) / <alpha-value>)',
                                '6': 'rgb(var(--dark-6) / <alpha-value>)',
                                '7': 'rgb(var(--dark-7) / <alpha-value>)',
                                '8': 'rgb(var(--dark-8) / <alpha-value>)',
                                '9': 'rgb(var(--dark-9) / <alpha-value>)',
                                '10': 'rgb(var(--dark-10) / <alpha-value>)',
                                gold: 'rgb(var(--dark-gold) / <alpha-value>)',
                                terracotta: 'rgb(var(--dark-terracotta) / <alpha-value>)',
                                copper: 'rgb(var(--dark-copper) / <alpha-value>)',
                                bronze: 'rgb(var(--dark-bronze) / <alpha-value>)'
                        },
                        text: {
                                light: 'rgb(var(--text-light) / <alpha-value>)',
                                gold: 'rgb(var(--text-gold) / <alpha-value>)'
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
                        liturgical: '0 4px 20px rgba(44, 44, 44, 0.1)',
                        sacred: '0 10px 25px -5px rgb(114 47 55 / 0.12), 0 4px 6px -2px rgb(197 160 89 / 0.10)',
                        'sacred-lg': '0 20px 40px -5px rgb(114 47 55 / 0.16), 0 10px 15px -3px rgb(44 44 44 / 0.10)'
                },
                backgroundImage: {
                        'gradient-bg': 'linear-gradient(135deg, #FDFBF7 0%, #F2E9DA 100%)',
                        'pattern-bg': 'radial-gradient(circle at 1px 1px, rgba(197, 160, 89, 0.1) 1px, transparent 0)',
                        'sacred-gradient': 'linear-gradient(135deg, #722F37 0%, #8B0000 100%)',
                        'gold-gradient': 'linear-gradient(135deg, #C5A059 0%, #B38F4D 100%)'
                },
                backgroundSize: {
                        pattern: '20px 20px'
                }
        }
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
