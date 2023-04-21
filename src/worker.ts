import {Database} from "./database";

export const doWork = () => {
    const database = Database.getInstance()

    console.log(`[worker] woke up, finding pending or running jobs to check`)

    try {
        let pendingOrRunningJobs = Array.from(
            database.from('jobs').values()
        ).filter((job) => job.status === 'RUNNING' || job.status === 'PENDING')

        console.log(`[worker] currently with ${pendingOrRunningJobs.length} pending jobs..`)

        if (pendingOrRunningJobs.length > 0) {
            pendingOrRunningJobs.forEach((job) => {
                console.log(`[worker] calling run on job ${job.id}`)
                job.run.apply(null, job.args)
            })
        }
    } catch (e) {

    }

    console.log(`[worker] going to sleep for 10 seconds..`)
    setTimeout(doWork, 10000); // wait 1000 ms
}