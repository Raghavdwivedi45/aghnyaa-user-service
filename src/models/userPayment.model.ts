import { model, Schema } from 'mongoose';
import { paymentStatusArray, userPaymentTypeArray } from '../common-folder/constants/constants';
import { IUserSubscriptionDetails } from '../common-folder/interfaces/interfaces';
import { User } from './user.model';

const userPaymentSchema = new Schema<IUserSubscriptionDetails>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required.'],
    },
    paymentType: {
      type: String,
      enum: {
        values: userPaymentTypeArray,
        message: 'Invalid Payment type.',
      },
      required: [true, 'Payment type is required.'],
    },
    paymentId: {
      type: String,
      unique: true,
      required: [true, 'Payment ID is required.'],
    },
    amount: {
      type: Number, // in paise
      required: [true, 'Amount is required.'],
      min: [0, 'Amount cannot be negative.'],
    },
    paymentStatus: {
      type: String,
      enum: {
        values: paymentStatusArray,
        message: 'Invalid payment status.',
      },
      required: [true, 'Payment status is required.'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  },
);

userPaymentSchema.post('save', async function () {
  if (this.paymentStatus === 'completed' && this.paymentType === 'Featured Subscription') {
    await User.findByIdAndUpdate(this.userId, { isSubscribed: true });
  }
});

export const UserPayment = model('UserPayment', userPaymentSchema);
