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
    status: {
      type: String,
      enum: ["available", "Low Stock", "Out of stock"],
      default: "available",
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
    timestamps: true, // includes createdAt and updatedAt automatically
  }
);

const Inventory = mongoose.model("Inventory", inventorySchema);

export default Inventory;
