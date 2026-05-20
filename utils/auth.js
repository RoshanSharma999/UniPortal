// middleware/auth.js
export const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

export const isHOD = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'hod') {
        return next();
    }
    res.status(403).send('Access denied - HOD only');
};

export const isFaculty = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'faculty') {
        return next();
    }
    res.status(403).send('Access denied - Faculty only');
};

export const isStudent = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'student') {
        return next();
    }
    res.status(403).send('Access denied - Student only');
};