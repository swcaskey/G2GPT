document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  const signupMessage = document.getElementById('signupMessage');

  if (!signupForm || !signupMessage) {
    return;
  }

  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    signupMessage.textContent = '';
    signupMessage.className = 'message';

    if (!email || !password || !confirmPassword) {
      signupMessage.textContent = 'Please complete all fields.';
      signupMessage.classList.add('error');
      return;
    }

    if (password !== confirmPassword) {
      signupMessage.textContent = 'Passwords do not match.';
      signupMessage.classList.add('error');
      return;
    }

    try {
      const response = await fetch('/signup', {
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

      if (!response.ok) {
        signupMessage.textContent = data.message || 'Unable to create account.';
        signupMessage.classList.add('error');
        return;
      }

      signupMessage.textContent = data.message || 'Account created successfully. Redirecting to log in...';
      signupMessage.classList.add('success');

      setTimeout(() => {
        window.location.href = '/login';
      }, 1200);
    } catch (error) {
      signupMessage.textContent = 'A network error occurred. Please try again.';
      signupMessage.classList.add('error');
    }
  });
});