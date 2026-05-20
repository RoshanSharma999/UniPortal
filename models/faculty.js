import mongoose from 'mongoose';

const facultySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  dept: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "dept",
    required: true
  },
  classroom: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "classroom"
    }
  ]
});

export default mongoose.model("faculty", facultySchema);
