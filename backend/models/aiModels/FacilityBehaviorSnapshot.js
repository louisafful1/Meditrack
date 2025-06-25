// models/aiModels/FacilityBehaviorSnapshot.js
import mongoose from 'mongoose';

const facilityBehaviorSnapshotSchema = new mongoose.Schema({
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true,
  },
  drugName: {
    type: String,
    required: true,
  },
  totalDispensed: {
    type: Number,
    default: 0,
  },
  totalReceived: {
    type: Number,
    default: 0,
  },
  totalRedistributedIn: {
    type: Number,
    default: 0,
  },
  totalRedistributedOut: {
    type: Number,
    default: 0,
  },
  currentStock: {
    type: Number,
    default: 0,
  },
  averageDailyUsage: {
    type: Number, 
  },
  calculatedNeedLevel: {
    type: String,
    enum: ['low', 'moderate', 'high'],
  },
  snapshotDate: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

const FacilityBehaviorSnapshot = mongoose.model('FacilityBehaviorSnapshot', facilityBehaviorSnapshotSchema);
export default FacilityBehaviorSnapshot;
