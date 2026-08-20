const GIS_SCRIPT = 'https://accounts.google.com/gsi/client'

let loadPromise: Promise<void> | null = null

export function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = GIS_SCRIPT
      script.async = true
      script.onload = () => resolve()
      script.onerror = () =>
        reject(new Error('Failed to load Google Identity Services'))
      document.head.appendChild(script)
    })
  }
  return loadPromise
}

export function requestGoogleCredential(clientId: string): Promise<string> {
  return loadGoogleIdentityServices().then(
    () =>
      new Promise((resolve, reject) => {
        const google = window.google
        if (!google) {
          reject(new Error('Google Identity Services unavailable'))
          return
        }

        const container = document.createElement('div')
        container.setAttribute('aria-hidden', 'true')
        container.style.cssText =
          'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none'
        document.body.appendChild(container)

        let settled = false
        const finish = (action: () => void) => {
          if (settled) return
          settled = true
          container.remove()
          action()
        }

        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential: string }) => {
            finish(() => resolve(response.credential))
          },
          cancel_on_tap_outside: true,
        })

        google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
        })

        const button = container.querySelector(
          '[role="button"]',
        ) as HTMLElement | null
        if (!button) {
          finish(() =>
            reject(new Error('Google Sign-In button unavailable')),
          )
          return
        }
        button.click()
      }),
  )
}
