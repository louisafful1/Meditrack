import mongoose from 'mongoose';

const inventorySnapshotSchema = new mongoose.Schema({
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true,
  },
  snapshotDate: {
    type: Date,
    default: Date.now,
  },
  inventory: [
    {
      drug: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory',
      },
      drugName: String,
      batchNumber: String,
      currentStock: Number,
      expiryDate: Date,
      location: String,
    }
  ]
}, { timestamps: true });

const InventorySnapshot = mongoose.model('InventorySnapshot', inventorySnapshotSchema);
export default InventorySnapshot;
