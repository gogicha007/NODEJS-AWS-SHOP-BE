type Event = {
    headers?: {
        authorization?: string
        Authorization?: string
    }
}

export const handler = async (event: Event) => {
    const headers = event.headers || {}

    const authHeader = headers['Authorization'] || headers['authorization']

    if (!authHeader) { throw new Error('Unauthorized') }

    try {
        const [authType, encoded] = authHeader.split(' ')

        if (authType.toLowerCase() !== 'basic' || !encoded) {
            return { isAuthorized: false, context: { error: 'Invalid header format' } }
        }

        const decoded = Buffer.from(encoded, 'base64').toString('utf8')
        const [username, password] = decoded.split(':')

        if (username && password && password === process.env[username]) return {
            isAuthorized: true, context: { user: username }
        }
    } catch {
        return {
            isAuthorized: false, context: { error: 'Access denied' }
        }
    }

    return {
        isAuthorized: false, context: { error: 'Access denied' }
    }
}