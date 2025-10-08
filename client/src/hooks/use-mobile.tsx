import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Função auxiliar para detectar dispositivo móvel baseado em múltiplos fatores
function detectMobileDevice(): boolean {
  // 1. Verificar user agent
  const userAgent = navigator.userAgent.toLowerCase()
  const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent)

  // 2. Verificar suporte a touch
  const hasTouchScreen = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)

  // 3. Verificar largura da tela
  const isNarrowScreen = window.innerWidth < MOBILE_BREAKPOINT

  // Se tem user agent mobile OU (tem touch E tela estreita), é mobile
  return isMobileUserAgent || (hasTouchScreen && isNarrowScreen)
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Inicializa com detecção robusta
    const initialValue = detectMobileDevice()
    setIsMobile(initialValue)

    // Salva no sessionStorage para consistência durante a sessão
    sessionStorage.setItem('mesc-is-mobile', String(initialValue))

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    let timeoutId: NodeJS.Timeout | null = null

    const onChange = () => {
      // Cancela timeout anterior se existir
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // Debounce de 150ms para evitar mudanças durante manipulações de DOM
      timeoutId = setTimeout(() => {
        // Verifica se houve mudança real ou se é apenas um glitch do Dialog
        const currentMobile = detectMobileDevice()
        const storedMobile = sessionStorage.getItem('mesc-is-mobile') === 'true'

        // Só muda se a detecção for diferente do valor armazenado E estável
        if (currentMobile !== storedMobile) {
          // Faz dupla verificação após mais 50ms
          setTimeout(() => {
            const doubleCheck = detectMobileDevice()
            if (doubleCheck === currentMobile) {
              setIsMobile(currentMobile)
              sessionStorage.setItem('mesc-is-mobile', String(currentMobile))
            }
          }, 50)
        }
      }, 150)
    }

    mql.addEventListener("change", onChange)

    return () => {
      mql.removeEventListener("change", onChange)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  return !!isMobile
}
