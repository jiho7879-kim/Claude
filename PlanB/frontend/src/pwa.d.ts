declare module "virtual:pwa-register/react" {
  import type { ComponentType } from "react"

  interface RegisterSWOptions {
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: unknown) => void
  }

  export const useRegisterSW: (options?: RegisterSWOptions) => {
    needRefresh: [boolean, (v: boolean) => void]
    offlineReady: [boolean, (v: boolean) => void]
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }

  export const ReloadPrompt: ComponentType
}

declare module "*.css" {
  const content: string
  export default content
}
