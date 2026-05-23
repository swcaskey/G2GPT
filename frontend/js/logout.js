document.addEventListener('DOMContentLoaded', () => {
  const confirmLogoutButton = document.getElementById('confirm-logout-btn');
  const cancelLogoutButton = document.getElementById('cancel-logout-btn');
  const logoutMessage = document.getElementById('logoutMessage');

  if (!confirmLogoutButton || !cancelLogoutButton || !logoutMessage) { // Check if the elements exist before adding event listeners
    return;
  }

  confirmLogoutButton.addEventListener('click', async () => { // Handle logout confirmation
    logoutMessage.textContent = '';
    logoutMessage.className = 'message';

    try { // Send logout request to server
      const response = await fetch('/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json' // Set content type to JSON for the request body
        }
      });

      const data = await response.json();

      if (!response.ok) { // If logout failed, show error message from server
        logoutMessage.textContent = data.message || 'Unable to log out.'; 
        logoutMessage.classList.add('error'); // Show error message if server returns an error response
        return;
      }

      logoutMessage.textContent = data.message || 'Logged out successfully. Redirecting...';
      logoutMessage.classList.add('success'); // Show success message on successful logout

      setTimeout(() => { // Redirect to home page after successful logout
        window.location.href = '/';
      }, 900);
    } catch (error) { // Handle network errors
      logoutMessage.textContent = 'A network error occurred. Please try again.';
      logoutMessage.classList.add('error');
    }
  });

  cancelLogoutButton.addEventListener('click', () => { // Handle logout cancellation
    window.location.href = '/dashboard';
  });
});