import express from 'express';
import passport from './passport-config.js';
import DEPT from '../models/dept.js';

const router = express.Router();

// GET login page
router.get('/login', async (req, res) => {
    const departments = await DEPT.find({}).select('name code');
    res.render('home.ejs', { departments });
});

// POST HOD login
router.post('/login/hod', 
    passport.authenticate('hod-local', {
        successRedirect: '/hod',
        failureRedirect: '/login'
    })
);

// POST Faculty login
router.post('/login/faculty', 
    passport.authenticate('faculty-local', {
        successRedirect: '/faculty',
        failureRedirect: '/login'
    })
);

// POST Student login
router.post('/login/student', 
    passport.authenticate('student-local', {
        successRedirect: '/student',
        failureRedirect: '/login'
    })
);

// Logout route
router.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    });
});

// GET logout (if you want to support GET as well)
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    });
});

export default router;
