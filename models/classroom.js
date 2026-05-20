import mongoose from 'mongoose';

const classroomSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        required: true
    },
    faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "faculty",
        required: true
    },
    section: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "section",
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "course",
        required: true
    }
});

export default mongoose.model("classroom", classroomSchema);
