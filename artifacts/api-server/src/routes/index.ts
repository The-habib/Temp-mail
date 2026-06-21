import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mailboxRouter from "./mailbox";
import pushRouter from "./push";
import setupRouter from "./setup";
import customMailboxRouter from "./custom-mailbox";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mailboxRouter);
router.use(pushRouter);
router.use(setupRouter);
router.use(customMailboxRouter);

export default router;
