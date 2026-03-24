import express from "express";
import { getProfileById } from "@/api/v1/user/profile/controller";

const router = express.Router();

router.get("/", getProfileById);

export default router;
