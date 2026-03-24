import router from "./router";
import Documents from "@/api/v1/user/projects/documents";
import key from "@/api/v1/user/projects/keys";
import { assignProjectModels } from "@/api/v1/user/projects/controller";
import { verifyUserToken } from "@/middlewares/user.auth.middleware";
import { RequestHandler } from "express";

router.use("/:projectId/doc", verifyUserToken, Documents);
router.use("/:projectId/keys", verifyUserToken, key);
router.patch(
  "/:projectId/models",
  verifyUserToken,
  assignProjectModels as RequestHandler
);

export default router;
