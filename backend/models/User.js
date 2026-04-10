const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type:     String,
      required: [true, 'Email is required'],
      unique:   true,
      lowercase: true,
      trim:     true,
      match:    [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type:     String,
      required: true,
    },
    displayName: {
      type:    String,
      trim:    true,
      default: '',
    },
    weeklyGoal: {
      transport: { type: Number, default: 15 },
      food:      { type: Number, default: 10 },
      energy:    { type: Number, default: 8  },
      other:     { type: Number, default: 3  },
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Compare a plain-text password against the stored hash
userSchema.methods.comparePassword = function (plainText) {
  return bcrypt.compare(plainText, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
