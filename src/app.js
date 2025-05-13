import express from 'express';
import userRouter from './routes/user.routes.js';
import tiffinRouter from './routes/tiffin.routes.js';
import cookieParser from 'cookie-parser';
import cors from "cors";

const app = express();

const allowedOrigins = [
    "https://tiffin-management-system.onrender.com",
    /^http:\/\/localhost:\d+$/
];

app.use(cors({
    origin: function(origin, callback) {
        if(!origin) return callback(null, true);

        const isAllowed = allowedOrigins.some((validOrigin) => {
            if(typeof validOrigin === 'string') return validOrigin === origin;
            if(validOrigin instanceof RegExp) return validOrigin.test(origin);

            return false;
        });

        if(isAllowed) callback(null, true);
        else callback(new Error("Not allowed by CORS"));
    }
}));

app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static("public"));
app.use(cookieParser());

app.use('/api/v1/users', userRouter);
app.use('/api/v1/tiffins', tiffinRouter);

export { app };