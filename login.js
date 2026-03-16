const form = document.getElementById("loginForm");
const cancelBtn = document.getElementById("cancelBtn");
const statusMessage = document.getElementById("statusMessage");

form.addEventListener("submit", async function (event) {

    event.preventDefault();

    const uname = document.getElementById("uname").value.trim();
    const psw = document.getElementById("psw").value.trim();

    if (!uname || !psw) {
        statusMessage.textContent = "Please enter both username and password.";
        statusMessage.style.color = "red";
        return;
    }

    try {

        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                uname: uname,
                psw: psw
            })
        });

        const data = await response.json();

        statusMessage.textContent = data.message;
        statusMessage.style.color = data.success ? "green" : "red";

    }
    catch (error) {

        statusMessage.textContent = "Server error. Please try again.";
        statusMessage.style.color = "red";

    }

});

cancelBtn.addEventListener("click", function () {

    form.reset();
    statusMessage.textContent = "";

});
