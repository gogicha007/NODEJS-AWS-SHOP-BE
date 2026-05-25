type Event = {
    headers?: {
        authorization?: string
        Authorization?: string
    },
    methodArn?: string
}

export const handler = async (event: Event) => {
    const headers = event.headers || {}

    const authHeader = headers['Authorization'] || headers['authorization']

    const tmp = event.methodArn?.split(':')
    if (!tmp || !authHeader) throw new Error('Unauthorized')

    const apiGatewayArntmp = tmp[5].split('/')
    const awsAccountId = tmp[4]
    const region = tmp[3]
    const restApiId = apiGatewayArntmp[0]
    const state = apiGatewayArntmp[1]
    const method = apiGatewayArntmp[2]
    let resource = '/'
    if (apiGatewayArntmp[3]) {
        resource += apiGatewayArntmp[3]
    }

    try {
        const [authType, encoded] = authHeader.split(' ')

        if (authType.toLowerCase() !== 'basic' || !encoded) {
            return { isAuthorized: false, context: { error: 'Invalid header format' } }
        }

        const decoded = Buffer.from(encoded, 'base64').toString('utf8')
        const [username, password] = decoded.split(':')

        if (username && password && password === process.env[username]) return generateAllow('me', event.methodArn)
    } catch {
        return {
            isAuthorized: false, context: { error: 'Access denied' }
        }
    }

    return {
        isAuthorized: false, context: { error: 'Access denied' }
    }
}


const generatePolicy = (principalId: string, effect: string, resource: string) => {
    const authResponce = {}
    Object.assign(authResponce, { principalId: principalId })

    return authResponce
}

const generateAllow = (principalId: string, resource: string) => {
    return generatePolicy(principalId, 'Allow', resource)
}

const generateDeny = (principalId: string, resource: string) => {
    return generatePolicy(principalId, "Deny", resource)
}