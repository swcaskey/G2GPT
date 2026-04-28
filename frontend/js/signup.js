document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  const signupMessage = document.getElementById('signupMessage');

  if (!signupForm || !signupMessage) { // Check if the elements exist before adding event listener
    return;
  }

  signupForm.addEventListener('submit', async (event) => { // Handle signup form submission
    event.preventDefault();

    // Get form values and trim email input
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    signupMessage.textContent = '';
    signupMessage.className = 'message';

    if (!email || !password || !confirmPassword) { // Basic client-side validation
      signupMessage.textContent = 'Please complete all fields.';
      signupMessage.classList.add('error'); // Show error message if any field is empty
      return;
    }

    if (password !== confirmPassword) { // Check if passwords match
      signupMessage.textContent = 'Passwords do not match.';
      signupMessage.classList.add('error'); // Show error message if passwords do not match
      return;
    }

    try {
      const response = await fetch('/signup', { // Send signup request to server
        method: 'POST',
        headers: {
          'Content-Type': 'application/json' // Set content type to JSON for the request body
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) { // If signup failed, show error message from server
        signupMessage.textContent = data.message || 'Unable to create account.';
        signupMessage.classList.add('error'); // Show error message if server returns an error response
        return;
      }
      // If signup successful, show success message and redirect to login page
      signupMessage.textContent = data.message || 'Account created successfully. Redirecting to log in...';
      signupMessage.classList.add('success');

      setTimeout(() => { // Redirect to login page after successful signup
        window.location.href = '/login';
      }, 1200);
    } catch (error) { // Handle network errors
      signupMessage.textContent = 'A network error occurred. Please try again.';
      signupMessage.classList.add('error');
    }
  });
});