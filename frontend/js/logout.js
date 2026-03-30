document.addEventListener('DOMContentLoaded', () => {
  const confirmLogoutButton = document.getElementById('confirm-logout-btn');
  const cancelLogoutButton = document.getElementById('cancel-logout-btn');
  const logoutMessage = document.getElementById('logoutMessage');

  if (!confirmLogoutButton || !cancelLogoutButton || !logoutMessage) {
    return;
  }

  confirmLogoutButton.addEventListener('click', async () => {
    logoutMessage.textContent = '';
    logoutMessage.className = 'message';

    try {
      const response = await fetch('/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        logoutMessage.textContent = data.message || 'Unable to log out.';
        logoutMessage.classList.add('error');
        return;
      }

      logoutMessage.textContent = data.message || 'Logged out successfully. Redirecting...';
      logoutMessage.classList.add('success');

      setTimeout(() => {
        window.location.href = '/';
      }, 900);
    } catch (error) {
      logoutMessage.textContent = 'A network error occurred. Please try again.';
      logoutMessage.classList.add('error');
    }
  });

  cancelLogoutButton.addEventListener('click', () => {
    window.location.href = '/dashboard';
  });
});