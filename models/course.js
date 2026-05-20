import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    dept: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "dept",
        required: true
    },
    credits: {
        type: Number,
        default: 4
    }
});

export default mongoose.model("course", courseSchema);
