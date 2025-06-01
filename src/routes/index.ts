import express, { Application } from 'express';
import { validateRequest } from 'zod-express-middleware';


export const applyRoutes = (app: Application) => {

    // const userController = new UserController();

    const userRouter = express.Router();

    // const userRouterWithoutId = userRouter.route('/users');
    // userRouterWithoutId.post(
    //     validateRequest({ body: ZCreateUser }),
    // userController.create);
    // userRouterWithoutId.get(userController.getAll);

    // const userRouterWithId = userRouter.route('/users/:userId');
    // userRouterWithId.get(
    //     validateRequest({ params: ZUserIdParam }),
    //     userController.get
    // );
    // userRouterWithId.put(
    //     validateRequest({ body: ZCreateUser.partial(), params: ZUserIdParam }),
    //     userController.update
    // );
    // userRouterWithId.delete(
    //     validateRequest({ params: ZUserIdParam }),
    //     userController.delete
    // );

    app.use('/api/v1', userRouter);
}