// passport-config.js
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import HOD from '../models/hod.js';
import Faculty from '../models/faculty.js';
import Student from '../models/student.js';

// HOD Strategy
passport.use('hod-local', new LocalStrategy(
    {
        usernameField: 'dept',
        passwordField: 'password'
    },
    async (deptId, password, done) => {
        try {
            const hod = await HOD.findOne({ dept: deptId });
            if (!hod) {
                return done(null, false, { message: 'HOD not found for this department' });
            }
            
            const isMatch = await bcrypt.compare(password, hod.password);
            if (!isMatch) {
                return done(null, false, { message: 'Incorrect password' });
            }
            
            return done(null, { id: hod._id, role: 'hod', dept: hod.dept });
        } catch (error) {
            return done(error);
        }
    }
));

// Faculty Strategy
passport.use('faculty-local', new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password'
    },
    async (email, password, done) => {
        try {
            const faculty = await Faculty.findOne({ email });
            if (!faculty) {
                return done(null, false, { message: 'Faculty not found' });
            }
            
            const isMatch = await bcrypt.compare(password, faculty.password);
            if (!isMatch) {
                return done(null, false, { message: 'Incorrect password' });
            }
            
            return done(null, { id: faculty._id, role: 'faculty', dept: faculty.dept });
        } catch (error) {
            return done(error);
        }
    }
));

// Student Strategy
passport.use('student-local', new LocalStrategy(
    {
        usernameField: 'usn',
        passwordField: 'dob'
    },
    async (usn, dob, done) => {
        try {
            const student = await Student.findOne({ usn });
            if (!student) {
                return done(null, false, { message: 'Student not found' });
            }
            
            // Compare DOB (stored as Date, input as string)
            const inputDate = new Date(dob);
            const storedDate = new Date(student.dob);
            
            if (inputDate.toDateString() !== storedDate.toDateString()) {
                return done(null, false, { message: 'Incorrect date of birth' });
            }
            
            return done(null, { id: student._id, role: 'student', dept: student.dept, section: student.section });
        } catch (error) {
            return done(error);
        }
    }
));

// Serialize user
passport.serializeUser((user, done) => {
    done(null, { id: user.id, role: user.role });
});

// Deserialize user
passport.deserializeUser(async (data, done) => {
    try {
        let user;
        if (data.role === 'hod') {
            user = await HOD.findById(data.id);
        } else if (data.role === 'faculty') {
            user = await Faculty.findById(data.id);
        } else if (data.role === 'student') {
            user = await Student.findById(data.id);
        }
        
        if (user) {
            user.role = data.role;
            done(null, user);
        } else {
            done(null, false);
        }
    } catch (error) {
        done(error);
    }
});

export default passport;
