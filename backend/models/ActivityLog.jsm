const mongoose = require('mongoose');

const VALID_CATEGORIES = ['transport', 'food', 'energy', 'other'];

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    activityKey: {
      type:     String,
      required: true,
      trim:     true,
    },
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    category: {
      type:     String,
      required: true,
      enum:     VALID_CATEGORIES,
    },
    quantity: {
      type:     Number,
      required: true,
      min:      [0.001, 'Quantity must be greater than zero'],
    },
    unit: {
      type:     String,
      required: true,
      trim:     true,
    },
    emissionFactor: {
      type:     Number,
      required: true,
    },
    co2kg: {
      type:     Number,
      required: true,
    },
    loggedAt: {
      type:    Date,
      default: Date.now,
      index:   true,
    },
  },
  { timestamps: true }
);

activityLogSchema.virtual('dateString').get(function () {
  return this.loggedAt.toISOString().split('T')[0];
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
