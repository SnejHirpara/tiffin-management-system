// import dotenv from 'dotenv';
import connectDB from './db/connectDB.js';
import { app } from './app.js';


if (process.env.NODE_ENV !== 'production') {
    console.log('hello');
    import('dotenv').then((dotenv) => dotenv.config({
        path: './env'
    }));
}

connectDB().then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is listening on port ${process.env.PORT || 8000}`);
    });
}).catch((err) => {
    console.log("MongoDB connection failed!!! ", err);
});