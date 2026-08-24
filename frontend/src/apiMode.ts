function envFlagEnabled(value: unknown, defaultEnabled: boolean): boolean {
    if (value === undefined || value === null || value === '') return defaultEnabled
    const normalized = String(value).toLowerCase()
    if (normalized === 'false' || normalized === '0') return false
    if (normalized === 'true' || normalized === '1') return true
    return defaultEnabled
}

/** MSW runs only for `npm run dev` (Vite mode `development`). */
export function isMockApiEnabled(): boolean {
    return (
        import.meta.env.MODE === 'development' &&
        envFlagEnabled(import.meta.env.VITE_ENABLE_MOCKS, true)
    )
}
