import { Router } from "express";
import { listQueryLogs } from "./controller";
import { verifyUserToken } from "@/middlewares/user.auth.middleware";

const router = Router();

// All log access must be authenticated
router.use(verifyUserToken);

// GET /v1/user/logs?projectId=...&limit=...
router.get("/", listQueryLogs);

export default router;
