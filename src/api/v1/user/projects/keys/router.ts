import { Router, RequestHandler } from "express";
import { createKey, listKeys, revokeKey } from "./controller";
import { verifyUserToken } from "@/middlewares/user.auth.middleware";

const router = Router({ mergeParams: true });

router.use(verifyUserToken);

router.get("/", listKeys as RequestHandler);

router.post("/", createKey as RequestHandler);

router.delete("/:keyId", revokeKey as RequestHandler);

export default router;
