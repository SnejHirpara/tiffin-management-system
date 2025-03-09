import express from 'express';
import userRouter from './routes/user.routes.js';
import tiffinRouter from './routes/tiffin.routes.js';
import cookieParser from 'cookie-parser';

const app = express();

app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static("public"));
app.use(cookieParser());

app.use('/api/v1/users', userRouter);
app.use('/api/v1/tiffins', tiffinRouter);

export { app };