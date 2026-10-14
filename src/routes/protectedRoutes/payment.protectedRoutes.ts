import { Router } from 'express';
import { rateLimiter } from '../../common-folder/middlewares/rateLimit.middleware';
import {
  createPaymentController,
  verifyPaymentController,
} from '../../controllers/protectedControllers/payment.protectedControllers';

const protectedPaymentRouter = Router();

protectedPaymentRouter.route('/create-payment').post(rateLimiter, createPaymentController);
protectedPaymentRouter.route('/verify-payment').post(rateLimiter, verifyPaymentController);

export default protectedPaymentRouter;
