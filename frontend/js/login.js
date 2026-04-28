document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');

  if (!loginForm || !loginMessage) {
    return;
  }

  loginForm.addEventListener('submit', async (event) => { // Handle login form submission
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    loginMessage.textContent = '';
    loginMessage.className = 'message';

    if (!email || !password) { // Basic client-side validation
      loginMessage.textContent = 'Please enter your email and password.';
      loginMessage.classList.add('error');
      return;
    }

    try { // Send login request to server
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) { // If login failed, show error message from server
        loginMessage.textContent = data.message || 'Invalid login credentials.';
        loginMessage.classList.add('error');
        return;
      }

      loginMessage.textContent = data.message || 'Login successful. Redirecting...';
      loginMessage.classList.add('success');

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error) { // Handle network errors
      loginMessage.textContent = 'A network error occurred. Please try again.';
      loginMessage.classList.add('error');
    }
  });
});