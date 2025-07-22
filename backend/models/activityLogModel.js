import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  user: {
     type: mongoose.Schema.Types.ObjectId,
      ref: 'User', 
      required: true 
    },
      facility: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Facility',
        required: true 
    },
  action: { 
    type: String,
     required: true
     }, 
  module: { 
    type: String,
     required: true 
    },
  targetId: {
     type: mongoose.Schema.Types.ObjectId
     }, 
  message: { type: String }, 
}, {
  timestamps: true 
}
);

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
