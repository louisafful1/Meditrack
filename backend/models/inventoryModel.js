import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    drugName: {
      type: String,
      required: [true, "Drug name is required"],
      trim: true,
    },
    batchNumber: {
      type: String,
      required: [true, "Batch number is required"],
    },
    currentStock: {
      type: Number,
      required: [true, "Current stock is required"],
      min: 0,
    },
    supplier: {
      type: String,
      required: [true, "Supplier is required"],
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    receivedDate: {
      type: Date,
      required: [true, "Received date is required"],
    },
    reorderLevel: {
      type: Number,
      required: true,
      default: 10, 
    },
    status: {
      type: String,
      enum: ["Adequate", "Low Stock", "Out of Stock"],
      default: "Adequate",
    },
    location: {
      type: String,
      // required: [true, "Storage location is required"],
    },
    facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true, 
  }
);
inventorySchema.index({ drugName: 1, batchNumber: 1, facility: 1 }, { unique: true });

const Inventory = mongoose.model("Inventory", inventorySchema);

export default Inventory;
