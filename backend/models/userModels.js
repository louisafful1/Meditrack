import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import crypto from "crypto";

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      trim: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please enter a valid email",
      ],
    },
    phone: {
      type: String,
      required: [true, "Please add an email"],
            validate: {
        // ✨ NEW GHANA-SPECIFIC PHONE NUMBER REGEX
        validator: function(v) {
          // This regex matches three specific Ghanaian phone number formats:
          // 1. ^\+233\d{9}$ : Starts with "+233" followed by exactly 9 digits (e.g., +233591414352)
          // 2. ^0\d{9}$     : Starts with "0" followed by exactly 9 digits (e.g., 0591414352)
          // 3. ^\d{9}$      : Is exactly 9 digits long (e.g., 591414352)
          return /^(\+233\d{9}|0\d{9}|\d{9})$/.test(v);
        },
        message: props => `${props.value} is not a valid Ghanaian phone number!`,
      },
    },
    password: {
      type: String,
      minLength: [8, "Password must be at least 8 characters"],
    },
    facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
    },
    role: {
      type: String,
      default: "staff",
      enum: ["staff", "admin", "supervisor", "pharmacist"],
    },
    active: {
      type: Boolean,
      default: true,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto.createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 30 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model("User", userSchema);
export default User;
