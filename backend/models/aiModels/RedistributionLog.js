// models/aiModels/RedistributionLog.js
import mongoose from 'mongoose';

const redistributionLogSchema = new mongoose.Schema({
  redistributionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Redistribution',
    required: true,
  },
  drug: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  fromFacility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true,
  },
  toFacility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true,
  },
  reason: {
    type: String,
  },
  expiryDate: {
    type: Date,
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  receivedAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'declined'],
    default: 'pending',
  },
  note: String,
}, {
  timestamps: true,
});

const RedistributionLog = mongoose.model('RedistributionLog', redistributionLogSchema);
export default RedistributionLog;
