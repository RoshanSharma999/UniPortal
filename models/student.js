import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    usn: {
        type: String,
        required: true,
        unique: true
    },
    dob: {
        type: Date,
        required: true
    },
    dept: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "dept",
        required: true
    },
    section: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "section",
        required: true
    },
    classroom: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "section",
        }
    ]
});

export default mongoose.model("student", studentSchema);
