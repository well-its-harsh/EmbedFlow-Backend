import express from "express";
import authentication from "@/api/v1/user/authentication";
import projects from "@/api/v1/user/projects";
import models from "@/api/v1/user/models";
import logs from "@/api/v1/user/llm_logs";
import { verifyUserToken } from "@/middlewares/user.auth.middleware";
import { getProfileById } from "@/api/v1/user/profile/controller";

const router = express.Router();

router.use("/auth", authentication);
router.use("/profile", verifyUserToken, getProfileById);
router.use("/projects", verifyUserToken, projects);
router.use("/models", verifyUserToken, models);
router.use("/logs", verifyUserToken, logs);

export default router;
