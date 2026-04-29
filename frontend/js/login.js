document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');

  if (!loginForm || !loginMessage) {
    return;
  }

  loginForm.addEventListener('submit', async (event) => { // Handle login form submission
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim(); // Trim email input to remove extra spaces
    const password = document.getElementById('loginPassword').value; // Get password input value

    loginMessage.textContent = '';
    loginMessage.className = 'message';

    if (!email || !password) { // Basic client-side validation
      loginMessage.textContent = 'Please enter your email and password.';
      loginMessage.classList.add('error'); // Show error message if any field is empty
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

      const data = await response.json(); // Parse the JSON response from the server

      if (!response.ok) { // If login failed, show error message from server
        loginMessage.textContent = data.message || 'Invalid login credentials.';
        loginMessage.classList.add('error');
        return;
      }

      loginMessage.textContent = data.message || 'Login successful. Redirecting...'; // Show success message on successful login
      loginMessage.classList.add('success');

      setTimeout(() => {
        window.location.href = '/dashboard'; // Redirect to dashboard after successful login
      }, 1000);
    } catch (error) { // Handle network errors
      loginMessage.textContent = 'A network error occurred. Please try again.'; // Show error message on network failure
      loginMessage.classList.add('error');
    }
  });
});