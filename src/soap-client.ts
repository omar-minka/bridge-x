import axios from 'axios'
import * as https from 'https'
import { Client, BasicAuthSecurity, createClientAsync, IOptions } from 'soap'

export async function createSoapClient(
    url: string,
    user: string,
    password: string,
) {
    if (!url) {
        return {} as Client
    }

    const axiosInstance = axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: true,
        }),
    })

    const client = await createClientAsync(url, {
        overrideRootElement: {
            namespace: 'bcc',
            xmlnsAttributes: [
                {
                    name: 'xmlns:bcc',
                    value: 'http://bccservice.coopcentral.com/',
                },
            ],
        },
        ignoredNamespaces: {
            namespaces: ['bcc'],
            override: true,
        },
        request: axiosInstance,
    } as IOptions)

    client.setSecurity(new BasicAuthSecurity(user, password))

    return client
}