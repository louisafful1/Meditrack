import asyncHandler from "express-async-handler";
import Facility from "../models/facilityModel.js";

// @desc    Create a new facility
// @route   POST /api/facilities
// @access  Admin only
const createFacility = asyncHandler(async (req, res) => {
  const { name, address, contactEmail, contactPhone } = req.body;

  if (!name) {
    res.status(400);
    throw new Error("Facility name is required");
  }

  const existing = await Facility.findOne({ name });
  if (existing) {
    res.status(400);
    throw new Error("Facility already exists");
  }

  const facility = await Facility.create({
    name,
    address,
    contactEmail,
    contactPhone,
  });

  res.status(201).json(facility);
});

// @desc    Get all facilities
// @route   GET /api/facilities
// @access  Private/Admin
const getFacilities = asyncHandler(async (req, res) => {
  const facilities = await Facility.find().sort({ createdAt: -1 });
  res.status(200).json(facilities);
});

// @desc    Get single facility by ID
// @route   GET /api/facilities/:id
// @access  Private/Admin
const getFacilityById = asyncHandler(async (req, res) => {
  const facility = await Facility.findById(req.params.id);

  if (!facility) {
    res.status(404);
    throw new Error("Facility not found");
  }

  res.status(200).json(facility);
});

// @desc    Update a facility
// @route   PUT /api/facilities/:id
// @access  Private/Admin
const updateFacility = asyncHandler(async (req, res) => {
  const { name, address, contactEmail, contactPhone, active } = req.body;

  const facility = await Facility.findById(req.params.id);
  if (!facility) {
    res.status(404);
    throw new Error("Facility not found");
  }

  facility.name = name || facility.name;
  facility.address = address || facility.address;
  facility.contactEmail = contactEmail || facility.contactEmail;
  facility.contactPhone = contactPhone || facility.contactPhone;
  if (typeof active === "boolean") facility.active = active;

  const updated = await facility.save();
  res.status(200).json(updated);
});

// @desc    Delete a facility
// @route   DELETE /api/facilities/:id
// @access  Private/Admin
const deleteFacility = asyncHandler(async (req, res) => {
  const facility = await Facility.findById(req.params.id);
  if (!facility) {
    res.status(404);
    throw new Error("Facility not found");
  }

  await facility.deleteOne();
  res.status(200).json({ message: "Facility deleted" });
});

export {
  createFacility,
  getFacilities,
  getFacilityById,
  updateFacility,
  deleteFacility,
};
