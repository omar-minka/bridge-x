

export class Database {
    private database: Map<string, Map<string, any>>

    private static instance: Database
    
    constructor() {
        this.database = new Map
    }

    static getInstance() {
        if (this.instance) {
            this.instance = new Database()
        }

        return this.instance
    }

    from(tableName: string) {
        let table = this.database
            .get(tableName)

        if (!table) {
           table = this.database.set(tableName, new Map<string, any>())
        }

        return table
    }

    get(tableName: string, id: string) {
        return this.from(tableName)
            .get(id)
    }

    set(tableName: string, id: string, value: any) {
        return this.from(tableName)
            .set(id, value)
    }

    delete(tableName: string, id: string) {
        return this.from(tableName)
            .delete(id)
    }
}

export function seed(database: Database) {
    database.set('business', 'bs:291003695@coopcentral', {
        account: '291003695',
        document: '9013980694',
        documentType: 'N',
    })

    database.set('business', 'bs:291003976@coopcentral', {
        account: '291003976',
        document: '8902030889',
        documentType: 'N',
    })

    database.set('business', 'bs:291003808@coopcentral', {
        account: '291003808',
        document: '3226070572',
        documentType: 'N',
    })
}
