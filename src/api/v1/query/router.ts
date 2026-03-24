import { Router } from "express";
import { handleUserQuery } from "./controller";
import { apiKeyAuthMiddleware } from "@/middlewares/apiAuth.middleware";

const router = Router();

router.post("/", apiKeyAuthMiddleware, handleUserQuery);

export default router;
