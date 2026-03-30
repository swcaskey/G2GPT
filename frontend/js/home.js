document.addEventListener('DOMContentLoaded', () => {
  const signupLink = document.getElementById('signup-link');
  const loginLink = document.getElementById('login-link');

  if (signupLink) {
    signupLink.addEventListener('click', () => {
      sessionStorage.setItem('lastVisitedPage', 'home');
    });
  }

  if (loginLink) {
    loginLink.addEventListener('click', () => {
      sessionStorage.setItem('lastVisitedPage', 'home');
    });
  }
});