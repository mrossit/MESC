import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Detecção inicial baseada no user agent (não muda com dialog)
    const userAgent = navigator.userAgent.toLowerCase()
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent)

    // Se é dispositivo mobile por user agent, usa isso como verdade
    if (isMobileDevice) {
      setIsMobile(true)
      return
    }

    // Se não é mobile por user agent, usa breakpoint de largura
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mql.addEventListener("change", checkScreenSize)
    checkScreenSize()

    return () => mql.removeEventListener("change", checkScreenSize)
  }, [])

  return !!isMobile
}
