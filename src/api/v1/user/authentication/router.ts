import express from "express";
import {
  signIn,
  signOut,
  signUp,
} from "@/api/v1/user/authentication/controller";

const router = express.Router();

router.post("/sign-in", signIn);
router.post("/sign-up", signUp);
router.post("/sign-out", signOut);

export default router;
