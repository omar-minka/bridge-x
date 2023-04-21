import {Database} from "./database";

export const doWork = () => {
    const database = Database.getInstance()

    try {
        let pendingOrRunningJobs: Map<string, any> = database.from('jobs')
            .values()
            .filter((job) => job.status === 'RUNNING' || job.status === 'PENDING')
    } catch (e) {

    }

    setTimeout(doWork, 1000); // wait 1000 ms
}