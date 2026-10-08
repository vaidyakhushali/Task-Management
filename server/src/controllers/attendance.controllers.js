import { Attendance } from "../models/attendance.model.js";
import { User } from "../models/user.model.js";

function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function getMyAttendance(req, res) {
  const dateKey = getTodayKey();
  const [today, history] = await Promise.all([
    Attendance.findOne({ user: req.user._id, dateKey }),
    Attendance.find({ user: req.user._id }).sort({ dateKey: -1 }).limit(30),
  ]);

  return res.status(200).json({
    success: true,
    data: { today, history },
  });
}

export async function checkIn(req, res) {
  const dateKey = getTodayKey();

  try {
    const attendance = await Attendance.create({
      user: req.user._id,
      dateKey,
      checkInAt: new Date(),
    });
    return res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 409, "You have already checked in today");
    }
    throw error;
  }
}

export async function checkOut(req, res) {
  const dateKey = getTodayKey();
  const attendance = await Attendance.findOneAndUpdate(
    { user: req.user._id, dateKey, checkOutAt: null },
    { checkOutAt: new Date() },
    { new: true },
  );

  if (attendance) {
    return res.status(200).json({ success: true, data: attendance });
  }

  const existingAttendance = await Attendance.exists({
    user: req.user._id,
    dateKey,
  });
  return existingAttendance
    ? sendError(res, 409, "You have already checked out today")
    : sendError(res, 400, "Check in before checking out");
}

export async function getTeamAttendance(req, res) {
  if (req.user.role !== "Admin") {
    return sendError(res, 403, "Only admins can view team attendance");
  }

  const dateKey = getTodayKey();
  const [users, attendanceRecords] = await Promise.all([
    User.find({}, "fullname username email role").sort({ fullname: 1 }),
    Attendance.find({ dateKey }),
  ]);
  const attendanceByUser = new Map(
    attendanceRecords.map((record) => [String(record.user), record]),
  );
  const members = users.map((user) => ({
    id: user._id,
    fullname: user.fullname || user.username,
    role: user.role,
    attendance: attendanceByUser.get(String(user._id)) || null,
  }));
  const checkedIn = members.filter((member) => member.attendance).length;
  const currentlyWorking = members.filter(
    (member) => member.attendance && !member.attendance.checkOutAt,
  ).length;

  return res.status(200).json({
    success: true,
    data: {
      dateKey,
      totalMembers: members.length,
      checkedIn,
      currentlyWorking,
      attendanceRate: members.length
        ? Math.round((checkedIn / members.length) * 100)
        : 0,
      members,
    },
  });
}
