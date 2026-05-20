import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    msgType: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    classroom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "classroom",
        required: true
    }
});

export default mongoose.model("message", messageSchema);
