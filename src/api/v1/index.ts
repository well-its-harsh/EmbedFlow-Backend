import express from "express";
import user from "@/api/v1/user";
import query from "@/api/v1/query";

const router = express.Router();

router.use("/user", user);
router.use("/query", query);

export default router;
