// Plaid Link service for Vue.js
// Uses Plaid Link CDN script

let plaidHandler = null
let plaidLoaded = false

// Load Plaid Link script
const loadPlaidScript = () => {
  return new Promise((resolve, reject) => {
    if (plaidLoaded) {
      resolve()
      return
    }

    if (window.Plaid) {
      plaidLoaded = true
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    script.onload = () => {
      plaidLoaded = true
      resolve()
    }
    script.onerror = () => {
      reject(new Error('Failed to load Plaid Link script'))
    }
    document.head.appendChild(script)
  })
}

export default {
  async initialize(linkToken, onSuccess, onExit) {
    try {
      await loadPlaidScript()

      if (plaidHandler) {
        plaidHandler.destroy()
      }

      plaidHandler = window.Plaid.create({
        token: linkToken,
        onSuccess: (publicToken, metadata) => {
          if (onSuccess) {
            onSuccess(publicToken, metadata)
          }
        },
        onExit: (err, metadata) => {
          if (onExit) {
            onExit(err, metadata)
          }
        },
        onEvent: (eventName, metadata) => {
          console.log('Plaid event:', eventName, metadata)
        }
      })

      return plaidHandler
    } catch (error) {
      console.error('Error initializing Plaid:', error)
      throw error
    }
  },

  open() {
    if (plaidHandler) {
      plaidHandler.open()
    } else {
      console.error('Plaid handler not initialized. Call initialize() first.')
    }
  },

  destroy() {
    if (plaidHandler) {
      plaidHandler.destroy()
      plaidHandler = null
    }
  }
}



