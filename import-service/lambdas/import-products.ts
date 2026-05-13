
import { getUploadUrl } from "./signer"

const headers = {
    "Content-Type": "application/json"
}

type QueryStringParameters = {
    name?: string
}

type Event = {
    queryStringParameters?: QueryStringParameters
}

function isCsvFile(filename: string) {
    return /\.csv$/i.test(filename)
}

export const handler = async (event: Event) => {
    console.log("import-produsts-file request", {
        event,
        queryStringParameters: event?.queryStringParameters
    })

    try {
        const fileName = event?.queryStringParameters?.name

        if (!fileName || !isCsvFile(fileName)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Missing fileName or not valid csv file' })
            }
        }

        const url = await getUploadUrl(process.env.BUCKET_NAME!, `uploaded/${fileName}`)

        return {
            statusCode: 200,
            headers,
            body: url
        }
    } catch (err) {
        console.error("import poducts file error", err)
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: "Internal server errorF" })
        }
    }
}