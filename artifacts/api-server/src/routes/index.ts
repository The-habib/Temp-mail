import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mailboxRouter from "./mailbox";
import pushRouter from "./push";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mailboxRouter);
router.use(pushRouter);

export default router;
