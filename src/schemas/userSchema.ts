export const userSchema = {
  email: { type: 'string', required: true, unique: true },
  isVerified: { type: 'boolean', default: false },
  isActive: { type: 'boolean', default: true },
  isDeleted: { type: 'boolean', default: false },
  createdAt: { type: 'date', default: Date.now },
  updatedAt: { type: 'date', default: Date.now },
  lastLoginAt: { type: 'date', required: false },
  deactivatedAt: { type: 'date', required: false },
  deletedAt: { type: 'date', required: false },
};

export const authCodeSchema = {
  email: { type: 'string', required: true },
  code: { type: 'string', required: true },
  expiresAt: { type: 'date', required: true },
  used: { type: 'boolean', default: false },
  createdAt: { type: 'date', default: Date.now },
};
