import { Router } from "express";
import {
  checkIn,
  checkOut,
  getMyAttendance,
  getTeamAttendance,
} from "../controllers/attendance.controllers.js";
import { verifyAccessToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyAccessToken);
router.get("/", getMyAttendance);
router.get("/team", getTeamAttendance);
router.post("/check-in", checkIn);
router.post("/check-out", checkOut);

export default router;
