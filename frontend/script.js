document.addEventListener("DOMContentLoaded", () => {
  const spinButton = document.getElementById("spin-button");
  const balanceDisplay = document.getElementById("balance-display");
  let balance = 100;

  spinButton.addEventListener("click", () => {
    if (balance <= 0) {
      alert("Insufficient balance!");
      return;
    }

    const win = Math.random() > 0.5; // 50% chance to win
    const amount = Math.floor(Math.random() * 50) + 1;

    if (win) {
      balance += amount;
      alert(`You won $${amount}!`);
    } else {
      balance -= amount;
      alert(`You lost $${amount}!`);
    }

    balanceDisplay.textContent = `Balance: $${balance}`;
  });
});