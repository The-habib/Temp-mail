import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mailboxRouter from "./mailbox";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mailboxRouter);

export default router;
