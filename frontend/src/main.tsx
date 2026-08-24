import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { isMockApiEnabled } from './apiMode'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient()
const MSW_RELOAD_KEY = 'kanbain:msw-unregistered'

async function disableMocking(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return true

    const controlling = navigator.serviceWorker.controller !== null
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))

    if (controlling && sessionStorage.getItem(MSW_RELOAD_KEY) !== '1') {
        sessionStorage.setItem(MSW_RELOAD_KEY, '1')
        window.location.reload()
        return false
    }

    return true
}

async function enableMocking(): Promise<boolean> {
    if (!isMockApiEnabled()) {
        return disableMocking()
    }

    sessionStorage.removeItem(MSW_RELOAD_KEY)
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
    return true
}

void enableMocking().then((shouldRender) => {
    if (!shouldRender) return

    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </StrictMode>,
    )
})
