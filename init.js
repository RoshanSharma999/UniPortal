import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Import Models
import DEPT from "./models/dept.js";
import HOD from "./models/hod.js";
import FACULTY from "./models/faculty.js";
import COURSE from "./models/course.js";
import SECTION from "./models/section.js";
import STUDENT from "./models/student.js";
import CLASSROOM from "./models/classroom.js";
import MARKS from "./models/marks.js";
import MESSAGE from "./models/message.js";

async function initializeDB() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://127.0.0.1:27017/msrit');
        console.log("Connected to Database. Starting Initialization...");

        // 1. Clear existing data (optional, but good for a fresh init)
        await DEPT.deleteMany({});
        await HOD.deleteMany({});
        await FACULTY.deleteMany({});
        await COURSE.deleteMany({});
        await SECTION.deleteMany({});
        await STUDENT.deleteMany({});
        await CLASSROOM.deleteMany({});
        await MARKS.deleteMany({});
        await MESSAGE.deleteMany({});
        console.log("Cleared existing data.");

        // Hash passwords
        const hodPassword = await bcrypt.hash('@hod123', 10);
        const facultyPassword = await bcrypt.hash('@fact123', 10);

        // 2. Create Departments
        const departmentsData = [
            { name: "Computer Science and Engineering", code: "CSE" },
            { name: "Information Science and Engineering", code: "ISE" },
            { name: "Mechanical Engineering", code: "MECH" },
            { name: "Civil Engineering", code: "CIVIL" }
        ];
        
        const depts = await DEPT.insertMany(departmentsData);
        console.log("Created 4 Departments.");

        // Utility map for finding dept IDs easily
        const deptMap = {};
        depts.forEach(d => deptMap[d.code] = d);

        // 3. Create HODs and link them to Departments
        for (let dept of depts) {
            const newHod = new HOD({
                name: `${dept.code} HOD`,
                email: `hod.${dept.code.toLowerCase()}@msrit.edu`,
                password: hodPassword,
                dept: dept._id
            });
            await newHod.save();

            // Update Dept with HOD's ID
            dept.hod = newHod._id;
            await dept.save();
        }
        console.log("Created HODs for all departments. (Password: @hod123)");

        // 4. Create Faculties for each Department
        const allFaculties = [];
        for (let dept of depts) {
            for (let i = 1; i <= 3; i++) { // 3 faculties per dept
                const newFaculty = new FACULTY({
                    name: `Faculty ${i} - ${dept.code}`,
                    email: `fac${i}.${dept.code.toLowerCase()}@msrit.edu`,
                    password: facultyPassword,
                    dept: dept._id,
                    classroom: []
                });
                const savedFaculty = await newFaculty.save();
                allFaculties.push(savedFaculty);
            }
        }
        console.log("Created Faculties for all departments. (Password: @fact123)");

        // 5. Create Courses (5 for each Department)
        const allCourses = [];
        for (let dept of depts) {
            for (let i = 1; i <= 5; i++) {
                const newCourse = new COURSE({
                    code: `${dept.code}10${i}`,
                    name: `Core Subject ${i} in ${dept.code}`,
                    dept: dept._id,
                    credits: 4
                });
                const savedCourse = await newCourse.save();
                allCourses.push(savedCourse);
            }
        }
        console.log("Created 5 Courses per department.");

        // 6. Create Sections for ISE Dept
        const iseDeptId = deptMap["ISE"]._id;
        const section1A = new SECTION({ name: "1A", sem: 1, dept: iseDeptId });
        const section3C = new SECTION({ name: "3C", sem: 3, dept: iseDeptId });
        await section1A.save();
        await section3C.save();
        console.log("Created Sections 1A and 3C for ISE.");

        // 7. Create Students for ISE sections
        const loginDOB = new Date("2003-08-15"); // Common DOB for test students
        const students = [];
        
        for (let i = 1; i <= 5; i++) { // 5 students in 1A
            students.push(new STUDENT({
                name: `Student ${i} (1A)`,
                usn: `1MS23IS00${i}`,
                dob: loginDOB,
                dept: iseDeptId,
                section: section1A._id,
                classroom: []
            }));
        }
        for (let i = 1; i <= 5; i++) { // 5 students in 3C
            students.push(new STUDENT({
                name: `Student ${i} (3C)`,
                usn: `1MS22IS00${i}`,
                dob: loginDOB,
                dept: iseDeptId,
                section: section3C._id,
                classroom: []
            }));
        }
        const savedStudents = await STUDENT.insertMany(students);
        console.log(`Created Students. (DOB for Login: 2003-08-15)`);

        // 8. Create Classrooms
        const iseFaculties = allFaculties.filter(f => f.dept.toString() === iseDeptId.toString());
        const iseCourses = allCourses.filter(c => c.dept.toString() === iseDeptId.toString());

        const classrooms = [
            // Classroom 1: Section 1A, Faculty 1, Course 1 (Accepted)
            new CLASSROOM({
                status: "accepted",
                faculty: iseFaculties[0]._id,
                section: section1A._id,
                course: iseCourses[0]._id
            }),
            // Classroom 2: Section 3C, Faculty 2, Course 2 (Pending - visible to HOD)
            new CLASSROOM({
                status: "pending",
                faculty: iseFaculties[1]._id,
                section: section3C._id,
                course: iseCourses[1]._id
            })
        ];
        
        await CLASSROOM.insertMany(classrooms);
        console.log("Created Classrooms linking Section, Faculty, and Course.");

        // 9. Link classrooms back to Faculty and Students
        for(let cr of classrooms) {
            await FACULTY.findByIdAndUpdate(cr.faculty, { $push: { classrooms: cr._id } });
            await STUDENT.updateMany({ section: cr.section }, { $push: { classrooms: cr._id } });
        }

        console.log("\n✅ Database Initialization Complete!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error initializing DB:", error);
        process.exit(1);
    }
}

initializeDB();
