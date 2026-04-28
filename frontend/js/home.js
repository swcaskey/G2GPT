document.addEventListener('DOMContentLoaded', () => {
  const signupLink = document.getElementById('signup-link');
  const loginLink = document.getElementById('login-link');

  if (signupLink) { // Check if the element exists before adding event listener
    signupLink.addEventListener('click', () => {
      sessionStorage.setItem('lastVisitedPage', 'home');
    });
  }

  if (loginLink) { // Check if the element exists before adding event listener
    loginLink.addEventListener('click', () => {
      sessionStorage.setItem('lastVisitedPage', 'home');
    });
  }
});