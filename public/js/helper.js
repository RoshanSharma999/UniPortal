function showLogin(role) {
    const allForms = document.querySelectorAll('.login-box');
    allForms.forEach(form => form.classList.add('hidden'));

    document.getElementById(role + '-login')
        .classList.remove('hidden');
}

function showCreateClass(){
    const xForm = document.querySelector('.create-new-classroom');
    xForm.style.display = 'block';
}

function submitCNC(){
    alert("Classroom sent to HOD for approval!");
    return true;
}