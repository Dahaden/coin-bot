import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { db, usersTable } from '../db';
import { eq } from 'drizzle-orm';

export const ZCreateUser = z.object({
    name: z.string().nonempty(),
    age: z.number(),
    email: z.string().nonempty(),
});

export const ZUserIdParam = z.object({
    userId: z.string().superRefine((val, ctx) => {
        const parsed = parseInt(val);
        if (isNaN(parsed)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Not a number",
          });
      
          // This is a special symbol you can use to
          // return early from the transform function.
          // It has type `never` so it does not affect the
          // inferred return type.
          return z.NEVER;
        }
      }),
});

type UserIdParam = z.infer<typeof ZUserIdParam>;

type UserIdParamRequest = Request<UserIdParam>;

export class UserController {

    constructor() {
    }

    async create(req: Request, res: Response) {
        const user: typeof usersTable.$inferInsert = req.body;
        await db.insert(usersTable).values(user);
        res.status(StatusCodes.NO_CONTENT).send();
    }

    async getAll(req: Request, res: Response) {
        const rows = await db.select().from(usersTable);
        res.status(StatusCodes.ACCEPTED).send({ rows });
    }

    async get(req: UserIdParamRequest, res: Response) {
        const userId = parseInt(req.params.userId);

        if (userId) {
            const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId));
            if (rows.length === 0) {
                res.status(StatusCodes.NOT_FOUND).send({ error: `userId does not exist in the db`, value: userId });
                return;
            } else {
                res.status(StatusCodes.ACCEPTED).send(rows[0]);
            }
        } else {
            res.status(StatusCodes.BAD_REQUEST).send({ error: 'userId provided not present, or not a number' });
            return;
        }
    }

    async update(req: UserIdParamRequest, res: Response) {
        const userId = parseInt(req.params.userId);

        if (!userId) {
            res.status(StatusCodes.BAD_REQUEST).send({ error: 'userId provided not present, or not a number' });
            return;
        }

        const result = ZCreateUser.partial().safeParse(req.body);

        if (result.success) {
            const user: Partial<typeof usersTable.$inferInsert> = result.data;
            const dbUpdate = await db.update(usersTable).set(user).where(eq(usersTable.id, userId));
            if (dbUpdate.rowCount === 0) {
                res.status(StatusCodes.NOT_FOUND).send({ error: `userId does not exist in the db`, value: userId });
                return;
            }
        } else {
            res.status(StatusCodes.BAD_REQUEST).send(result.error.format());
            return;
        }
        res.status(StatusCodes.NO_CONTENT).send();
    }

    async delete(req: UserIdParamRequest, res: Response) {
        const userId = parseInt(req.params.userId);

        if (userId) {
            const result = await db.delete(usersTable).where(eq(usersTable.id, userId));
            if (result.rowCount === 0) {
                res.status(StatusCodes.NOT_FOUND).send({ error: `userId does not exist in the db`, value: userId });
                return;
            } else {
                res.status(StatusCodes.NO_CONTENT).send();
            }
        } else {
            res.status(StatusCodes.BAD_REQUEST).send({ error: 'userId provided not present, or not a number' });
            return;
        }
    }
}