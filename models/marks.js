import mongoose from 'mongoose';

const marksSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "student",
        required: true
    },
    cie1: {
        type: Number,
        max: 30,
        required: true
    },
    cie2: {
        type: Number,
        max: 30,
        required: true
    },
    comp1: {
        type: Number,
        max: 10,
        required: true
    },
    comp2: {
        type: Number,
        max: 10,
        required: true
    },
    see: {
        type: Number,
        max: 100,
        required: true
    },
    total: {
        type: Number,
        max: 100,
    },
    classroom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "classroom",
        required: true
    }
});

export default mongoose.model("marks", marksSchema);
