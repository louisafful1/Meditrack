import mongoose from "mongoose";

const dispensationSchema = new mongoose.Schema(
  {
    drug: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    quantityDispensed: {
      type: Number,
      required: true,
    },
    dispensedTo: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      default: "",
    },
    dispensedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },
    dateDispensed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Dispensation = mongoose.model("Dispensation", dispensationSchema);
export default Dispensation;
