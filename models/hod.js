import mongoose from 'mongoose';

const hodSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    dept: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "dept",
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

export default mongoose.model("hod", hodSchema);
