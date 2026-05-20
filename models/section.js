import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    sem: {
        type: Number,
        required: String
    },
    dept: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "dept",
        required: true
    }
});

export default mongoose.model("section", sectionSchema);
