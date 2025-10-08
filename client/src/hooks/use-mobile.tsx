import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      // Adiciona uma verificação adicional para garantir detecção correta
      // Usa requestAnimationFrame para garantir que o viewport esteja estável
      requestAnimationFrame(() => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
      })
    }
    mql.addEventListener("change", onChange)
    // Inicializa com requestAnimationFrame para garantir viewport correto
    requestAnimationFrame(() => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    })
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
