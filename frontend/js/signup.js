// Sign up page JavaScript

const signupForm = document.getElementById("signupForm");

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("signupName").value.trim();
  const username = document.getElementById("signupUsername").value.trim();
  const password = document.getElementById("signupPassword").value.trim();
  const message = document.getElementById("signupMessage");

  try {
    const response = await fetch("/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, username, password })
    });

    const data = await response.json();

    message.textContent = data.message;
    message.style.color = data.success ? "green" : "red";

    if (data.success) {
      signupForm.reset();
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
    }
  } catch (error) {
    message.textContent = "Server error. Please try again.";
    message.style.color = "red";
  }
});
