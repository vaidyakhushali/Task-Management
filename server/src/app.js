import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js";
import taskRouter from "./routes/task.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import projectRouter from "./routes/project.routes.js";

const app = express();
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is running' }));
app.use('/api/users', userRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/projects', projectRouter);

app.use((error, req, res, next) => {
    console.error(error);
    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Something went wrong',
    });
});

export default app;