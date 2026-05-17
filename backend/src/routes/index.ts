import { Router, type IRouter } from "express";
import healthRouter from "./health";
import convertRouter from "./convert";

const router: IRouter = Router();

router.use(healthRouter);
router.use(convertRouter);

export default router;
