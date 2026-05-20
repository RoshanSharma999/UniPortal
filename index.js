import express from "express";
import mongoose from "mongoose";
import ejsMate from "ejs-mate";
import methodOverride from "method-override";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import passport from './utils/passport-config.js';
import authRoutes from './utils/auth-routes.js';
import { isHOD, isFaculty, isStudent, isAuthenticated } from './utils/auth.js';

import DEPT from './models/dept.js';
import HOD from './models/hod.js';
import COURSE from './models/course.js';
import SECTION from './models/section.js';
import FACULTY from './models/faculty.js';
import STUDENT from './models/student.js';
import CLASSROOM from './models/classroom.js';
import MESSAGE from './models/message.js';
import MARKS from './models/marks.js';

const app = express();
const PORT = process.env.PORT || 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.engine("ejs", ejsMate);
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

app.use(session({
    secret: 'msrit-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});
app.use(authRoutes);

async function main() {
    const dbUrl = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/msrit';
    await mongoose.connect(dbUrl);
}
main()
    .then(() => console.log("Connected to DB"))
    .catch(err => console.log(err));

// home/login route
app.get("/", (req, res) => {
    res.redirect("/login");
});

// HOD dashboard
app.get("/hod", isHOD, async (req, res) => {
    try {
        const x = await HOD.findById(req.user._id)
            .populate('dept', 'name code');
        const deptId = x.dept._id;
        if (!deptId) {
            return res.status(400).json({
                success: false,
                message: "Department ID is required"
            });
        }
        const department = await DEPT.findById(deptId).populate('hod', 'name email');
        if (!department) {
            return res.status(404).json({
                success: false,
                message: "Department not found"
            });
        }
        const hod = await HOD.findOne({ dept: deptId }).select('name email');
        const courses = await COURSE.find({ dept: deptId }).select('code name credits');
        const faculty = await FACULTY.find({ dept: deptId }).select('name email classroom');

        const facultyIds = faculty.map(f => f._id);
        const classrooms = await CLASSROOM.find({ faculty: { $in: facultyIds }, status: "pending" })
            .populate('faculty', 'name')
            .populate('section', 'name sem')
            .populate('course', 'code name');

        const response = {
            department: {
                id: department._id,
                name: department.name,
                code: department.code
            },
            hod: hod ? {
                id: hod._id,
                name: hod.name,
                email: hod.email
            } : null,
            courses: courses.map(course => ({
                id: course._id,
                code: course.code,
                name: course.name,
                credits: course.credits
            })),
            faculty: faculty.map(fac => ({
                id: fac._id,
                name: fac.name,
                email: fac.email,
            })),
            approvals: classrooms.map(cls => ({
                id: cls._id,
                status: cls.status,
                faculty: cls.faculty ? {
                    name: cls.faculty.name,
                } : null,
                section: cls.section ? {
                    name: cls.section.name,
                } : null,
                course: cls.course ? {
                    name: cls.course.name,
                } : null
            }))
        };
        res.render("dashboards/hod.ejs", { response });
    } catch (error) {
        console.error("Error fetching department details:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

// creating a new classroom
app.post("/classroom", async (req, res) => {
    try {
        const { faculty, section, course } = req.body;
        if (!faculty || !section || !course) {
            return res.status(400).json({
                success: false,
                message: "Faculty, section, and course are required"
            });
        }

        const existingClassroom = await CLASSROOM.findOne({
            faculty, section, course
        });
        if (existingClassroom) {
            return res.status(409).json({
                success: false,
                message: "Classroom with this combination already exists"
            });
        }

        const classroom = new CLASSROOM({
            status: "pending",
            faculty,
            section,
            course
        });
        await classroom.save();
        await FACULTY.findByIdAndUpdate(
            faculty,
            { $addToSet: { classrooms: classroom._id } }
        );
        await STUDENT.updateMany(
            { section: section },
            { $addToSet: { classrooms: classroom._id } }
        );
        res.redirect("/faculty");
    } catch (error) {
        console.error("Error creating classroom:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});
// approval a new classroom by HOD
app.post("/classroom/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).send("Invalid status");
    }
    await CLASSROOM.findByIdAndUpdate(
        id,
        { status },
        { runValidators: true }
    );
    res.redirect("/hod");
});


// Faculty dashboard
app.get("/faculty", isFaculty, async (req, res) => {
    try {
        const facultyId = req.user._id;
        const faculty = await FACULTY.findById(req.user._id).populate('dept', 'name code');
        if (!faculty) {
            return res.status(404).json({
                success: false,
                message: "Faculty not found"
            });
        }
        const classrooms = await CLASSROOM.find({ faculty: facultyId })
            .populate('section', 'name sem')
            .populate('course', 'code name credits');
        const sections = await SECTION.find({ dept: faculty.dept._id }).select('name sem');
        const courses = await COURSE.find({ dept: faculty.dept._id }).select('code name credits');
        const response = {
            faculty: {
                id: faculty._id,
                name: faculty.name,
                email: faculty.email
            },
            department: {
                id: faculty.dept._id,
                name: faculty.dept.name,
                code: faculty.dept.code
            },
            sections: sections.map(section => ({
                id: section._id,
                name: section.name,
                semester: section.sem
            })),
            courses: courses.map(course => ({
                id: course._id,
                code: course.code,
                name: course.name,
                credits: course.credits
            })),
            classrooms: classrooms.map(cls => ({
                id: cls._id,
                status: cls.status,
                section: {
                    id: cls.section._id,
                    name: cls.section.name,
                    semester: cls.section.sem
                },
                course: {
                    id: cls.course._id,
                    code: cls.course.code,
                    name: cls.course.name,
                    credits: cls.course.credits
                }
            }))
        };
        res.render("dashboards/faculty.ejs", { response });
    } catch (error) {
        console.error("Error fetching faculty classrooms:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

//marks 
app.get("/marks/:id", async (req, res) => {
    try {
        const classId = req.params.id;
        const classroom = await CLASSROOM.findById(classId)
            .populate('course', 'code name credits')
            .populate('section', 'name sem');
        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: "Classroom not found"
            });
        }
        const students = await STUDENT.find({ section: classroom.section._id })
            .select('name usn')
            .sort('usn');
        const marksRecords = await MARKS.find({ classroom: classId }).populate('student', 'name usn');
        const marksMap = {};
        marksRecords.forEach(mark => {
            marksMap[mark.student._id.toString()] = {
                id: mark._id,
                cie1: mark.cie1,
                cie2: mark.cie2,
                comp1: mark.comp1,
                comp2: mark.comp2,
                see: mark.see,
            };
        });
        const studentsWithMarks = students.map(student => ({
            id: student._id,
            name: student.name,
            usn: student.usn,
            marks: marksMap[student._id.toString()] || {
                id: null,
                cie1: 0,
                cie2: 0,
                comp1: 0,
                comp2: 0,
                see: 0,
            }
        }));
        const data = {
            classroom: {
                id: classroom._id,
                status: classroom.status
            },
            course: {
                id: classroom.course._id,
                code: classroom.course.code,
                name: classroom.course.name,
                credits: classroom.course.credits
            },
            section: {
                id: classroom.section._id,
                name: classroom.section.name,
                semester: classroom.section.sem
            },
            students: studentsWithMarks
        };
        res.render("marks.ejs", { data });
    } catch (error) {
        console.error("Error fetching marks:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});
app.post("/marks/update", async (req, res) => {
    try {
        const { studentId, classroomId, cie1, cie2, comp1, comp2, see } = req.body;
        console.log(req.body);
        if (!studentId || !classroomId) {
            return res.status(400).json({
                success: false,
                message: "Student ID and Classroom ID are required"
            });
        }
        const cieAvg = (parseFloat(cie1) + parseFloat(cie2)) / 2;
        const comps = parseFloat(comp1) + parseFloat(comp2);
        const seeConverted = parseFloat(see) / 2;
        const total = Math.round(cieAvg + comps + seeConverted);
        const existingMarks = await MARKS.findOne({
            student: studentId,
            classroom: classroomId
        });

        if (existingMarks) {
            // Update existing marks
            existingMarks.cie1 = cie1;
            existingMarks.cie2 = cie2;
            existingMarks.comp1 = comp1;
            existingMarks.comp2 = comp2;
            existingMarks.see = see;
            existingMarks.total = total;
            await existingMarks.save();
        } else {
            const newMarks = new MARKS({
                student: studentId,
                classroom: classroomId,
                cie1,
                cie2,
                comp1,
                comp2,
                see,
                total
            });
            await newMarks.save();
        }
        res.redirect(`/marks/${classroomId}`);
    } catch (error) {
        console.error("Error updating marks:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});
app.post("/marks/update-all", async (req, res) => {
    try {
        const { classroomId } = req.body;
        let students = req.body.students;
        if (typeof students === 'string') {
            students = JSON.parse(students);
        }
        if (!classroomId || !students || !Array.isArray(students)) {
            return res.status(400).json({
                success: false,
                message: "Classroom ID and students array are required"
            });
        }
        const updatedMarks = [];
        const errors = [];
        for (const studentData of students) {
            try {
                const { studentId, cie1, cie2, comp1, comp2, see } = studentData;
                const cieAvg = (parseFloat(cie1) + parseFloat(cie2)) / 2;
                const comps = parseFloat(comp1) + parseFloat(comp2);
                const seeConverted = parseFloat(see) / 2;
                const total = Math.round(cieAvg + comps + seeConverted);
                const existingMarks = await MARKS.findOne({
                    student: studentId,
                    classroom: classroomId
                });
                if (existingMarks) {
                    existingMarks.cie1 = cie1;
                    existingMarks.cie2 = cie2;
                    existingMarks.comp1 = comp1;
                    existingMarks.comp2 = comp2;
                    existingMarks.see = see;
                    existingMarks.total = total;
                    await existingMarks.save();
                    updatedMarks.push(existingMarks);
                } else {
                    const newMarks = new MARKS({
                        student: studentId,
                        classroom: classroomId,
                        cie1,
                        cie2,
                        comp1,
                        comp2,
                        see,
                        total
                    });
                    await newMarks.save();
                    updatedMarks.push(newMarks);
                }
            } catch (err) {
                errors.push({
                    studentId: studentData.studentId,
                    error: err.message
                });
            }
        }
        return res.redirect(`/marks/${classroomId}`);

    } catch (error) {
        console.error("Error updating all marks:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});


// Student dashboard
app.get("/student", isStudent, async (req, res) => {
    try {
        const studentId = req.user._id;
        const student = await STUDENT.findById(studentId)
            .populate('dept', 'name code')
            .populate('section', 'name sem');
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }
        const classrooms = await CLASSROOM.find({
            section: student.section._id,
            status: "accepted"
        })
            .populate('course', 'code name credits')
            .populate('faculty', 'name email')
            .populate('section', 'name sem');
        const marksRecords = await MARKS.find({ student: studentId }).populate('classroom');
        const marksMap = {};
        marksRecords.forEach(mark => {
            marksMap[mark.classroom._id.toString()] = {
                id: mark._id,
                cie1: mark.cie1,
                cie2: mark.cie2,
                comp1: mark.comp1,
                comp2: mark.comp2,
                see: mark.see,
                total: mark.total
            };
        });
        const classroomsWithMarks = classrooms.map(classroom => ({
            id: classroom._id,
            course: {
                id: classroom.course._id,
                code: classroom.course.code,
                name: classroom.course.name,
                credits: classroom.course.credits
            },
            faculty: {
                id: classroom.faculty._id,
                name: classroom.faculty.name,
                email: classroom.faculty.email
            },
            marks: marksMap[classroom._id.toString()] || {
                id: null,
                cie1: 0,
                cie2: 0,
                comp1: 0,
                comp2: 0,
                see: 0,
                total: 0
            }
        }));
        const data = {
            student: {
                id: student._id,
                name: student.name,
                usn: student.usn,
                dob: student.dob
            },
            department: {
                id: student.dept._id,
                name: student.dept.name,
                code: student.dept.code
            },
            section: {
                id: student.section._id,
                name: student.section.name,
                semester: student.section.sem
            },
            classrooms: classroomsWithMarks
        };
        res.render("dashboards/student.ejs", { data });
    } catch (error) {
        console.error("Error fetching student details:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

// GET /notice
app.get('/notice', isAuthenticated, async (req, res) => {
    try {
        let messages = [];
        let classrooms = [];

        if (req.user.role === 'faculty') {
            classrooms = await CLASSROOM.find({ faculty: req.user._id })
                .populate('section', 'name sem')
                .populate('course', 'code name');

            const classroomIds = classrooms.map(c => c._id);

            messages = await MESSAGE.find({ classroom: { $in: classroomIds } })
                .populate({
                    path: 'classroom',
                    populate: [
                        { path: 'section', select: 'name sem' },
                        { path: 'course', select: 'code name' }
                    ]
                })
                .sort({ _id: -1 }); 

        } else if (req.user.role === 'student') {
            const student = await STUDENT.findById(req.user._id)
                .populate('section', 'name sem');
            console.log(student.classroom);
            classrooms = await CLASSROOM.find({ 
                section: student.section._id,
                approval: true 
            })
                .populate('section', 'name sem')
                .populate('course', 'code name');

            const classroomIds = classrooms.map(c => c._id);
            console.log(classroomIds);
            messages = await MESSAGE.find({ classroom: { $in: classroomIds } })
                .populate({
                    path: 'classroom',
                    populate: [
                        { path: 'section', select: 'name sem' },
                        { path: 'course', select: 'code name' }
                    ]
                })
                .sort({ _id: -1 }); 
        }
        console.log(messages);
        res.render('notice.ejs', { 
            messages,
            userRole: req.user.role
        });

    } catch (error) {
        console.error("Error fetching notices:", error);
        res.status(500).send('Error loading notices');
    }
});
app.post("/notice/new", async (req, res) => {
    try {
        const { classId, msgType, message } = req.body;
        if (!classId || !msgType || !message) {
            return res.status(400).json({
                success: false,
                message: "Class ID, message type, and message are required"
            });
        }
        const classroom = await CLASSROOM.findById(classId);
        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: "Classroom not found"
            });
        }
        const newMessage = new MESSAGE({
            msgType: msgType,
            message: message,
            classroom: classId
        });
        await newMessage.save();
        res.redirect("/notice");
    } catch (error) {
        console.error("Error creating notice:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});


app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
});

module.exports = app;
