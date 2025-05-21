import { eq, sql } from 'drizzle-orm';
import {db, stepInstance} from '../db'

export class StepInstanceController {

    constructor() {
    }

    async insertStepInstances(step_instance: typeof stepInstance.$inferInsert[]) {
        await db.insert(stepInstance).values(step_instance);
    }

    async getStepInstancesBySession(session_id: number) {
        return await db.select().from(stepInstance).where(eq(stepInstance.session_id, session_id))
            .orderBy(sql`${stepInstance.timeStamp} asc`);
    }
}