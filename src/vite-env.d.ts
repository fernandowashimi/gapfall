/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize(config: {
        client_id: string
        callback: (response: GoogleCredentialResponse) => void
        cancel_on_tap_outside?: boolean
      }): void
      renderButton(
        parent: HTMLElement,
        options: {
          type?: string
          theme?: string
          size?: string
        },
      ): void
    }
  }
}

interface Window {
  google?: GoogleIdentityServices
}
