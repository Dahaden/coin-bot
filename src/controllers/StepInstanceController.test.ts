import { beforeEach, describe, expect, test, beforeAll } from 'vitest'
import { StepInstanceController } from './StepInstanceController';
import { db } from '../db';
import { sql } from 'drizzle-orm';



describe("StepInstanceController", () => {
    
    beforeAll(async () => {
        await db.execute(sql`TRUNCATE TABLE step_instances`);
    });

    let stepInstanceController = new StepInstanceController();
    beforeEach(() => {
        stepInstanceController = new StepInstanceController();
    });

    test('Add step Instance', async () => {
        await stepInstanceController.insertStepInstances([
            { session_id: 3, url: '/home', timeStamp: 0 } 
        ]);
        const stepSessions = await stepInstanceController.getStepInstancesBySession(3);
        expect(stepSessions.length).toBe(1);
        expect(stepSessions[0]).toEqual({
            session_id: 3, url: '/home', timeStamp: 0,
        });
    });
});