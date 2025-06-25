// models/redistributionModel.js
import mongoose from "mongoose";

const redistributionSchema = new mongoose.Schema(
  {
    drug: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    fromFacility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },
    toFacility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    expiryDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "declined"],
      default: "pending",
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      receivedAt: Date,
      declinedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      declinedAt: Date,
      wasEffective: Boolean,
      feedbackNote: String,
      
  },
  { timestamps: true }
);

const Redistribution = mongoose.model("Redistribution", redistributionSchema);

export default Redistribution;
