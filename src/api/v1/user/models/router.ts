import { Router, RequestHandler } from "express";
import {
  createModel,
  listModels,
  deleteModel,
  getModelById,
} from "./controller";
import { verifyUserToken } from "@/middlewares/user.auth.middleware";

const router = Router();

router.use(verifyUserToken);

router.get("/", listModels as RequestHandler);
router.get("/:id", getModelById as RequestHandler);
router.post("/", createModel as RequestHandler);
router.delete("/:modelId", deleteModel as RequestHandler);

export default router;
