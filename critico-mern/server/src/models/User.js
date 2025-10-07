const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PreferenceSchema = new mongoose.Schema({
  language: { type: String, default: 'es' },
  theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true }
  }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student'
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  avatarUrl: String,
  institution: String,
  preferences: { type: PreferenceSchema, default: () => ({}) },
  recoveryToken: String,
  recoveryTokenExpiresAt: Date,
  lastLoginAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

UserSchema.pre('save', async function preSave(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

UserSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.recoveryToken;
  delete obj.recoveryTokenExpiresAt;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
