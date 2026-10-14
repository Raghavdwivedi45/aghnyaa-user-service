import { Request, Response } from 'express';
import { asyncHandler } from '../../common-folder/utils/asyncHandler';
import { ApiResponse } from '../../common-folder/utils/apiResponse';
import { User } from '../../models/user.model';
import { UserPayment } from '../../models/userPayment.model';
import { ApiError } from '../../common-folder/utils/apiError';
import { paymentMapper } from '../../common-folder/constants/constants';
import Razorpay from 'razorpay';
import { userPaymentType } from '../../common-folder/types/types';
import { getAmountInPaise } from '../../utils/helperFunctions';
import crypto from 'crypto';

// https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps
// https://medium.com/@aifuture/razorpay-payment-gateway-integration-in-node-js-react-js-6a560740bba7
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_TEST_API_KEY,
  key_secret: process.env.RAZORPAY_TEST_KEY_SECRET,
});

export const createPaymentController = asyncHandler(async (req: Request, res: Response) => {
  const _id = req?.user?._id;
  if (!_id) throw new ApiError(401, 'You need to login first.');

  const paymentType: userPaymentType = req?.body?.paymentType;
  const amount: number = req?.body?.amount; // Coming in paise

  if (
    !paymentType ||
    !amount ||
    !paymentMapper[paymentType] ||
    paymentMapper[paymentType] !== amount
  ) {
    throw new ApiError(400, 'Beware of fraudulence.');
  }

  const user = await User.findById(_id);
  if (!user) {
    throw new ApiError(401, 'You need to login first.');
  }

  const razorpayOptions = {
    amount, // Amount in paise
    currency: 'INR',
    receipt: `Aghnyaa | ${paymentType}`,
  };

  const order = await razorpay.orders.create(razorpayOptions);

  if (!order.id) {
    console.log('Order without a razorpay id | ', order);
    throw new ApiError(500, 'Something went wrong while creating the payment.');
  }

  await UserPayment.create({ userId: _id, paymentType, amount: amount, paymentId: order.id });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { ...order, razorpay_public_key: process.env.RAZORPAY_TEST_API_KEY },
        `Payment of ${amount} paise created successfully`,
      ),
    );
});

export const verifyPaymentController = asyncHandler(async (req: Request, res: Response) => {
  const _id = req?.user?._id;
  if (!_id) throw new ApiError(401, 'You need to login first.');

  const user = await User.findById(_id);
  if (!user) {
    throw new ApiError(401, 'You need to login first.');
  }
  if (!process.env.FRONTEND_URL || !process.env.RAZORPAY_TEST_KEY_SECRET) {
    throw new ApiError(500, 'Something went wrong.');
  }
  const razorpay_order_id = req?.body?.razorpay_order_id;
  const razorpay_payment_id = req?.body?.razorpay_payment_id;
  const razorpay_signature = req?.body?.razorpay_signature;

  const body: string = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_TEST_KEY_SECRET)
    .update(body)
    .digest('hex');

  const isValidPayment = expectedSignature === razorpay_signature;

  const order = await UserPayment.findOne({ paymentId: razorpay_order_id });

  if (!order) {
    console.log('No such order found');
    throw new ApiError(400, 'Beware of fraudulence.');
  }

  order.paymentStatus = isValidPayment ? 'completed' : 'failed';
  await order.save();

  if (!isValidPayment) {
    throw new ApiError(400, 'Beware of fraudulence.');
  }

  return res.status(200).json(new ApiResponse(200, null, 'Payment successful'));
});
